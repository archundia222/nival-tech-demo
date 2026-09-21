import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { publicSiteUrl } from '@/lib/payment-profile';
import { PaymentEditor } from './payment-editor';
import { DashboardNavigation } from '../dashboard-navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { NIVAL_PAY_ADDITIONAL_PRICE_CENTS, NIVAL_PAY_ADDITIONAL_PRODUCT, NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS, NIVAL_PAY_EXTRA_SECTION_PRODUCT } from '@/lib/orders';
import { createAdditionalPaymentProfile } from './actions';
import { startAdditionalNivalPayCheckout } from '@/app/checkout/actions';
import { PaymentProfileQr } from '../payment-profile-qr';
import { SmartLinkQr } from '../smart-link-qr';
import { isCompatibleMercadoPagoOrderId } from '@/lib/mercado-pago-mode';

type MercadoPagoOrder = {
  id?: string;
  external_reference?: string;
  currency_id?: string;
  status?: string;
  status_detail?: string;
  total_amount?: string | number;
  total_paid_amount?: string | number;
  transactions?: { payments?: Array<{ id?: string; status?: string; status_detail?: string }> };
};

async function reconcileLatestPayOrder(businessId: string, productCode: typeof NIVAL_PAY_EXTRA_SECTION_PRODUCT | typeof NIVAL_PAY_ADDITIONAL_PRODUCT, expectedAmountCents: number) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) return;

  const admin = createAdminClient();
  const { data: pendingOrders } = await admin.from('product_orders')
    .select('id, amount_cents, currency, status, provider_preference_id, provider_payment_id')
    .eq('business_id', businessId)
    .eq('product_code', productCode)
    .eq('payment_method', 'mercado_pago')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);
  const order = pendingOrders?.find((candidate) =>
    candidate.provider_preference_id
      && isCompatibleMercadoPagoOrderId(candidate.provider_preference_id, accessToken)
  );
  if (!order?.provider_preference_id) return;

  const response = await fetch(
    `https://api.mercadopago.com/v1/orders/${encodeURIComponent(order.provider_preference_id)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' },
  );
  if (!response.ok) {
    console.warn('Extra section reconciliation request failed', {
      providerOrderId: order.provider_preference_id,
      httpStatus: response.status,
    });
    return;
  }

  const payload = await response.json() as MercadoPagoOrder;
  const payment = payload.transactions?.payments?.find((candidate) =>
    candidate.status === 'processed' && candidate.status_detail === 'accredited'
  );
  const paymentId = payment?.id ? String(payment.id) : null;
  const checks = {
    orderId: payload.id === order.provider_preference_id,
    externalReference: payload.external_reference === order.id,
    orderStatus: payload.status === 'processed',
    orderStatusDetail: payload.status_detail === 'accredited',
    currency: !payload.currency_id || payload.currency_id === order.currency,
    totalAmount: Math.round(Number(payload.total_amount) * 100) === order.amount_cents,
    totalPaidAmount: Math.round(Number(payload.total_paid_amount) * 100) === order.amount_cents,
    catalogAmount: order.amount_cents === expectedAmountCents,
    paymentId: Boolean(paymentId),
    storedPaymentId: !order.provider_payment_id || order.provider_payment_id === paymentId,
  };
  const approved = Object.values(checks).every(Boolean);
  if (!approved || !paymentId) {
    console.warn('Extra section reconciliation verification failed', {
      orderId: order.id,
      failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
      providerStatus: payload.status ?? null,
      providerStatusDetail: payload.status_detail ?? null,
    });
    return;
  }

  const { error } = await admin.rpc('finalize_nival_pay_order', {
    p_order_id: order.id,
    p_provider_payment_id: paymentId,
  });
  if (error) console.error('Extra section reconciliation failed', { orderId: order.id, code: error.code });
}

export default async function PaySettings({ searchParams }: { searchParams: Promise<{ profile?: string; new?: string; error?: string; view?: string; unlocked?: string; result?: string; created?: string }> }) {
  const params = await searchParams;
  const currentView = params.view === 'add' ? 'add' : params.view === 'share' ? 'share' : 'manage';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpay');
  const { data: membership, error } = await supabase.from('business_members')
    .select('business_id, role, businesses(name, logo_url, subscription_status, product_level)').eq('user_id', user.id)
    .order('created_at').limit(1).maybeSingle();
  if (error) throw new Error('No se pudo cargar el negocio.');
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Fpay');
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  await Promise.all([
    reconcileLatestPayOrder(membership.business_id, NIVAL_PAY_EXTRA_SECTION_PRODUCT, NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS),
    reconcileLatestPayOrder(membership.business_id, NIVAL_PAY_ADDITIONAL_PRODUCT, NIVAL_PAY_ADDITIONAL_PRICE_CENTS),
  ]);

  // A successful additional-card checkout should finish the job in one trip.
  // Create the purchased profile immediately instead of asking the customer to
  // press the plus button a second time.
  if (params.result === 'success' && currentView === 'add') {
    const [{ data: purchasedProfiles }, { count: purchasedExtras }] = await Promise.all([
      supabase.from('payment_profiles')
        .select('id, account_holder, bank_name, clabe')
        .eq('business_id', membership.business_id)
        .order('created_at'),
      supabase.from('product_orders')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', membership.business_id)
        .eq('product_code', NIVAL_PAY_ADDITIONAL_PRODUCT)
        .eq('status', 'paid'),
    ]);
    const currentProfiles = purchasedProfiles ?? [];
    const sourceProfile = currentProfiles[0];
    if (sourceProfile && currentProfiles.length < 1 + (purchasedExtras ?? 0)) {
      const { data: createdProfile, error: createError } = await supabase.from('payment_profiles').insert({
        business_id: membership.business_id,
        display_name: 'Nival Pay',
        account_holder: sourceProfile.account_holder,
        bank_name: sourceProfile.bank_name,
        clabe: sourceProfile.clabe,
        active: true,
      }).select('id').single();
      if (createError) {
        console.error('[pay] Purchased Nival Pay profile creation failed', {
          businessId: membership.business_id,
          code: createError.code,
          message: createError.message,
        });
      } else if (createdProfile) {
        redirect(`/dashboard/pay?view=manage&profile=${createdProfile.id}&created=1`);
      }
    }
  }

  const [{ data: paidOrder }, { data: profiles, error: profileError }, { count: paidExtras }, { data: smartLinks }] = await Promise.all([
    supabase.from('product_orders').select('id')
      .eq('business_id', membership.business_id).eq('product_code', 'nival_pay').eq('status', 'paid').limit(1).maybeSingle(),
    supabase.from('payment_profiles')
      .select('id, display_name, account_holder, bank_name, clabe, concept, payment_url, image_url, public_token, active, view_count, clabe_copy_count, holder_visible, bank_visible, clabe_visible, concept_visible, payment_url_visible, custom_sections, extra_sections_purchased')
      .eq('business_id', membership.business_id).order('created_at'),
    supabase.from('product_orders').select('id', { count: 'exact', head: true })
      .eq('business_id', membership.business_id).eq('product_code', NIVAL_PAY_ADDITIONAL_PRODUCT).eq('status', 'paid'),
    supabase.from('smart_links').select('id, name, kind, target_url, public_token, click_count, active')
      .eq('business_id', membership.business_id).order('created_at', { ascending: false }),
  ]);
  if (profileError) throw new Error('No se pudo cargar Nival Pay.');
  const profile = profiles?.find((item) => item.id === params.profile) ?? profiles?.[0] ?? null;
  const canCreateAdditional = (profiles?.length ?? 0) < 1 + (paidExtras ?? 0);
  if (!paidOrder) return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active={currentView === 'add' ? 'agregar-tarjetas' : currentView === 'share' ? 'compartir-paginas' : 'nival-pay'} productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar payTopbar"><div><strong>Nival Pay</strong></div><span className="ready">Sin activar</span></header>
      <section className="dashboardHero">
        <div>
          <p className="eyebrow">NIVAL PAY</p>
          <h1>Convierte tu tarjeta NFC en una página de cobro.</h1>
          <p>Recibe transferencias con tarjeta NFC, enlace y QR propios. Incluye 3 apartados. Los adicionales cuestan $49 MXN cada uno.</p>
          <a className="loginLink" href="/checkout">Activar Nival Pay · $199 MXN</a>
        </div>
      </section>
      <section className="analyticsGrid" aria-label="Qué incluye Nival Pay">
        <article className="chartCard"><div className="chartHeading"><div><span>PÁGINA DE COBRO</span><h2>Lista para compartir</h2></div></div><p>Tu cliente abre una página simple con los datos necesarios para pagarte.</p></article>
        <article className="chartCard"><div className="chartHeading"><div><span>NFC + QR</span><h2>Un mismo destino</h2></div></div><p>Comparte el mismo enlace desde tu tarjeta NFC o mediante código QR.</p></article>
      </section>
    </div>
  </main>;

  return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active={currentView === 'add' ? 'agregar-tarjetas' : currentView === 'share' ? 'compartir-paginas' : 'nival-pay'} productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar payTopbar"><div><strong>{currentView === 'add' ? 'Agregar tarjetas' : currentView === 'share' ? 'Comparte tus páginas' : 'Tus tarjetas'}</strong></div><span className="ready">Activo</span></header>
      {params.error && <p role="alert" className="formMessage errorMessage">{params.error}</p>}
      {params.created === '1' && <p role="status" className="formMessage">¡Listo! Tu nueva Nival Pay fue creada y ya está seleccionada para que la configures.</p>}
      {params.unlocked === '1' && <p role="status" className="formMessage">Tu apartado comprado ya está disponible. Presiona “Agregar apartado” para crearlo y editarlo.</p>}
      {!['trial','active'].includes(business?.subscription_status ?? '') && <p role="status" className="formMessage">Tu servicio está suspendido. Puedes editar los datos, pero la página pública no estará disponible hasta reactivar el servicio.</p>}
      {currentView === 'manage' && <><header className="payHeading payManageHeading"><p className="eyebrow">NIVAL PAY</p><h1>Tu página de cobro.</h1><p>Edita una sola vez lo que verán tus clientes desde la tarjeta NFC, el enlace y el QR.</p></header><form className="cardSelector cardSelectorRefined" method="get"><label><span>Nival Pay seleccionada</span><select name="profile" defaultValue={profile?.id}>{profiles?.map(item => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label><button className="nvPrimaryButton">Abrir</button></form>{['owner','manager'].includes(membership.role) ? profile && <PaymentEditor key={profile.id} businessId={membership.business_id} businessName={business?.name ?? 'Mi negocio'} businessLogo={business?.logo_url ?? null} profile={profile} siteUrl={publicSiteUrl()} /> : <p>Solo el propietario o un administrador puede configurar Nival Pay.</p>}</>}
      {currentView === 'add' && <><header className="payHeading"><p className="eyebrow">MÁS PUNTOS DE COBRO</p><h1>Agrega otro Nival Pay.</h1><p>Crea una página de cobro independiente para otra caja, sucursal, empleado o unidad de negocio.</p></header><section className="nivalPayCatalog">{profiles?.map((item,index) => <article className="nivalPayCatalogCard" key={item.id}><a className="nivalCardDirectLink" href={`/dashboard/pay?view=manage&profile=${item.id}`} aria-label={`Abrir ${item.display_name} en Tus tarjetas`}><div className="nivalPhysicalCard"><div className="nivalCardMark">N</div><div className="nivalCardCopy"><strong>NIVAL</strong><span>PAY {index+1}</span></div><small>NFC · PÁGINA DE COBRO</small></div></a><h2>{item.display_name}</h2><a href={`/dashboard/pay?view=manage&profile=${item.id}`}>Editar tarjeta</a></article>)}<article className="nivalAddProduct"><form action={canCreateAdditional ? createAdditionalPaymentProfile : startAdditionalNivalPayCheckout}><button className="nivalAddIcon" aria-label={canCreateAdditional ? 'Crear Nival Pay disponible' : 'Comprar y crear otra Nival Pay'}>+</button></form><div><h2>Agregar Nival Pay</h2><p>Otra página de cobro independiente</p><strong>$49 MXN</strong></div><div className="nivalAddDivider"/><div><p>Tarjeta NFC física adicional</p><strong>$99 MXN</strong><a className="nivalProductAction secondary" href="/dashboard/pay/physical">Comprar tarjeta física</a></div></article></section></>}
      {currentView === 'share' && <><header className="payHeading shareHeading"><p className="eyebrow">COMPARTE Y COBRA</p><h1>Tu Nival Pay, listo para compartir.</h1><p>Envía el enlace por WhatsApp, coloca el QR en mostrador o úsalo en tu tarjeta NFC. Todo lleva a la misma página de cobro.</p></header><div className="shareValueStrip"><span>WhatsApp y redes</span><span>Mostrador e impresos</span><span>Tarjeta NFC</span></div><section className="sharePagesList sharePagesRefined">{profiles?.map(item => <article className="sharePageItem" key={item.id}><h2>{item.display_name}</h2><PaymentProfileQr businessName={`${business?.name ?? 'Nival Pay'}-${item.display_name}`} url={`${publicSiteUrl()}/pay/${item.public_token}`} views={Number(item.view_count)} /></article>)}{smartLinks?.map(link => <SmartLinkQr key={link.id} id={link.id} name={link.name} kind={link.kind} targetUrl={link.target_url} url={`${publicSiteUrl()}/go/${link.public_token}`} clicks={Number(link.click_count)} active={link.active} editable={false} />)}</section></>}
    </div>
  </main>;
}
