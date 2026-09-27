import Link from 'next/link';
import { startNivalWifiCheckout, requestNivalCardCashPayment } from '@/app/checkout/actions';
import { CheckoutSubmitButton } from '@/app/checkout/submit-button';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { DashboardNavigation } from '../dashboard-navigation';
import { activateFreeWifi, saveWifi } from './actions';
import { WifiQr } from './wifi-qr';
import { NIVAL_WIFI_PRICE_CENTS } from '@/lib/orders';
import { reconcileLatestMercadoPagoProductOrder } from '@/lib/reconcile-mercado-pago-order';

export default async function WifiPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; view?: string; result?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fwifi');
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect('/dashboard');
  if (membership.role === 'staff') redirect('/dashboard/points?view=visits');
  if (params.result === 'success') await reconcileLatestMercadoPagoProductOrder(membership.business_id, { nival_wifi: NIVAL_WIFI_PRICE_CENTS });
  const [{ data: business }, { data: profile }, { data: paidOrder }] = await Promise.all([
    supabase.from('businesses').select('name').eq('id', membership.business_id).maybeSingle(),
    supabase.from('wifi_profiles').select('ssid,password,security,public_token,trial_started_at,access_url').eq('business_id', membership.business_id).maybeSingle(),
    supabase.from('product_orders').select('id').eq('business_id', membership.business_id).eq('product_code','nival_wifi').eq('status','paid').limit(1).maybeSingle(),
  ]);
  // eslint-disable-next-line react-hooks/purity -- A server request checks access against its current timestamp.
  const trialExpired = !paidOrder && Boolean(profile?.trial_started_at && Date.now() - new Date(profile.trial_started_at).getTime() >= 15 * 86400000);
  const view = params.view === 'add' || params.view === 'share' || params.view === 'pro' ? params.view : 'manage';
  const url = profile?.public_token ? `${(process.env.NIVAL_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || 'https://nival-tech-platform.vercel.app').replace(/\/$/, '')}/wifi/${profile.public_token}` : '';
  return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active={view === 'add' ? 'wifi-add' : view === 'share' ? 'wifi-share' : 'wifi'} />
    <div className="dashboardContent">
      <header className="dashboardContentTopbar"><div><span>Nival WiFi</span><b>Comparte el acceso WiFi de tu negocio</b></div><span className="ready">{paidOrder ? 'Pro' : trialExpired ? 'Prueba terminada' : profile ? 'Prueba de 15 días' : 'Empieza tu prueba'}</span></header>
      {trialExpired && <p className="formMessage">Terminó la prueba de 15 días. Compra Pro para reactivar este mismo acceso y solicitar tu tarjeta NFC incluida.</p>}
      {params.error && <p className="formMessage errorMessage" role="alert">{params.error}</p>}
      {params.result === 'success' && <p className="formMessage successMessage">Pago recibido. Puedes solicitar tu tarjeta NFC física incluida.</p>}
      {params.message && <p className="formMessage successMessage" role="status">{params.message}</p>}
      {params.message?.includes('Efectivo') && <a className="nvSecondaryButton" href="https://wa.me/525539044788?text=Hola%2C%20solicit%C3%A9%20pagar%20Nival%20WiFi%20en%20efectivo.%20Quiero%20acordar%20la%20visita." target="_blank" rel="noreferrer">Acordar el pago en mi negocio por WhatsApp →</a>}
      {view === 'add' && profile ? <section className="reviewsIntro"><p className="eyebrow">TUS TARJETAS WIFI</p><h1>Elige tu tarjeta WiFi</h1><p>Tu tarjeta dirige a una red de invitados. Cambia su configuración desde «Mi tarjeta WiFi».</p><Link className="nvPrimaryLink" href="/dashboard/wifi">Abrir mi tarjeta →</Link></section> : view === 'share' && profile ? <section className="reviewsIntro"><p className="eyebrow">COMPARTIR / ACCESO</p><h1>Comparte tu Nival WiFi</h1><p>El QR abre tu página de invitados. El teléfono puede pedir autorización antes de unirse a la red.</p>{profile.access_url ? <WifiQr ssid={profile.ssid} password={profile.password} security={profile.security} url={url} /> : <p>Configura primero el nombre de tu red.</p>}</section> : !profile ? <section className="reviewsIntro">
        <div><p className="eyebrow">NIVAL WIFI</p><h1>Tu WiFi, listo para compartir.</h1><p>Crea un enlace y QR hacia el acceso WiFi de tu negocio. Para conexión directa, usa el enlace que te proporcione tu portal de invitados o proveedor de red.</p></div>
        <div className="reviewsPlanPair">
          <article><span>15 DÍAS DE PRUEBA</span><strong>$0</strong><p>Configura un enlace para tu red de invitados y comparte su QR durante 15 días.</p><form action={activateFreeWifi}><button className="nvPrimaryLink" type="submit">Empezar gratis</button></form></article>
          <article className="featured"><span>PRO</span><strong>$99</strong><p>Pago único. Acceso permanente y tarjeta NFC física incluida.</p><form action={startNivalWifiCheckout}><CheckoutSubmitButton className="nvPrimaryLink" pendingLabel="Abriendo Mercado Pago…">Comprar Pro</CheckoutSubmitButton></form><form action={requestNivalCardCashPayment}><input type="hidden" name="productCode" value="nival_wifi"/><CheckoutSubmitButton className="nvSecondaryButton" pendingLabel="Registrando…">Solicitar pago en efectivo · $99</CheckoutSubmitButton></form></article>
        </div>
      </section> : <section className="reviewsWorkspace wifiWorkspace">
        <div className="reviewsSetup"><p className="eyebrow">CONFIGURA TU ENLACE</p><h1>WiFi para invitados</h1><p>Pega el enlace HTTPS de acceso que te proporciona tu portal WiFi o administrador de red. El QR y la tarjeta NFC abrirán ese enlace; la conexión puede requerir confirmación del teléfono.</p>
          <form action={saveWifi} className="settingsForm">
            <label>Enlace de acceso al WiFi<input name="accessUrl" type="url" required maxLength={2000} defaultValue={profile.access_url ?? ''} placeholder="https://wifi.tunegocio.com/acceso" /></label>
            <button className="primaryButton" type="submit">Guardar enlace</button>
          </form>
        </div>
        <div className="reviewsPreview wifiPreview">{paidOrder ? <Link href="/dashboard/pay/physical">Solicitar mi tarjeta NFC incluida →</Link> : <form action={startNivalWifiCheckout}><CheckoutSubmitButton className="nvPrimaryLink" pendingLabel="Abriendo Mercado Pago…">Comprar Pro · $99</CheckoutSubmitButton></form>}<span>ACCESO PARA CLIENTES</span>{profile.access_url ? <WifiQr ssid={profile.ssid} password={profile.password} security={profile.security} url={url} /> : <p>Guarda el enlace de tu WiFi para generar el QR.</p>}</div>
      </section>}
    </div>
  </main>;
}
