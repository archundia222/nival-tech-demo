import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNavigation } from '../dashboard-navigation';
import { startNivalIntelligenceSubscription } from '@/app/checkout/actions';

export default async function NivalIntelligencePage({ searchParams }: { searchParams: Promise<{ error?: string; subscription?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fintelligence');
  const { data: membership } = await supabase.from('business_members')
    .select('business_id, businesses(name, product_level)').eq('user_id', user.id).limit(1).maybeSingle();
  if (!membership) redirect('/dashboard');
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const { data: entitlements } = await supabase.from('business_product_entitlements').select('product_code')
    .eq('business_id', membership.business_id).eq('status', 'active');
  const activeProducts = new Set((entitlements ?? []).map((item) => item.product_code));
  const hasPoints = activeProducts.has('nival_points') || business?.product_level === 'intelligence';
  const active = activeProducts.has('nival_intelligence') || business?.product_level === 'intelligence';
  return <main className="dashboardApp">
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active="inteligencia" />
    <div className="dashboardContent">
      <header className="dashboardContentTopbar"><div><span>Nival Intelligence</span><b>Pay + Puntos en un solo lugar</b></div><span className="ready">{active ? 'Activo' : hasPoints ? '$449 con Puntos' : '$399 al mes'}</span></header>
      {params.error && <p className="formMessage errorMessage">{params.error}</p>}
      {params.subscription && <p className="formMessage">Estamos confirmando tu suscripción con Mercado Pago.</p>}
      {!active ? <>
        <section className="dashboardHero productLandingHero"><div><p className="eyebrow">NIVAL INTELLIGENCE</p><h1>Entiende qué está haciendo crecer tu negocio.</h1><p>Integra el uso de Nival Pay y Nival Puntos, identifica segmentos y convierte los datos en acciones concretas.</p><form action={startNivalIntelligenceSubscription}><button className="loginLink">{hasPoints ? 'Mejorar a Puntos + Intelligence por $449 al mes' : 'Activar Intelligence por $399 al mes'}</button></form></div></section>
        <section className="analyticsGrid"><article className="chartCard"><h2>Panel unificado</h2><p>Reúne pagos, aperturas, clientes, visitas, puntos y canjes.</p></article><article className="chartCard"><h2>Segmentos automáticos</h2><p>Detecta clientes nuevos, frecuentes, en riesgo y listos para canjear.</p></article><article className="chartCard"><h2>Acciones recomendadas</h2><p>Recibe recomendaciones claras para campañas y seguimiento.</p></article></section>
      </> : <section className="dashboardHero"><div><p className="eyebrow">INTELLIGENCE ACTIVO</p><h1>Tu operación, conectada.</h1><p>Abre el análisis conjunto de Pay y Puntos para revisar segmentos y recomendaciones.</p><a className="loginLink" href="/dashboard?section=inteligencia">Abrir panel Intelligence</a></div></section>}
    </div>
  </main>;
}
