import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNavigation } from '../dashboard-navigation';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { activateFreeNivalReviews, saveNivalReviews } from './actions';
import { startNivalReviewsCheckout } from '@/app/checkout/actions';
import { CheckoutSubmitButton } from '@/app/checkout/submit-button';
import { ReviewQr } from './review-qr';
import { NIVAL_REVIEWS_PRO_PRICE_CENTS, mxn } from '@/lib/commercial';

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; free?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?mode=signup&next=%2Fdashboard%2Freviews');

  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Freviews');

  const [{ data: business }, { data: entitlement }, { data: profile }] = await Promise.all([
    supabase.from('businesses').select('name').eq('id', membership.business_id).maybeSingle(),
    supabase.from('business_product_entitlements').select('status').eq('business_id', membership.business_id).eq('product_code', 'nival_reviews').maybeSingle(),
    supabase.from('review_profiles').select('public_token,google_review_url').eq('business_id', membership.business_id).maybeSingle(),
  ]);

  const active = entitlement?.status === 'active';
  const free = entitlement?.status === 'free';
  const publicOrigin = (process.env.NIVAL_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || 'https://nival-tech-platform.vercel.app').replace(/\/$/, '');
  const publicUrl = profile?.public_token ? `${publicOrigin}/reviews/${profile.public_token}` : null;

  return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active="reseñas" />
    <div className="dashboardContent">
      <header className="dashboardContentTopbar"><div><span>Nival Reseñas</span><b>Haz fácil dejarte una reseña</b></div><span className="ready">{active ? 'Pro' : free ? 'Gratis' : 'Sin activar'}</span></header>
      {params.error && <p className="formMessage errorMessage">{params.error}</p>}
      {params.message && <p className="formMessage successMessage">{params.message}</p>}

      {!active && !free ? <section className="reviewsIntro">
        <div>
          <p className="eyebrow">NIVAL RESEÑAS</p>
          <h1>Convierte un buen servicio en una reseña.</h1>
          <p>En lugar de pedir que busquen tu negocio en Google, dales un acceso directo. Escanean o acercan el celular y llegan al lugar correcto.</p>
        </div>
        <div className="reviewsPlanPair">
          <article><span>GRATIS</span><strong>$0</strong><p>QR y enlace directo a tus reseñas.</p><form action={activateFreeNivalReviews}><CheckoutSubmitButton className="nvPrimaryLink" pendingLabel="Activando…">Empezar gratis</CheckoutSubmitButton></form></article>
          <article className="featured"><span>PRO</span><strong>{mxn(NIVAL_REVIEWS_PRO_PRICE_CENTS)}</strong><small>pago único</small><p>QR + acceso físico para que el cliente acerque su celular en tu negocio.</p><form action={startNivalReviewsCheckout}><CheckoutSubmitButton className="nvPrimaryLink" pendingLabel="Abriendo Mercado Pago…">Comprar Pro</CheckoutSubmitButton></form></article>
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
            {!active && <div className="reviewsUpgrade"><span>PLAN GRATIS</span><p>Tu QR funciona sin pagar. Pro agrega el acceso físico para el mostrador.</p><form action={startNivalReviewsCheckout}><CheckoutSubmitButton className="nvSecondaryButton" pendingLabel="Abriendo Mercado Pago…">Pasar a Pro · {mxn(NIVAL_REVIEWS_PRO_PRICE_CENTS)}</CheckoutSubmitButton></form></div>}
          </div>
          <div className="reviewsPreview">
            <span>TU ACCESO A RESEÑAS</span>
            {publicUrl ? <ReviewQr value={publicUrl} /> : <div className="reviewQrPlaceholder">QR</div>}
            <strong>{business?.name ?? 'Tu negocio'}</strong>
            <p>{profile?.google_review_url ? 'Listo para compartir con tus clientes.' : 'Guarda tu enlace para activar el QR.'}</p>
            {publicUrl && <Link href={publicUrl} target="_blank">Probar enlace ↗</Link>}
          </div>
        </section>
      </>}
    </div>
  </main>;
}
