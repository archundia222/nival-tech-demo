import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { DashboardNavigation } from '../dashboard-navigation';
import { activateFreeWifi, saveWifi } from './actions';
import { WifiQr } from './wifi-qr';

export default async function WifiPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fwifi');
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect('/dashboard');
  if (membership.role === 'staff') redirect('/dashboard/points?view=visits');
  const [{ data: business }, { data: profile }] = await Promise.all([
    supabase.from('businesses').select('name').eq('id', membership.business_id).maybeSingle(),
    supabase.from('wifi_profiles').select('ssid,password,security,public_token').eq('business_id', membership.business_id).maybeSingle(),
  ]);
  const url = profile?.public_token ? `${(process.env.NIVAL_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || 'https://nival-tech-platform.vercel.app').replace(/\/$/, '')}/wifi/${profile.public_token}` : '';
  return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active="wifi" />
    <div className="dashboardContent">
      <header className="dashboardContentTopbar"><div><span>Nival WiFi</span><b>Conecta a tus clientes sin dictar la contraseña</b></div><span className="ready">{profile ? 'Gratis' : 'Empieza gratis'}</span></header>
      {params.error && <p className="formMessage errorMessage" role="alert">{params.error}</p>}
      {params.message && <p className="formMessage successMessage" role="status">{params.message}</p>}
      {!profile ? <section className="reviewsIntro">
        <div><p className="eyebrow">NIVAL WIFI</p><h1>Tu WiFi, listo para escanear.</h1><p>Crea un QR para que tus clientes se conecten a la red de invitados desde su teléfono. El QR se puede descargar para tu mostrador.</p></div>
        <div className="reviewsPlanPair">
          <article><span>GRATIS</span><strong>$0</strong><p>Configura una red, descarga su QR de conexión y comparte una página para invitados.</p><form action={activateFreeWifi}><button className="nvPrimaryLink" type="submit">Empezar gratis</button></form></article>
          <article className="featured"><span>PRO</span><strong>Próximamente</strong><p>Estamos preparando opciones físicas y herramientas adicionales. Aún no hay un precio ni un cobro para Pro.</p></article>
        </div>
      </section> : <section className="reviewsWorkspace wifiWorkspace">
        <div className="reviewsSetup"><p className="eyebrow">CONFIGURA TU RED</p><h1>WiFi para invitados</h1><p>Usa una red de invitados de tu negocio. El QR incluirá la contraseña que guardes aquí.</p>
          <form action={saveWifi} className="settingsForm">
            <label>Nombre de la red (SSID)<input name="ssid" required maxLength={32} defaultValue={profile.ssid} placeholder="WiFi de mi negocio" /></label>
            <label>Seguridad<select name="security" defaultValue={profile.security}><option value="WPA">Con contraseña (WPA/WPA2/WPA3)</option><option value="nopass">Red abierta</option></select></label>
            <label>Contraseña de la red<input name="password" type="text" maxLength={63} defaultValue={profile.password} autoComplete="off" placeholder="Contraseña de tu red de invitados" /></label>
            <small>Si elegiste red abierta, deja vacía la contraseña. Quien escanee el QR podrá ver los datos de la red.</small>
            <button className="primaryButton" type="submit">Guardar y actualizar QR</button>
          </form>
        </div>
        <div className="reviewsPreview wifiPreview"><span>ACCESO PARA CLIENTES</span>{profile.ssid ? <WifiQr ssid={profile.ssid} password={profile.password} security={profile.security} url={url} /> : <p>Guarda el nombre de tu red para generar el QR.</p>}</div>
      </section>}
    </div>
  </main>;
}
