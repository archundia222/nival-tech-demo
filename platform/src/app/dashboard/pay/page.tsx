import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { publicSiteUrl } from '@/lib/payment-profile';
import { PaymentEditor } from './payment-editor';
import { DashboardNavigation } from '../dashboard-navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { NIVAL_PAY_ADDITIONAL_PRICE_CENTS, NIVAL_PAY_ADDITIONAL_PRODUCT, NIVAL_PAY_INCLUDED_SECTIONS, NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS, NIVAL_PAY_EXTRA_SECTION_PRODUCT } from '@/lib/orders';
import { createAdditionalPaymentProfile, prepareFreeNivalPay, publishFreeNivalPay } from './actions';
import { startAdditionalNivalPayCheckout } from '@/app/checkout/actions';
import { PaymentProfileQr } from '../payment-profile-qr';
import { SmartLinkQr } from '../smart-link-qr';
import { isCompatibleMercadoPagoOrderId } from '@/lib/mercado-pago-mode';
import { getActiveBusinessMembership } from '@/lib/active-business';

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

export default async function PaySettings({ searchParams }: { searchParams: Promise<{ profile?: string; new?: string; error?: string; view?: string; unlocked?: string; result?: string; created?: string; free?: string }> }) {
  const params = await searchParams;
  const currentView = params.view === 'add' ? 'add' : params.view === 'share' ? 'share' : 'manage';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpay');
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Fpay');
  const { data: business, error } = await supabase.from('businesses')
    .select('name, logo_url, brand_color, subscription_status, product_level, nival_pay_free_enabled')
    .eq('id', membership.business_id)
    .maybeSingle();
  if (error || !business) throw new Error('No se pudo cargar el negocio.');
  await Promise.all([
    reconcileLatestPayOrder(membership.business_id, NIVAL_PAY_EXTRA_SECTION_PRODUCT, NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS),
    reconcileLatestPayOrder(membership.business_id, NIVAL_PAY_ADDITIONAL_PRODUCT, NIVAL_PAY_ADDITIONAL_PRICE_CENTS),
  ]);

  // A successful extra-section checkout should also finish in one trip.
  // If Mercado Pago has already granted a new section entitlement, create the
  // blank editable section immediately instead of making the customer press
  // “Agregar apartado” after returning from checkout.
  if (params.result === 'success' && currentView === 'manage' && params.profile) {
    const { data: returnedProfile } = await supabase.from('payment_profiles')
      .select('id, custom_sections, extra_sections_purchased')
      .eq('id', params.profile)
      .eq('business_id', membership.business_id)
      .maybeSingle();
    if (returnedProfile) {
      const savedSections = Array.isArray(returnedProfile.custom_sections) ? returnedProfile.custom_sections : [];
      const sectionLimit = NIVAL_PAY_INCLUDED_SECTIONS + Number(returnedProfile.extra_sections_purchased ?? 0);
      if (savedSections.length < sectionLimit) {
        const nextSections = [...savedSections, { id: crypto.randomUUID(), title: '', content: '', public: true }];
        const { error: sectionCreateError } = await supabase.from('payment_profiles')
          .update({ custom_sections: nextSections, updated_at: new Date().toISOString() })
          .eq('id', returnedProfile.id)
          .eq('business_id', membership.business_id);
        if (!sectionCreateError) redirect(`/dashboard/pay?view=manage&profile=${returnedProfile.id}&unlocked=1`);
        console.error('[pay] Purchased section auto-create failed', { profileId: returnedProfile.id, code: sectionCreateError.code });
      }
      // If the paid entitlement has not landed yet, do not leave the customer
      // on a success URL that still looks locked. The normal page remains safe
      // and the webhook/reconciliation can finish without creating duplicates.
      redirect(`/dashboard/pay?view=manage&profile=${returnedProfile.id}`);
    }
  }

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

  const [{ data: paidOrder }, { data: profiles, error: profileError }, { count: paidExtras }, { data: smartLinks }, { data: pointsEntitlement }] = await Promise.all([
    supabase.from('product_orders').select('id')
      .eq('business_id', membership.business_id).eq('product_code', 'nival_pay').eq('status', 'paid').limit(1).maybeSingle(),
    supabase.from('payment_profiles')
      .select('id, display_name, account_holder, bank_name, clabe, concept, payment_url, image_url, public_token, active, view_count, clabe_copy_count, last_viewed_at, holder_visible, bank_visible, clabe_visible, concept_visible, payment_url_visible, custom_sections, extra_sections_purchased')
      .eq('business_id', membership.business_id).order('created_at'),
    supabase.from('product_orders').select('id', { count: 'exact', head: true })
      .eq('business_id', membership.business_id).eq('product_code', NIVAL_PAY_ADDITIONAL_PRODUCT).eq('status', 'paid'),
    supabase.from('smart_links').select('id, name, kind, target_url, public_token, click_count, active')
      .eq('business_id', membership.business_id).order('created_at', { ascending: false }),
    supabase.from('business_product_entitlements').select('status')
      .eq('business_id', membership.business_id).eq('product_code', 'nival_points').eq('status', 'active').maybeSingle(),
  ]);
  if (profileError) throw new Error('No se pudo cargar Nival Pay.');
  const profile = profiles?.find((item) => item.id === params.profile) ?? profiles?.[0] ?? null;
  const canCreateAdditional = (profiles?.length ?? 0) < 1 + (paidExtras ?? 0);
  const hasPoints = Boolean(pointsEntitlement);
  const selectedViews = Number(profile?.view_count ?? 0);
  const selectedCopies = Number(profile?.clabe_copy_count ?? 0);
  const copyRate = selectedViews > 0 ? Math.min(100, Math.round((selectedCopies / selectedViews) * 100)) : 0;
  const lastViewedLabel = profile?.last_viewed_at
    ? new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'}).format(new Date(profile.last_viewed_at))
    : 'Sin aperturas';
  const freeEnabled = !paidOrder && Boolean(business?.nival_pay_free_enabled);
  const freeSetup = !paidOrder && Boolean(profile) && !freeEnabled;

  if (!paidOrder && !profile) return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active={currentView === 'add' ? 'agregar-tarjetas' : currentView === 'share' ? 'compartir-paginas' : 'nival-pay'} productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar payTopbar"><div><strong>Nival Pay</strong></div><span className="ready">Gratis</span></header>
      {params.error && <p role="alert" className="formMessage errorMessage">{params.error}</p>}
      <section className="dashboardHero trialHero">
        <div>
          <p className="eyebrow">NIVAL PAY GRATIS</p>
          <h1>Empieza con QR y enlace. Paga cuando quieras llevarlo más lejos.</h1>
          <p>Crea una página de cobro real con QR, enlace, tu marca y un apartado. Es gratis y no caduca.</p>
          <form action={prepareFreeNivalPay}><button className="loginLink" type="submit">Crear mi Nival Pay Gratis →</button></form>
        </div>
      </section>
      <section className="analyticsGrid" aria-label="Qué incluye la prueba">
        <article className="chartCard"><div className="chartHeading"><div><span>PLAN GRATIS</span><h2>Página + QR + enlace</h2></div></div><p>Banco, beneficiario, CLABE, logo, estadísticas básicas y 1 apartado. Sin fecha de vencimiento.</p></article>
        <article className="chartCard"><div className="chartHeading"><div><span>NIVAL PAY COMPLETO</span><h2>NFC + más herramientas</h2></div></div><p>Conservas la misma página y QR. Al activar recibes tu tarjeta NFC física, 3 apartados y herramientas completas.</p></article>
      </section>
    </div>
  </main>;

  if (!paidOrder && profile) return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active={currentView === 'share' ? 'compartir-paginas' : 'nival-pay'} productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar payTopbar">
        <div><strong>Nival Pay Gratis</strong><b>{freeEnabled ? 'QR y enlace activos' : 'Preparando tu página'}</b></div>
        <span className="ready">{freeEnabled ? 'Gratis activo' : 'Sin publicar'}</span>
      </header>
      {params.error && <p role="alert" className="formMessage errorMessage">{params.error}</p>}
      {params.free === 'started' && <p role="status" className="formMessage successMessage">Tu Nival Pay Gratis ya está publicada. Este mismo QR y enlace se conservarán si activas la versión completa.</p>}
      <section className="freemiumBanner">
        <div><span>NIVAL PAY GRATIS</span><strong>{freeEnabled ? 'Tu QR puede seguir funcionando gratis.' : 'Configura primero y publícalo cuando esté listo.'}</strong><p>Gratis incluye 1 página, QR, enlace, 1 apartado y estadísticas básicas. La versión completa agrega tarjeta NFC física, 3 apartados, enlace de pago y más herramientas.</p></div>
        <a href="/checkout">Ver Nival Pay completo · $199 →</a>
      </section>

      {currentView === 'share' && freeEnabled ? <><header className="payHeading shareHeading"><p className="eyebrow">TU QR</p><h1>Escanea, abre y cobra.</h1><p>Este QR es permanente. Si activas Nival Pay completo, no tendrás que cambiarlo.</p></header><section className="sharePagesList sharePagesRefined"><article className="sharePageItem"><h2>{profile.display_name}</h2><PaymentProfileQr businessName={business?.name ?? 'Nival Pay'} url={`${publicSiteUrl()}/pay/${profile.public_token}`} views={Number(profile.view_count)} /></article></section></> : <>
        <header className="payHeading payManageHeading"><p className="eyebrow">NIVAL PAY GRATIS</p><h1>{freeEnabled ? 'Tu punto de cobro digital ya está activo.' : 'Deja lista tu página antes de publicarla.'}</h1><p>{freeEnabled ? 'Puedes editarla cuando quieras. Tu QR y enlace siempre apuntan a la información más reciente.' : 'Configura banco, beneficiario, CLABE, logo y un apartado. Después publica el QR gratis.'}</p></header>
        <section className="payValueStrip"><div><span>APERTURAS</span><strong>{Number(profile.view_count)}</strong><small>personas abrieron esta página</small></div><div><span>CLABE COPIADA</span><strong>{Number(profile.clabe_copy_count)}</strong><small>interacciones reales</small></div><div><span>PLAN</span><strong>Gratis</strong><small>1 página · 1 apartado · QR + enlace</small></div>{freeEnabled && <a href={`${publicSiteUrl()}/pay/${profile.public_token}`} target="_blank" rel="noreferrer">Ver como cliente ↗</a>}</section>
        <section className="freemiumFeatureRail"><article><span>INCLUIDO</span><strong>QR + enlace permanente</strong><p>Comparte por WhatsApp, imprime el QR o úsalo donde cobras.</p></article><article className="locked"><span>AL ACTIVAR</span><strong>Tarjeta NFC física</strong><p>Acerca o escanea desde la misma tarjeta.</p></article><article className="locked"><span>AL ACTIVAR</span><strong>3 apartados + enlace de pago</strong><p>Más formas de organizar y facilitar el cobro.</p></article></section>
        {['owner','manager'].includes(membership.role) && <PaymentEditor key={profile.id} businessId={membership.business_id} businessName={business?.name ?? 'Mi negocio'} businessLogo={business?.logo_url ?? null} businessBrandColor={business?.brand_color ?? null} profile={profile} siteUrl={publicSiteUrl()} trialMode />}
        {freeSetup && <form action={publishFreeNivalPay} className="trialLaunchBar"><input type="hidden" name="profileId" value={profile.id}/><div><span>CUANDO YA SE VEA BIEN</span><strong>Publica tu QR gratis.</strong><small>No empieza ningún contador. El QR seguirá funcionando mientras quieras usar Nival Pay Gratis.</small></div><button type="submit">Publicar mi Nival Pay Gratis →</button></form>}
      </>}
    </div>
  </main>;

  return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active={currentView === 'add' ? 'agregar-tarjetas' : currentView === 'share' ? 'compartir-paginas' : 'nival-pay'} productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar payTopbar"><div><strong>{currentView === 'add' ? 'Agregar Nival Pay' : currentView === 'share' ? 'Compartir QR y links' : 'Páginas de cobro'}</strong></div><span className="ready">Activo</span></header>
      {params.error && <p role="alert" className="formMessage errorMessage">{params.error}</p>}
      {params.created === '1' && <p role="status" className="formMessage">¡Listo! Tu nueva Nival Pay fue creada y ya está seleccionada para que la configures.</p>}
      {params.unlocked === '1' && <p role="status" className="formMessage">Tu nuevo apartado ya está creado y listo para editar.</p>}
      {!['trial','active'].includes(business?.subscription_status ?? '') && <p role="status" className="formMessage">Tu servicio está suspendido. Puedes editar los datos, pero la página pública no estará disponible hasta reactivar el servicio.</p>}
      {currentView === 'manage' && <><header className="payHeading payManageHeading"><p className="eyebrow">NIVAL PAY</p><h1>Cobra sin volver a explicar cómo pagarte.</h1><p>Lo que guardes aquí se actualiza en tu NFC, QR y enlace sin cambiar la tarjeta física.</p></header>{profile && !hasPoints && Number(profile.view_count) > 0 && <section className="productBridge"><div><span>DESPUÉS DE COBRAR, HAZ QUE VUELVAN</span><h2>Tu Nival Pay ya está recibiendo visitas.</h2><p>Si parte de esas personas son clientes recurrentes, Nival Puntos puede convertir cada compra en una razón clara para regresar.</p></div><a href="/dashboard/points">Probar Nival Puntos gratis →</a></section>}{profile && <><section className="payValueStrip payValueStripPro"><div><span>APERTURAS</span><strong>{selectedViews}</strong><small>veces abrieron esta página</small></div><div><span>CLABE COPIADA</span><strong>{selectedCopies}</strong><small>acciones de copiar registradas</small></div><div><span>TASA DE COPIA</span><strong>{copyRate}%</strong><small>aperturas que terminaron copiando la CLABE</small></div><div><span>ÚLTIMA APERTURA</span><strong className="payLastSeen">{lastViewedLabel}</strong><small>actividad más reciente</small></div><a href={`${publicSiteUrl()}/pay/${profile.public_token}`} target="_blank" rel="noreferrer">Ver como cliente ↗</a></section><p className="payMetricNote">La tasa de copia no significa que el pago se haya completado; mide cuántas aperturas terminaron en la acción de copiar la CLABE.</p></>}<form className="cardSelector cardSelectorRefined" method="get"><label><span>Página que estás editando</span><select name="profile" defaultValue={profile?.id}>{profiles?.map(item => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label><button className="nvPrimaryButton">Abrir</button></form>{['owner','manager'].includes(membership.role) ? profile && <PaymentEditor key={profile.id} businessId={membership.business_id} businessName={business?.name ?? 'Mi negocio'} businessLogo={business?.logo_url ?? null} businessBrandColor={business?.brand_color ?? null} profile={profile} siteUrl={publicSiteUrl()} /> : <p>Solo el propietario o un administrador puede configurar Nival Pay.</p>}</>}
      {currentView === 'add' && <><header className="payHeading"><p className="eyebrow">OTRO PUNTO DE COBRO</p><h1>Una Nival Pay para cada lugar donde cobras.</h1><p>Úsala para otra caja, sucursal, empleado, evento o cuenta bancaria sin mezclar la información.</p></header><section className="nivalPayCatalog">{profiles?.map((item,index) => <article className="nivalPayCatalogCard" key={item.id}><a className="nivalCardDirectLink" href={`/dashboard/pay?view=manage&profile=${item.id}`} aria-label={`Abrir ${item.display_name} en Tus tarjetas`}><div className="nivalPhysicalCard"><div className="nivalCardMark">N</div><div className="nivalCardCopy"><strong>NIVAL</strong><span>PAY {index+1}</span></div><small>NFC · PÁGINA DE COBRO</small></div></a><h2>{item.display_name}</h2><a href={`/dashboard/pay?view=manage&profile=${item.id}`}>Editar tarjeta</a></article>)}<article className="nivalAddProduct"><form action={canCreateAdditional ? createAdditionalPaymentProfile : startAdditionalNivalPayCheckout}><button className="nivalAddIcon" aria-label={canCreateAdditional ? 'Crear Nival Pay disponible' : 'Comprar y crear otra Nival Pay'}>+</button></form><div><h2>Agregar Nival Pay</h2><p>Otra página de cobro independiente</p><strong>$49 MXN</strong></div><div className="nivalAddDivider"/><div><p>Tarjeta NFC física adicional</p><strong>$99 MXN</strong><a className="nivalProductAction secondary" href="/dashboard/pay/physical">Comprar tarjeta física</a></div></article></section></>}
      {currentView === 'share' && <><header className="payHeading shareHeading"><p className="eyebrow">COMPARTE Y COBRA</p><h1>Haz que pagarte sea fácil de encontrar.</h1><p>WhatsApp para clientes a distancia, QR para mostrador y NFC para cobrar en persona. Todo abre la misma información actualizada.</p></header><div className="shareValueStrip"><span>WhatsApp y redes</span><span>Mostrador e impresos</span><span>Tarjeta NFC</span></div><section className="sharePagesList sharePagesRefined">{profiles?.map(item => <article className="sharePageItem" key={item.id}><h2>{item.display_name}</h2><PaymentProfileQr businessName={`${business?.name ?? 'Nival Pay'}-${item.display_name}`} url={`${publicSiteUrl()}/pay/${item.public_token}`} views={Number(item.view_count)} /></article>)}{smartLinks?.map(link => <SmartLinkQr key={link.id} id={link.id} name={link.name} kind={link.kind} targetUrl={link.target_url} url={`${publicSiteUrl()}/go/${link.public_token}`} clicks={Number(link.click_count)} active={link.active} editable={false} />)}</section></>}
    </div>
  </main>;
}
