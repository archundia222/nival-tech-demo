import { redirect } from 'next/navigation';
import { FreePaySubmitButton } from "./free-pay-submit-button";
import { createClient } from '@/lib/supabase/server';
import { publicSiteUrl } from '@/lib/payment-profile';
import { PaymentEditor } from './payment-editor';
import { DashboardNavigation } from '../dashboard-navigation';
import { NIVAL_PAY_ADDITIONAL_PRICE_CENTS, NIVAL_PAY_ADDITIONAL_PRODUCT, NIVAL_PAY_INCLUDED_SECTIONS, NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS, NIVAL_PAY_EXTRA_SECTION_PRODUCT } from '@/lib/orders';
import { createAdditionalPaymentProfile, prepareFreeNivalPay, publishFreeNivalPay } from './actions';
import { startAdditionalNivalPayCheckout, requestAdditionalNivalPayCashPayment } from '@/app/checkout/actions';
import { PaymentProfileQr } from '../payment-profile-qr';
import { SmartLinkQr } from '../smart-link-qr';
import { cancelLatestTerminalMercadoPagoProductOrder, reconcileLatestMercadoPagoProductOrder } from '@/lib/reconcile-mercado-pago-order';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { CheckoutSubmitButton } from '@/app/checkout/submit-button';
import { PaymentStatusPoller } from '@/app/checkout/payment-status-poller';

export default async function PaySettings({ searchParams }: { searchParams: Promise<{ profile?: string; new?: string; error?: string; view?: string; unlocked?: string; result?: string; created?: string; cash?: string; free?: string }> }) {
  const params = await searchParams;
  const currentView = params.view === 'add' ? 'add' : params.view === 'share' ? 'share' : 'manage';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpay');
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Fpay');
  if (membership.role === 'staff') redirect('/dashboard/points?view=visits');
  const { data: business, error } = await supabase.from('businesses')
    .select('name, logo_url, brand_color, subscription_status, product_level, nival_pay_free_enabled,nival_pay_trial_started_at')
    .eq('id', membership.business_id)
    .maybeSingle();
  if (error || !business) throw new Error('No se pudo cargar el negocio.');
  await reconcileLatestMercadoPagoProductOrder(membership.business_id, {
    [NIVAL_PAY_EXTRA_SECTION_PRODUCT]: NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS,
    [NIVAL_PAY_ADDITIONAL_PRODUCT]: NIVAL_PAY_ADDITIONAL_PRICE_CENTS,
  });
  if (params.result === 'failure') {
    await cancelLatestTerminalMercadoPagoProductOrder(membership.business_id, {
      [NIVAL_PAY_EXTRA_SECTION_PRODUCT]: NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS,
      [NIVAL_PAY_ADDITIONAL_PRODUCT]: NIVAL_PAY_ADDITIONAL_PRICE_CENTS,
    });
  }

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

  // Finish a paid additional Nival Pay through the same idempotent
  // order-linked path used by the manual fallback.
  if (params.result === 'success' && currentView === 'add') {
    await createAdditionalPaymentProfile();
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
      .eq('business_id', membership.business_id).eq('product_code', 'nival_points').in('status', ['active','free']).maybeSingle(),
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
  // eslint-disable-next-line react-hooks/purity -- A server request checks access against its current timestamp.
  const trialExpired = freeEnabled && (!business?.nival_pay_trial_started_at || Date.now() - new Date(business.nival_pay_trial_started_at).getTime() >= 15 * 86400000);

  if (!paidOrder && !profile) return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active={currentView === 'add' ? 'agregar-tarjetas' : currentView === 'share' ? 'compartir-paginas' : 'nival-pay'} productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar payTopbar"><div><strong>Nival Pay</strong></div><span className="ready">Gratis</span></header>
      {params.error && <p role="alert" className="formMessage errorMessage">{params.error}</p>}
      <section className="dashboardHero trialHero">
        <div>
          <p className="eyebrow">NIVAL PAY · PRUEBA</p>
          <h1>Prueba tu QR y enlace durante 15 días.</h1>
          <p>Crea una página de cobro real con QR, enlace, tu marca y un apartado. Puedes usarla 15 días desde que activas el QR; después requiere Pro.</p>
          <form action={prepareFreeNivalPay}><FreePaySubmitButton /></form>
        </div>
      </section>
      <section className="analyticsGrid" aria-label="Qué incluye la prueba">
        <article className="chartCard"><div className="chartHeading"><div><span>PRUEBA 15 DÍAS</span><h2>Página + QR + enlace</h2></div></div><p>Banco, beneficiario, CLABE, logo, estadísticas básicas y 1 apartado. Prueba de 15 días desde la activación.</p></article>
        <article className="chartCard"><div className="chartHeading"><div><span>NIVAL PAY COMPLETO</span><h2>NFC + más herramientas</h2></div></div><p>Conservas la misma página y QR. Al activar recibes una tarjeta física con NFC —tu cliente acerca el celular y abre tu cobro— más puntos de cobro ilimitados.</p></article>
      </section>
    </div>
  </main>;

  if (!paidOrder && profile) return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active={currentView === 'add' ? 'agregar-tarjetas' : currentView === 'share' ? 'compartir-paginas' : 'nival-pay'} productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar payTopbar">
        <div><strong>Prueba Nival Pay</strong><b>{trialExpired ? 'Acceso suspendido hasta comprar Pro' : freeEnabled ? 'QR y enlace en prueba' : 'Preparando tu página'}</b></div>
        <span className="ready">{trialExpired ? 'Prueba terminada' : freeEnabled ? 'Prueba activa' : 'Sin publicar'}</span>
      </header>
      {params.error && <p role="alert" className="formMessage errorMessage">{params.error}</p>}
      {params.free === 'started' && <p role="status" className="formMessage successMessage">Tu Prueba Nival Pay ya está publicada. Este mismo QR y enlace se conservarán si activas la versión completa.</p>}
      <section className="payHowItWorks"><h2>Cómo se usa Nival Pay</h2><div><article><strong>En tu negocio</strong><p>Configuras beneficiario, banco y CLABE. El mesero muestra el QR o comparte el enlace cuando llega la cuenta; puedes editar los datos sin cambiar el acceso.</p></article><article><strong>Para quien paga</strong><p>Escanea el QR, confirma el beneficiario, copia la CLABE, abre su banco y realiza la transferencia. Después muestra el comprobante al personal para verificar el pago.</p></article></div></section>
      <section className="freemiumBanner">
        <div><span>NIVAL PAY · PRUEBA</span><strong>{trialExpired ? 'Tu prueba terminó. Compra Pro para reactivar este mismo QR y enlace.' : freeEnabled ? 'Tu QR está disponible durante 15 días desde la activación.' : 'Configura primero y activa tu prueba cuando esté listo.'}</strong><p>La prueba incluye QR, enlace y edición de datos durante 15 días. Al terminar, el acceso requiere Pro, que incluye tarjeta NFC física.</p></div>
        <a href="/checkout">Activar Nival Pay Pro · $199 →</a>
      </section>

      {currentView === 'add' ? <section className="reviewsIntro"><p className="eyebrow">TUS TARJETAS PAY</p><h1>Tu primera Nival Pay</h1><p>Prueba esta tarjeta durante 15 días. Cuando compres Pro, podrás agregar páginas Pay independientes por $99 cada una.</p><a className="nvPrimaryLink" href="/dashboard/pay">Editar mi tarjeta Pay →</a></section> : currentView === 'share' && freeEnabled ? <><header className="payHeading shareHeading"><p className="eyebrow">COMPARTIR NIVAL PAY</p><h1>Un enlace para cobrar.</h1><p>Copia el enlace, compártelo o descarga el QR. Al editar tus datos, el mismo QR abre la información actualizada.</p></header><section className="sharePagesList sharePagesRefined"><article className="sharePageItem"><h2>{profile.display_name}</h2><PaymentProfileQr businessName={business?.name ?? 'Nival Pay'} url={`${publicSiteUrl()}/pay/${profile.public_token}`} views={Number(profile.view_count)} pro={false} /></article></section></> : <>
        <header className="payHeading payManageHeading"><p className="eyebrow">NIVAL PAY · PRUEBA</p><h1>{freeEnabled ? 'Tu punto de cobro digital ya está activo.' : 'Deja lista tu página antes de publicarla.'}</h1><p>{freeEnabled ? 'Puedes editarla cuando quieras. Tu QR y enlace siempre apuntan a la información más reciente.' : 'Configura banco, beneficiario, CLABE, logo y un apartado. Después activa tu prueba de 15 días.'}</p></header>
        <section className="payValueStrip"><div><span>APERTURAS</span><strong>{Number(profile.view_count)}</strong><small>personas abrieron esta página</small></div><div><span>CLABE COPIADA</span><strong>{Number(profile.clabe_copy_count)}</strong><small>interacciones reales</small></div><div><span>PLAN</span><strong>Prueba</strong><small>1 página · 1 apartado · QR + enlace</small></div>{freeEnabled && <a href={`${publicSiteUrl()}/pay/${profile.public_token}`} target="_blank" rel="noreferrer">Ver como cliente ↗</a>}</section>
        {['owner','manager'].includes(membership.role) && <PaymentEditor key={profile.id} businessId={membership.business_id} businessName={business?.name ?? 'Mi negocio'} businessLogo={business?.logo_url ?? null} businessBrandColor={business?.brand_color ?? null} profile={profile} siteUrl={publicSiteUrl()} trialMode />}
        {freeSetup && <form action={publishFreeNivalPay} className="trialLaunchBar"><input type="hidden" name="profileId" value={profile.id}/><div><span>CUANDO YA SE VEA BIEN</span><strong>Activa tu QR de prueba.</strong><small>El contador empieza ahora. A los 15 días necesitas Pro para mantener el acceso.</small></div><button type="submit">Activar prueba de 15 días →</button></form>}
      </>}
    </div>
  </main>;

  return <main className="dashboardApp nivalDashboard">
    {params.result && <PaymentStatusPoller active={params.result === 'success' || params.result === 'pending'} />}
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active={currentView === 'add' ? 'agregar-tarjetas' : currentView === 'share' ? 'compartir-paginas' : 'nival-pay'} productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar payTopbar"><div><strong>{currentView === 'add' ? 'Agregar Nival Pay' : currentView === 'share' ? 'Compartir QR y links' : 'Páginas de cobro'}</strong></div><span className="ready">Activo</span></header>
      {params.error && <p role="alert" className="formMessage errorMessage">{params.error}</p>}
      {params.cash === '1' && <p role="status" className="formMessage">Pedido registrado. Liquida $99 al vendedor durante la visita. Tu nueva página se activará cuando él confirme el efectivo recibido.</p>}
      {params.created === '1' && <p role="status" className="formMessage">¡Listo! Tu nueva Nival Pay fue creada y ya está seleccionada para que la configures.</p>}
      {params.unlocked === '1' && <p role="status" className="formMessage">Tu nuevo apartado ya está creado y listo para editar.</p>}
      {!['trial','active'].includes(business?.subscription_status ?? '') && <p role="status" className="formMessage">Tu servicio está suspendido. Puedes editar los datos, pero la página pública no estará disponible hasta reactivar el servicio.</p>}
      {currentView === 'manage' && <><header className="payHeading payManageHeading"><p className="eyebrow">NIVAL PAY</p><h1>Cobra sin volver a explicar cómo pagarte.</h1><p>Lo que guardes aquí se actualiza en tu NFC, QR y enlace sin cambiar la tarjeta física.</p></header>{profile && !hasPoints && Number(profile.view_count) > 0 && <section className="productBridge"><div><span>DESPUÉS DE COBRAR, HAZ QUE VUELVAN</span><h2>Tu Nival Pay ya está recibiendo visitas.</h2><p>Si parte de esas personas son clientes recurrentes, Nival Puntos puede convertir cada compra en una razón clara para regresar.</p></div><a href="/dashboard/points">Probar Nival Puntos gratis →</a></section>}{profile && <><section className="payValueStrip payValueStripPro"><div><span>APERTURAS</span><strong>{selectedViews}</strong><small>veces abrieron esta página</small></div><div><span>CLABE COPIADA</span><strong>{selectedCopies}</strong><small>acciones de copiar registradas</small></div><div><span>TASA DE COPIA</span><strong>{copyRate}%</strong><small>aperturas que terminaron copiando la CLABE</small></div><div><span>ÚLTIMA APERTURA</span><strong className="payLastSeen">{lastViewedLabel}</strong><small>actividad más reciente</small></div><a href={`${publicSiteUrl()}/pay/${profile.public_token}`} target="_blank" rel="noreferrer">Ver como cliente ↗</a></section><p className="payMetricNote">La tasa de copia no significa que el pago se haya completado; mide cuántas aperturas terminaron en la acción de copiar la CLABE.</p></>}<form className="cardSelector cardSelectorRefined" method="get"><label><span>Página que estás editando</span><select name="profile" defaultValue={profile?.id}>{profiles?.map(item => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label><button className="nvPrimaryButton">Abrir</button></form>{['owner','manager'].includes(membership.role) ? profile && <PaymentEditor key={profile.id} businessId={membership.business_id} businessName={business?.name ?? 'Mi negocio'} businessLogo={business?.logo_url ?? null} businessBrandColor={business?.brand_color ?? null} profile={profile} siteUrl={publicSiteUrl()} /> : <p>Solo el propietario o un administrador puede configurar Nival Pay.</p>}</>}
      {currentView === 'add' && <>
        <header className="payHeading"><p className="eyebrow">TUS NIVAL PAY</p><h1>Una página para cada forma de cobrar.</h1><p>Abre una de tus páginas para editarla o agrega otra cuando necesites una caja, sucursal o cuenta distinta.</p></header>
        <section className="nivalPayCatalog" aria-label="Tus páginas Nival Pay">
          {profiles?.map((item,index) => <article className="nivalPayCatalogCard" key={item.id}><a className="nivalCardDirectLink" href={`/dashboard/pay?view=manage&profile=${item.id}`} aria-label={`Editar ${item.display_name}`}><div className="nivalPhysicalCard"><div className="nivalCardMark">N</div><div className="nivalCardCopy"><strong>NIVAL</strong><span>PAY {index+1}</span></div><small>PÁGINA DE COBRO</small></div></a><h2>{item.display_name}</h2><a href={`/dashboard/pay?view=manage&profile=${item.id}`}>Editar página →</a></article>)}
        </section>
        <section className="nivalAddProduct nivalAddProductSeparate"><div><span>AGREGAR OTRA</span><h2>Otra Nival Pay independiente</h2><p>Nueva página, enlace y QR. Tu Nival Pay actual sigue funcionando.</p><strong>$99 MXN · pago único</strong></div>
          <div className="nivalAdditionalActions">{canCreateAdditional ? <form action={createAdditionalPaymentProfile}><CheckoutSubmitButton className="nvPrimaryButton" pendingLabel="Creando página…">Crear página ya pagada</CheckoutSubmitButton></form> : <><form action={startAdditionalNivalPayCheckout}><CheckoutSubmitButton className="nvPrimaryButton" pendingLabel="Abriendo Mercado Pago…">Comprar otra Nival Pay · $99</CheckoutSubmitButton></form><form action={requestAdditionalNivalPayCashPayment}><CheckoutSubmitButton className="nvSecondaryButton" pendingLabel="Registrando solicitud…">Solicitar pago presencial en efectivo · $99</CheckoutSubmitButton></form></>}
          <a className="nivalProductAction secondary" href="/dashboard/pay/physical">¿También quieres una tarjeta NFC física? · desde $99 →</a></div>
        </section>
      </>}
      {currentView === 'manage' && <section className="payHowItWorks"><h2>Cómo se usa Nival Pay</h2><div><article><strong>En tu negocio</strong><p>El mesero muestra el QR o comparte el enlace con la cuenta. Edita tus datos desde Mi tarjeta Pay sin cambiar el QR ni tu tarjeta NFC.</p></article><article><strong>Para quien paga</strong><p>Escanea o acerca el teléfono, verifica el beneficiario, copia la CLABE y transfiere desde su banco. Muestra el comprobante al personal para verificar el pago.</p></article></div></section>}
      {currentView === 'share' && <><header className="payHeading shareHeading"><p className="eyebrow">COMPARTE Y COBRA</p><h1>Un enlace para cobrar.</h1><p>Copia el enlace, compártelo o descarga el QR. Al editar tus datos, el mismo QR abre la información actualizada.</p></header><section className="sharePagesList sharePagesRefined">{profiles?.map(item => <article className="sharePageItem" key={item.id}><h2>{item.display_name}</h2><PaymentProfileQr businessName={`${business?.name ?? 'Nival Pay'}-${item.display_name}`} url={`${publicSiteUrl()}/pay/${item.public_token}`} views={Number(item.view_count)} pro /></article>)}{smartLinks?.map(link => <SmartLinkQr key={link.id} id={link.id} name={link.name} kind={link.kind} targetUrl={link.target_url} url={`${publicSiteUrl()}/go/${link.public_token}`} clicks={Number(link.click_count)} active={link.active} editable={false} />)}</section></>}
    </div>
  </main>;
}
