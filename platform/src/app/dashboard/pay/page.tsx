import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { publicSiteUrl } from '@/lib/payment-profile';
import { PaymentEditor } from './payment-editor';
import { DashboardNavigation } from '../dashboard-navigation';

export default async function PaySettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpay');
  const { data: membership, error } = await supabase.from('business_members')
    .select('business_id, role, businesses(name, logo_url, subscription_status, product_level)').eq('user_id', user.id)
    .order('created_at').limit(1).maybeSingle();
  if (error) throw new Error('No se pudo cargar el negocio.');
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Fpay');
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const [{ data: paidOrder }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from('product_orders').select('id')
      .eq('business_id', membership.business_id).eq('product_code', 'nival_pay').eq('status', 'paid').limit(1).maybeSingle(),
    supabase.from('payment_profiles')
      .select('account_holder, bank_name, clabe, concept, payment_url, image_url, public_token, active, view_count, clabe_copy_count')
      .eq('business_id', membership.business_id).maybeSingle(),
  ]);
  if (profileError) throw new Error('No se pudo cargar Nival Pay.');
  if (!paidOrder) return <main className="dashboardApp">
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active="nival-pay" productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar"><div><span>Nival Pay</span><b>{new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'America/Mexico_City' }).format(new Date())}</b></div><span className="ready">Sin activar</span></header>
      <section className="dashboardHero">
        <div>
          <p className="eyebrow">NIVAL PAY</p>
          <h1>Convierte tu tarjeta NFC en una página de cobro.</h1>
          <p>Recibe transferencias con un enlace y QR propios. La activación incluye tu tarjeta NFC y es un pago único de $199 MXN, sin mensualidad.</p>
          <a className="loginLink" href="/checkout">Activar Nival Pay · $199 MXN</a>
        </div>
      </section>
      <section className="analyticsGrid" aria-label="Qué incluye Nival Pay">
        <article className="chartCard"><div className="chartHeading"><div><span>PÁGINA DE COBRO</span><h2>Lista para compartir</h2></div></div><p>Tu cliente abre una página simple con los datos necesarios para pagarte.</p></article>
        <article className="chartCard"><div className="chartHeading"><div><span>NFC + QR</span><h2>Un mismo destino</h2></div></div><p>Comparte el mismo enlace desde tu tarjeta NFC o mediante código QR.</p></article>
      </section>
    </div>
  </main>;

  return <main className="dashboardApp">
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active="nival-pay" productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar"><div><span>Nival Pay</span><b>{new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'America/Mexico_City' }).format(new Date())}</b></div><span className="ready">Activo</span></header>
      <header className="payHeading"><p className="eyebrow">NIVAL PAY</p><h1>Tus puntos de cobro.</h1><p>Administra tu página, QR y tarjeta NFC desde un solo lugar.</p></header>
      <section className="metricGrid payMetrics">
        <article><span>Vistas de tu página</span><strong>{Number(profile?.view_count ?? 0)}</strong></article>
        <article><span>Copias de CLABE</span><strong>{Number(profile?.clabe_copy_count ?? 0)}</strong></article>
        <article><span>Link principal</span><strong>{profile?.active ? "Activo" : "Pausado"}</strong></article>
      </section>
      <section className="payGrowthCard">
        <div><p className="eyebrow">AMPLÍA NIVAL PAY</p><h2>Más puntos para cobrar</h2><p>Tu cuenta puede crecer con links + QR adicionales por $10 MXN y tarjetas NFC físicas adicionales por $99 MXN.</p></div>
        <div><span><b>$10</b> link + QR</span><span><b>$99</b> tarjeta NFC adicional</span></div>
      </section>
      {!['trial','active'].includes(business?.subscription_status ?? '') && <p role="status" className="formMessage">Tu servicio está suspendido. Puedes editar los datos, pero la página pública no estará disponible hasta reactivar el servicio.</p>}
      {['owner','manager'].includes(membership.role)
        ? <PaymentEditor businessId={membership.business_id} businessName={business?.name ?? 'Mi negocio'} businessLogo={business?.logo_url ?? null} profile={profile} siteUrl={publicSiteUrl()} />
        : <p>Solo el propietario o un administrador puede configurar Nival Pay.</p>}
    </div>
  </main>;
}
