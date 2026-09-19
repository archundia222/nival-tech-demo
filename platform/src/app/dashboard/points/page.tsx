import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNavigation } from '../dashboard-navigation';
import { startNivalPointsSubscription } from '@/app/checkout/actions';

export default async function NivalPointsPage({ searchParams }: { searchParams: Promise<{ error?: string; subscription?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpoints');
  const { data: membership } = await supabase.from('business_members')
    .select('business_id, businesses(name, product_level)').eq('user_id', user.id).limit(1).maybeSingle();
  if (!membership) redirect('/dashboard');
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const [{ data: entitlement }, { count: customers }, { count: visits }, { data: program }] = await Promise.all([
    supabase.from('business_product_entitlements').select('status').eq('business_id', membership.business_id).eq('product_code', 'nival_points').eq('status', 'active').maybeSingle(),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', membership.business_id),
    supabase.from('visits').select('id', { count: 'exact', head: true }).eq('business_id', membership.business_id),
    supabase.from('loyalty_programs').select('id, name, points_per_visit, reward_threshold, reward_description').eq('business_id', membership.business_id).eq('active', true).limit(1).maybeSingle(),
  ]);
  const active = Boolean(entitlement) || business?.product_level === 'intelligence';
  return <main className="dashboardApp">
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active="puntos" />
    <div className="dashboardContent">
      <header className="dashboardContentTopbar"><div><span>Nival Puntos</span><b>Lealtad y recompensas</b></div><span className="ready">{active ? 'Activo' : '$199 al mes'}</span></header>
      {params.error && <p className="formMessage errorMessage">{params.error}</p>}
      {params.subscription && <p className="formMessage">Estamos confirmando tu suscripción con Mercado Pago.</p>}
      {!active ? <>
        <section className="dashboardHero productLandingHero"><div><p className="eyebrow">NIVAL PUNTOS</p><h1>Haz que tus clientes regresen.</h1><p>Crea un programa de puntos completo con tarjeta virtual, recompensas, campañas, clientes y estadísticas propias.</p><form action={startNivalPointsSubscription}><button className="loginLink">Activar por $199 MXN al mes</button></form></div></section>
        <section className="analyticsGrid">
          <article className="chartCard"><div className="chartHeading"><div><span>CLIENTES</span><h2>Historial y puntos</h2></div></div><p>Consulta visitas, saldo, premios disponibles y canjes de cada cliente.</p></article>
          <article className="chartCard"><div className="chartHeading"><div><span>WALLET</span><h2>Tarjeta siempre disponible</h2></div></div><p>Tarjeta virtual preparada para Google Wallet y Apple Wallet.</p></article>
          <article className="chartCard"><div className="chartHeading"><div><span>CRECIMIENTO</span><h2>Campañas y estadísticas</h2></div></div><p>Mide recurrencia y recibe sugerencias de campañas sin depender de Intelligence.</p></article>
        </section>
      </> : <>
        <section className="dashboardHero"><div><p className="eyebrow">TU PROGRAMA</p><h1>{program?.name ?? 'Configura Nival Puntos'}</h1><p>{program ? `${program.points_per_visit} puntos por visita · Premio al llegar a ${program.reward_threshold} puntos.` : 'Define los puntos por visita y la recompensa de tus clientes.'}</p><a className="loginLink" href="/dashboard?section=configuracion">{program ? 'Editar programa' : 'Configurar programa'}</a></div></section>
        <section className="metricGrid"><article><span>Clientes</span><strong>{customers ?? 0}</strong></article><article><span>Visitas</span><strong>{visits ?? 0}</strong></article><article><span>Recompensa</span><strong>{program?.reward_threshold ?? '—'} pts</strong></article></section>
        <section className="analyticsGrid"><article className="chartCard"><h2>Clientes y canjes</h2><p>Registra visitas, revisa saldos y canjea premios.</p><a className="loginLink" href="/dashboard?section=clientes">Abrir clientes</a></article><article className="chartCard"><h2>Tarjeta y QR</h2><p>Comparte el registro público y la tarjeta virtual del programa.</p><a className="loginLink" href="/dashboard?section=configuracion">Administrar programa</a></article></section>
      </>}
    </div>
  </main>;
}
