import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNavigation } from '../dashboard-navigation';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { activateFreeNivalReviews, saveNivalReviews } from './actions';
import { startNivalReviewsCheckout, requestNivalCardCashPayment } from '@/app/checkout/actions';
import { CheckoutSubmitButton } from '@/app/checkout/submit-button';
import { ReviewQr } from './review-qr';
import { NIVAL_REVIEWS_PRO_PRICE_CENTS, mxn } from '@/lib/commercial';

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; free?: string; view?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?mode=signup&next=%2Fdashboard%2Freviews');

  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Freviews');

  const [{ data: business }, { data: entitlement }, { data: profile }] = await Promise.all([
    supabase.from('businesses').select('name').eq('id', membership.business_id).maybeSingle(),
    supabase.from('business_product_entitlements').select('status').eq('business_id', membership.business_id).eq('product_code', 'nival_reviews').maybeSingle(),
    supabase.from('review_profiles').select('public_token,google_review_url,trial_started_at').eq('business_id', membership.business_id).maybeSingle(),
  ]);

  const view = params.view === 'add' || params.view === 'share' ? params.view : 'manage';
  const active = entitlement?.status === 'active';
  const free = entitlement?.status === 'free';
  // eslint-disable-next-line react-hooks/purity -- A server request checks access against its current timestamp.
  const trialExpired = free && Boolean(profile?.trial_started_at && Date.now() - new Date(profile.trial_started_at).getTime() >= 15 * 86400000);
  const publicOrigin = (process.env.NIVAL_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || 'https://nival-tech-platform.vercel.app').replace(/\/$/, '');
  const publicUrl = profile?.public_token ? `${publicOrigin}/reviews/${profile.public_token}` : null;

  return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active={view === 'add' ? 'reseñas-add' : view === 'share' ? 'reseñas-share' : 'reseñas'} />
    <div className="dashboardContent">
      <header className="dashboardContentTopbar"><div><span>Nival Reseñas</span><b>Haz fácil dejarte una reseña</b></div><span className="ready">{active ? 'Pro' : trialExpired ? 'Prueba terminada' : free ? 'Prueba de 15 días' : 'Sin activar'}</span></header>
      {params.error && <p className="formMessage errorMessage">{params.error}</p>}
      {params.message && <p className="formMessage successMessage">{params.message}</p>}
      {params.message?.includes('Efectivo') && <a className="nvSecondaryButton" href="https://wa.me/525539044788?text=Hola%2C%20solicit%C3%A9%20pagar%20Nival%20Rese%C3%B1as%20en%20efectivo.%20Quiero%20acordar%20la%20visita." target="_blank" rel="noreferrer">Acordar el pago en mi negocio por WhatsApp →</a>}

      {view === 'add' && (active || free) ? <section className="reviewsIntro"><p className="eyebrow">TUS TARJETAS RESEÑAS</p><h1>Elige tu tarjeta Reseñas</h1><p>La tarjeta actual dirige a un único enlace de Google. Para cambiar el destino, abre «Mi tarjeta Reseñas».</p><Link className="nvPrimaryLink" href="/dashboard/reviews">Abrir mi tarjeta →</Link></section> : view === 'share' && (active || free) ? <section className="reviewsIntro"><p className="eyebrow">COMPARTIR / ACCESO</p><h1>Comparte tu Nival Reseñas</h1><p>El QR abre el enlace de Google que configuraste. Durante la prueba funciona 15 días; con Pro incluye tarjeta NFC física.</p><div className="reviewsPreview">{publicUrl ? <ReviewQr value={publicUrl} /> : <p>Primero guarda el enlace de reseñas de Google en tu tarjeta.</p>}{publicUrl && <Link href={publicUrl} target="_blank">Abrir acceso ↗</Link>}</div></section> : !active && !free ? <section className="reviewsIntro">
        <div>
          <p className="eyebrow">NIVAL RESEÑAS</p>
          <h1>Convierte un buen servicio en una reseña.</h1>
          <p>En lugar de pedir que busquen tu negocio en Google, dales un acceso directo. Escanean o acercan el celular y llegan al lugar correcto.</p>
        </div>
        <div className="reviewsPlanPair">
          <article><span>15 DÍAS DE PRUEBA</span><strong>$0</strong><p>Un enlace de reseñas de Google, QR y acceso durante 15 días.</p><form action={activateFreeNivalReviews}><CheckoutSubmitButton className="nvPrimaryLink" pendingLabel="Activando…">Empezar gratis</CheckoutSubmitButton></form></article>
          <article className="featured"><span>PRO</span><strong>{mxn(NIVAL_REVIEWS_PRO_PRICE_CENTS)}</strong><small>pago único</small><p>Acceso permanente, QR y tarjeta NFC física incluida.</p><form action={startNivalReviewsCheckout}><CheckoutSubmitButton className="nvPrimaryLink" pendingLabel="Abriendo Mercado Pago…">Comprar Pro</CheckoutSubmitButton></form><form action={requestNivalCardCashPayment}><input type="hidden" name="productCode" value="nival_reviews"/><CheckoutSubmitButton className="nvSecondaryButton" pendingLabel="Registrando…">Solicitar pago en efectivo · $99</CheckoutSubmitButton></form></article>
        </div>
      </section> : <>
        <section className="reviewsWorkspace">
          <div className="reviewsSetup">
            <p className="eyebrow">PASO 1</p>
            <h1>Conecta tus reseñas de Google.</h1>
            <p>Pega el enlace que Google te da para dejar una reseña. Nival conserva un acceso estable aunque después cambies el destino.</p>
            <form action={saveNivalReviews} className="settingsForm">
              <label>Enlace de reseñas de Google<input name="googleReviewUrl" type="url" required defaultValue={profile?.google_review_url ?? ''} placeholder="https://g.page/r/..." /></label>
              <button className="primaryButton" type="submit">Guardar enlace</button>
            </form>
            {!active && <div className="reviewsUpgrade"><span>PLAN GRATIS</span><p>Tu QR funciona durante 15 días. Después requiere Pro para continuar. Pro incluye una tarjeta NFC física.</p><form action={startNivalReviewsCheckout}><CheckoutSubmitButton className="nvSecondaryButton" pendingLabel="Abriendo Mercado Pago…">Pasar a Pro · {mxn(NIVAL_REVIEWS_PRO_PRICE_CENTS)}</CheckoutSubmitButton></form></div>}
          </div>
          <div className="reviewsPreview">
            <span>TU ACCESO A RESEÑAS</span>
            {publicUrl ? <ReviewQr value={publicUrl} /> : <div className="reviewQrPlaceholder">QR</div>}
            <strong>{business?.name ?? 'Tu negocio'}</strong>
            <p>{profile?.google_review_url ? 'Listo para compartir con tus clientes.' : 'Guarda tu enlace para activar el QR.'}</p>
            {publicUrl && <Link href={publicUrl} target="_blank">Probar enlace ↗</Link>} {active && <Link href="/dashboard/pay/physical">Solicitar tarjeta NFC incluida →</Link>}
          </div>
        </section>
      </>}
    </div>
  </main>;
}
