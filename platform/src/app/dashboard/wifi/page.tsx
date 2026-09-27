import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { DashboardNavigation } from '../dashboard-navigation';

export default async function WifiPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fwifi');
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect('/dashboard');
  if (membership.role === 'staff') redirect('/dashboard/points?view=visits');
  const { data: business } = await supabase.from('businesses').select('name').eq('id', membership.business_id).maybeSingle();
  return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active="wifi" />
    <div className="dashboardContent">
      <header className="dashboardContentTopbar"><div><span>Nival WiFi</span><b>Un acceso sencillo para tus clientes</b></div><span className="ready">Próximamente</span></header>
      <section className="reviewsIntro">
        <div><p className="eyebrow">NIVAL WIFI</p><h1>Comparte tu WiFi sin dictar la contraseña.</h1><p>Estamos preparando una experiencia para que tus clientes encuentren el acceso a tu red desde un QR y, cuando esté disponible, desde un punto físico en el negocio.</p></div>
        <div className="reviewsPlanPair"><article><span>VISTA PREVIA</span><strong>QR de acceso</strong><p>Un cliente escanea, ve el nombre de tu red y obtiene instrucciones claras para conectarse.</p></article><article className="featured"><span>EN PREPARACIÓN</span><strong>Nival WiFi</strong><p>La configuración y publicación de esta herramienta estarán disponibles aquí. Todavía no se puede activar ni cobrar.</p></article></div>
      </section>
    </div>
  </main>;
}
