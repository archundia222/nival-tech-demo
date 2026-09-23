import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { publicSiteUrl } from '@/lib/payment-profile';
import { PaymentEditor } from './payment-editor';
import { DashboardNavigation } from '../dashboard-navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { NIVAL_PAY_ADDITIONAL_PRICE_CENTS, NIVAL_PAY_ADDITIONAL_PRODUCT, NIVAL_PAY_INCLUDED_SECTIONS, NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS, NIVAL_PAY_EXTRA_SECTION_PRODUCT } from '@/lib/orders';
import { createAdditionalPaymentProfile, prepareNivalPayTrial, startNivalPayTrial } from './actions';
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
    .select('business_id, role, businesses(name, logo_url, brand_color, subscription_status, product_level, nival_pay_trial_started_at, nival_pay_trial_ends_at, nival_pay_trial_used)').eq('user_id', user.id)
    .order('created_at').limit(1).maybeSingle();
  if (error) throw new Error('No se pudo cargar el negocio.');
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Fpay');
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
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
      .select('id, display_name, account_holder, bank_name, clabe, concept, payment_url, image_url, public_token, active, view_count, clabe_copy_count, holder_visible, bank_visible, clabe_visible, concept_visible, payment_url_visible, custom_sections, extra_sections_purchased')
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
  const trialEndsAt = business?.nival_pay_trial_ends_at ? new Date(business.nival_pay_trial_ends_at) : null;
  const trialActive = !paidOrder && Boolean(trialEndsAt && trialEndsAt.getTime() > Date.now());
  const trialExpired = !paidOrder && Boolean(business?.nival_pay_trial_used && (!trialEndsAt || trialEndsAt.getTime() <= Date.now()));
  const trialDaysLeft = trialActive && trialEndsAt ? Math.max(1, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000)) : 0;
  const trialSetup = !paidOrder && Boolean(profile) && !trialActive && !trialExpired;

  if (!paidOrder && !profile) return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active={currentView === 'add' ? 'agregar-tarjetas' : currentView === 'share' ? 'compartir-paginas' : 'nival-pay'} productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar payTopbar"><div><strong>Nival Pay</strong></div><span className="ready">Pruébalo gratis</span></header>
      <section className="dashboardHero trialHero">
        <div>
          <p className="eyebrow">NIVAL PAY DIGITAL · 7 DÍAS</p>
          <h1>Prueba cómo se siente cobrar con Nival antes de comprar.</h1>
          <p>Prepara tu página, publica tu QR y úsala con clientes reales durante 7 días. La prueba empieza cuando tú decidas publicar el QR.</p>
          <form action={prepareNivalPayTrial}><button className="loginLink" type="submit">Preparar mi prueba gratis →</button></form>
        </div>
      </section>
      <section className="analyticsGrid" aria-label="Qué incluye la prueba">
        <article className="chartCard"><div className="chartHeading"><div><span>PRUEBA DIGITAL</span><h2>Página + QR + enlace</h2></div></div><p>Configura banco, beneficiario, CLABE, logo y un apartado. Sin tarjeta física todavía.</p></article>
        <article className="chartCard"><div className="chartHeading"><div><span>SI TE SIRVE</span><h2>Activa la versión completa</h2></div></div><p>Conservas la misma página y QR. Al activar recibes tu tarjeta NFC física y desbloqueas las herramientas completas.</p></article>
      </section>
    </div>
  </main>;

  if (!paidOrder && profile) return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active={currentView === 'share' ? 'compartir-paginas' : 'nival-pay'} productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar payTopbar">
        <div><strong>Nival Pay Digital</strong><b>{trialActive ? `Prueba activa · ${trialDaysLeft} ${trialDaysLeft === 1 ? 'día' : 'días'} restantes` : trialExpired ? 'Prueba terminada' : 'Preparando tu prueba'}</b></div>
        <span className={trialActive ? 'ready' : trialExpired ? 'statusPending' : 'ready'}>{trialActive ? 'En prueba' : trialExpired ? 'Activa Nival Pay' : 'Sin publicar'}</span>
      </header>
      {params.error && <p role="alert" className="formMessage errorMessage">{params.error}</p>}
      {params.trial === 'started' && <p role="status" className="formMessage successMessage">Tu prueba ya está activa. Este mismo QR y enlace se conservarán si activas Nival Pay.</p>}
      {trialExpired && <section className="trialUpgradeCard"><div><span>TU PRUEBA TERMINÓ</span><h1>Tu QR ya demostró cómo funciona Nival Pay.</h1><p>Conserva la misma página y el mismo QR, recibe tu tarjeta NFC física y desbloquea 3 apartados y las herramientas completas.</p><div className="trialUsage"><b>{Number(profile.view_count)}</b><small>aperturas</small><b>{Number(profile.clabe_copy_count)}</b><small>copias de CLABE</small></div></div><a href="/checkout">Activar Nival Pay →</a></section>}
      {trialActive && <section className="trialStatusCard"><div><span>PRUEBA EN CURSO</span><h1>Ya puedes usar este QR con clientes reales.</h1><p>Durante la prueba tienes página, enlace, QR, estadísticas básicas y 1 apartado. La tarjeta NFC física llega al activar Nival Pay.</p></div><a href="/checkout">Quiero la versión completa →</a></section>}
      {trialSetup && <section className="trialStatusCard setup"><div><span>ANTES DE EMPEZAR LOS 7 DÍAS</span><h1>Configura primero. Publica cuando estés listo.</h1><p>El contador no empieza por crear tu cuenta. Empieza cuando pulses “Publicar QR e iniciar prueba”.</p></div></section>}

      {currentView === 'share' && trialActive ? <><header className="payHeading shareHeading"><p className="eyebrow">TU QR DE PRUEBA</p><h1>Escanea, abre y cobra.</h1><p>Este QR apunta a tu misma página Nival Pay. Si activas el producto, no tendrás que cambiarlo.</p></header><section className="sharePagesList sharePagesRefined"><article className="sharePageItem"><h2>{profile.display_name}</h2><PaymentProfileQr businessName={business?.name ?? 'Nival Pay'} url={`${publicSiteUrl()}/pay/${profile.public_token}`} views={Number(profile.view_count)} /></article></section></> : <>
        <header className="payHeading payManageHeading"><p className="eyebrow">{trialExpired ? 'TU PRUEBA' : 'NIVAL PAY DIGITAL'}</p><h1>{trialExpired ? 'Tu configuración sigue aquí.' : 'Deja lista tu página antes de publicarla.'}</h1><p>{trialExpired ? 'No pierdes tus datos. Activa Nival Pay para volver a hacer pública esta página.' : 'Configura banco, beneficiario, CLABE, logo y un apartado. Cuando estés listo, inicia tus 7 días.'}</p></header>
        <section className="payValueStrip"><div><span>APERTURAS</span><strong>{Number(profile.view_count)}</strong><small>personas abrieron esta página</small></div><div><span>CLABE COPIADA</span><strong>{Number(profile.clabe_copy_count)}</strong><small>interacciones reales</small></div><div><span>PLAN</span><strong>{trialActive ? 'Prueba' : trialExpired ? 'Terminada' : 'Preparación'}</strong><small>{trialActive ? `${trialDaysLeft} días restantes` : trialExpired ? 'activa para continuar' : 'el contador aún no corre'}</small></div>{trialActive && <a href={`${publicSiteUrl()}/pay/${profile.public_token}`} target="_blank" rel="noreferrer">Ver como cliente ↗</a>}</section>
        {['owner','manager'].includes(membership.role) && <PaymentEditor key={profile.id} businessId={membership.business_id} businessName={business?.name ?? 'Mi negocio'} businessLogo={business?.logo_url ?? null} businessBrandColor={business?.brand_color ?? null} profile={profile} siteUrl={publicSiteUrl()} trialMode />}
        {!trialActive && !trialExpired && <form action={startNivalPayTrial} className="trialLaunchBar"><input type="hidden" name="profileId" value={profile.id}/><div><span>CUANDO YA SE VEA BIEN</span><strong>Publica tu QR y empieza los 7 días.</strong><small>El mismo enlace y QR se conservan si después activas Nival Pay.</small></div><button type="submit">Publicar QR e iniciar prueba →</button></form>}
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
      {currentView === 'manage' && <><header className="payHeading payManageHeading"><p className="eyebrow">NIVAL PAY</p><h1>Cobra sin volver a explicar cómo pagarte.</h1><p>Lo que guardes aquí se actualiza en tu NFC, QR y enlace sin cambiar la tarjeta física.</p></header>{profile && !hasPoints && Number(profile.view_count) > 0 && <section className="productBridge"><div><span>DESPUÉS DE COBRAR, HAZ QUE VUELVAN</span><h2>Tu Nival Pay ya está recibiendo visitas.</h2><p>Si parte de esas personas son clientes recurrentes, Nival Puntos puede convertir cada compra en una razón clara para regresar.</p></div><a href="/dashboard/points">Conocer Nival Puntos · $199/mes →</a></section>}{profile && <section className="payValueStrip"><div><span>APERTURAS</span><strong>{Number(profile.view_count)}</strong><small>veces abrieron esta página</small></div><div><span>CLABE COPIADA</span><strong>{Number(profile.clabe_copy_count)}</strong><small>intentos de pago facilitados</small></div><div><span>ESTADO</span><strong>{profile.active ? 'Visible' : 'Oculta'}</strong><small>{profile.active ? 'lista para tus clientes' : 'no disponible públicamente'}</small></div><a href={`${publicSiteUrl()}/pay/${profile.public_token}`} target="_blank" rel="noreferrer">Ver como cliente ↗</a></section>}<form className="cardSelector cardSelectorRefined" method="get"><label><span>Página que estás editando</span><select name="profile" defaultValue={profile?.id}>{profiles?.map(item => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label><button className="nvPrimaryButton">Abrir</button></form>{['owner','manager'].includes(membership.role) ? profile && <PaymentEditor key={profile.id} businessId={membership.business_id} businessName={business?.name ?? 'Mi negocio'} businessLogo={business?.logo_url ?? null} businessBrandColor={business?.brand_color ?? null} profile={profile} siteUrl={publicSiteUrl()} /> : <p>Solo el propietario o un administrador puede configurar Nival Pay.</p>}</>}
      {currentView === 'add' && <><header className="payHeading"><p className="eyebrow">OTRO PUNTO DE COBRO</p><h1>Una Nival Pay para cada lugar donde cobras.</h1><p>Úsala para otra caja, sucursal, empleado, evento o cuenta bancaria sin mezclar la información.</p></header><section className="nivalPayCatalog">{profiles?.map((item,index) => <article className="nivalPayCatalogCard" key={item.id}><a className="nivalCardDirectLink" href={`/dashboard/pay?view=manage&profile=${item.id}`} aria-label={`Abrir ${item.display_name} en Tus tarjetas`}><div className="nivalPhysicalCard"><div className="nivalCardMark">N</div><div className="nivalCardCopy"><strong>NIVAL</strong><span>PAY {index+1}</span></div><small>NFC · PÁGINA DE COBRO</small></div></a><h2>{item.display_name}</h2><a href={`/dashboard/pay?view=manage&profile=${item.id}`}>Editar tarjeta</a></article>)}<article className="nivalAddProduct"><form action={canCreateAdditional ? createAdditionalPaymentProfile : startAdditionalNivalPayCheckout}><button className="nivalAddIcon" aria-label={canCreateAdditional ? 'Crear Nival Pay disponible' : 'Comprar y crear otra Nival Pay'}>+</button></form><div><h2>Agregar Nival Pay</h2><p>Otra página de cobro independiente</p><strong>$49 MXN</strong></div><div className="nivalAddDivider"/><div><p>Tarjeta NFC física adicional</p><strong>$99 MXN</strong><a className="nivalProductAction secondary" href="/dashboard/pay/physical">Comprar tarjeta física</a></div></article></section></>}
      {currentView === 'share' && <><header className="payHeading shareHeading"><p className="eyebrow">COMPARTE Y COBRA</p><h1>Haz que pagarte sea fácil de encontrar.</h1><p>WhatsApp para clientes a distancia, QR para mostrador y NFC para cobrar en persona. Todo abre la misma información actualizada.</p></header><div className="shareValueStrip"><span>WhatsApp y redes</span><span>Mostrador e impresos</span><span>Tarjeta NFC</span></div><section className="sharePagesList sharePagesRefined">{profiles?.map(item => <article className="sharePageItem" key={item.id}><h2>{item.display_name}</h2><PaymentProfileQr businessName={`${business?.name ?? 'Nival Pay'}-${item.display_name}`} url={`${publicSiteUrl()}/pay/${item.public_token}`} views={Number(item.view_count)} /></article>)}{smartLinks?.map(link => <SmartLinkQr key={link.id} id={link.id} name={link.name} kind={link.kind} targetUrl={link.target_url} url={`${publicSiteUrl()}/go/${link.public_token}`} clicks={Number(link.click_count)} active={link.active} editable={false} />)}</section></>}
    </div>
  </main>;
}
