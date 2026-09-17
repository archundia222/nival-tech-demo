import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { publicSiteUrl } from '@/lib/payment-profile';
import { signOut } from '@/app/auth/actions';
import { PaymentEditor } from './payment-editor';

export default async function PaySettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpay');
  const { data: membership, error } = await supabase.from('business_members')
    .select('business_id, role, businesses(name, logo_url, subscription_status)').eq('user_id', user.id)
    .order('created_at').limit(1).maybeSingle();
  if (error) throw new Error('No se pudo cargar el negocio.');
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Fpay');
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const [{ data: paidOrder }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from('product_orders').select('id')
      .eq('business_id', membership.business_id).eq('product_code', 'nival_pay').eq('status', 'paid').limit(1).maybeSingle(),
    supabase.from('payment_profiles')
      .select('account_holder, bank_name, clabe, concept, payment_url, image_url, public_token, active, view_count')
      .eq('business_id', membership.business_id).maybeSingle(),
  ]);
  if (profileError) throw new Error('No se pudo cargar Nival Pay.');
  if (!paidOrder) redirect('/checkout');
  return <main className="dashboardApp">
    <aside className="dashboardSidebar">
      <a className="brand dashboardBrand" href="/dashboard"><span className="brandmark">N</span>NIVAL tech</a>
      <div className="sidebarBusiness"><span>ESPACIO DE TRABAJO</span><strong>{business?.name ?? 'Mi negocio'}</strong></div>
      <nav className="sidebarNav" aria-label="Navegación del panel">
        <a href="/dashboard?section=resumen"><span>01</span>Resumen</a>
        <a href="/dashboard?section=inteligencia"><span>02</span>Inteligencia</a>
        <a href="/dashboard?section=clientes"><span>03</span>Clientes</a>
        <a href="/dashboard?section=nival-card"><span>04</span>Nival Card</a>
        <a className="active" aria-current="page" href="/dashboard/pay"><span>05</span>Nival Pay</a>
        <a href="/dashboard?section=configuracion"><span>06</span>Configuración</a>
      </nav>
      <div className="sidebarFooter"><a href="/products">Mis productos</a><form action={signOut}><button className="textButton">Cerrar sesión</button></form></div>
    </aside>
    <details className="dashboardMobileMenu">
      <summary><span className="hamburgerIcon" aria-hidden="true"><i /><i /><i /></span><span>Menú</span><strong>{business?.name ?? 'Mi negocio'}</strong></summary>
      <nav aria-label="Navegación móvil del panel">
        <a href="/dashboard?section=resumen">Resumen</a><a href="/dashboard?section=inteligencia">Inteligencia</a><a href="/dashboard?section=clientes">Clientes</a><a href="/dashboard?section=nival-card">Nival Card</a><a aria-current="page" href="/dashboard/pay">Nival Pay</a><a href="/dashboard?section=configuracion">Configuración</a>
      </nav>
    </details>
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar"><div><span>Nival Pay</span><b>{new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'America/Mexico_City' }).format(new Date())}</b></div><span className="ready">{business?.subscription_status ?? 'trial'}</span></header>
      <header className="payHeading"><p className="eyebrow">NIVAL PAY</p><h1>Tus datos. Un solo enlace.</h1><p>Configura tu página para compartirla con QR o tarjeta NFC.</p></header>
      {!['trial','active'].includes(business?.subscription_status ?? '') && <p role="status" className="formMessage">Tu servicio está suspendido. Puedes editar los datos, pero la página pública no estará disponible hasta reactivar el servicio.</p>}
      {['owner','manager'].includes(membership.role)
        ? <PaymentEditor businessId={membership.business_id} businessName={business?.name ?? 'Mi negocio'} businessLogo={business?.logo_url ?? null} profile={profile} siteUrl={publicSiteUrl()} />
        : <p>Solo el propietario o un administrador puede configurar Nival Pay.</p>}
    </div>
  </main>;
}
