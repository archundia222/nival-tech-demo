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
      <header className="dashboardContentTopbar"><div><span>Nival Puntos</span><b>Lealtad y recompensas</b></div><span className="ready">{active ? 'Activo' : '$1 de prueba'}</span></header>
      {params.error && <p className="formMessage errorMessage">{params.error}</p>}
      {params.subscription && <p className="formMessage">Estamos confirmando tu suscripción con Mercado Pago.</p>}
      {!active ? <>
        <section className="productShowcase pointsShowcase">
          <div className="productShowcaseCopy"><span className="productPill">NIVAL PUNTOS</span><h1>Convierte una compra<br/>en la siguiente.</h1><p>Un programa de lealtad que tus clientes llevan en el teléfono. Puntos, recompensas y estadísticas para hacer que vuelvan.</p><div className="productPrice"><strong>$1</strong><span>MXN / mes · precio de prueba</span></div><form action={startNivalPointsSubscription}><button className="productCta">Activar Nival Puntos <span>→</span></button></form><small>Sin Intelligence. Todo lo que necesitas para empezar a fidelizar.</small></div>
          <div className="pointsVisual"><div className="walletCard walletCardBack"><span>NIVAL</span></div><div className="walletCard"><div className="walletTop"><b>NIVAL PUNTOS</b><span>●</span></div><div className="walletBusiness">TU NEGOCIO</div><strong>840</strong><small>PUNTOS DISPONIBLES</small><div className="walletProgress"><i></i></div><p>160 puntos para tu próxima recompensa</p><div className="walletQr">▦</div></div><div className="floatStat statOne"><b>+28%</b><span>recurrencia</span></div><div className="floatStat statTwo"><b>12</b><span>premios este mes</span></div></div>
        </section>
        <section className="productFeatureStrip"><article><span>01</span><div><b>Tarjeta en Wallet</b><p>Google Wallet y Apple Wallet para que tu programa siempre esté a la mano.</p></div></article><article><span>02</span><div><b>Clientes que sí conoces</b><p>Historial, saldo, visitas, premios y canjes en un mismo lugar.</p></div></article><article><span>03</span><div><b>Decisiones con datos</b><p>Recurrencia, actividad y sugerencias para mejorar tu programa.</p></div></article></section>
      </> : <>
        <section className="dashboardHero"><div><p className="eyebrow">TU PROGRAMA</p><h1>{program?.name ?? 'Configura Nival Puntos'}</h1><p>{program ? `${program.points_per_visit} puntos por visita · Premio al llegar a ${program.reward_threshold} puntos.` : 'Define los puntos por visita y la recompensa de tus clientes.'}</p><a className="loginLink" href="/dashboard?section=configuracion">{program ? 'Editar programa' : 'Configurar programa'}</a></div></section>
        <section className="metricGrid"><article><span>Clientes</span><strong>{customers ?? 0}</strong></article><article><span>Visitas</span><strong>{visits ?? 0}</strong></article><article><span>Recompensa</span><strong>{program?.reward_threshold ?? '—'} pts</strong></article></section>
        <section className="analyticsGrid"><article className="chartCard"><h2>Clientes y canjes</h2><p>Registra visitas, revisa saldos y canjea premios.</p><a className="loginLink" href="/dashboard?section=clientes">Abrir clientes</a></article><article className="chartCard"><h2>Tarjeta y QR</h2><p>Comparte el registro público y la tarjeta virtual del programa.</p><a className="loginLink" href="/dashboard?section=configuracion">Administrar programa</a></article></section>
      </>}
    </div>
  </main>;
}
