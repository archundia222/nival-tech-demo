import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNavigation } from '../dashboard-navigation';
import { startNivalIntelligenceSubscription } from '@/app/checkout/actions';
import { reconcileLatestSubscription } from '@/lib/reconcile-subscription';

export default async function NivalIntelligencePage({ searchParams }: { searchParams: Promise<{ error?: string; subscription?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fintelligence');
  const { data: membership } = await supabase.from('business_members')
    .select('business_id, businesses(name, product_level)').eq('user_id', user.id).limit(1).maybeSingle();
  if (!membership) redirect('/dashboard');
  if (params.subscription === 'return') await reconcileLatestSubscription(membership.business_id);
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const { data: entitlements } = await supabase.from('business_product_entitlements').select('product_code')
    .eq('business_id', membership.business_id).eq('status', 'active');
  const activeProducts = new Set((entitlements ?? []).map((item) => item.product_code));
  const hasPoints = activeProducts.has('nival_points') || business?.product_level === 'intelligence';
  const active = activeProducts.has('nival_intelligence') || business?.product_level === 'intelligence';
  return <main className="dashboardApp">
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active="inteligencia" />
    <div className="dashboardContent">
      <header className="dashboardContentTopbar"><div><span>Nival Intelligence</span><b>Pay + Puntos en un solo lugar</b></div><span className="ready">{active ? 'Activo' : '$10 de prueba'}</span></header>
      {params.error && <p className="formMessage errorMessage">{params.error}</p>}
      {params.subscription && <p className="formMessage">Estamos confirmando tu suscripción con Mercado Pago.</p>}
      {!active ? <>
        <section className="productShowcase intelligenceShowcase">
          <div className="productShowcaseCopy"><span className="productPill">NIVAL INTELLIGENCE</span><h1>Deja de mirar datos.<br/>Empieza a entenderlos.</h1><p>Tu negocio genera señales todos los días. Intelligence conecta Nival Pay y Nival Puntos para decirte qué está pasando y qué puedes hacer después.</p><div className="productPrice"><strong>$10</strong><span>MXN / mes · precio de prueba</span></div><form action={startNivalIntelligenceSubscription}><button className="productCta">{hasPoints ? 'Activar el paquete completo' : 'Activar Nival Intelligence'} <span>→</span></button></form>{hasPoints && <small>Durante la prueba, el paquete completo también se cobra a $10 MXN.</small>}</div>
          <div className="intelligenceVisual"><div className="aiGlow"></div><div className="aiPanel"><div className="aiPanelTop"><b>NIVAL <em>INTELLIGENCE</em></b><span>EN VIVO</span></div><div className="aiInsight"><small>OPORTUNIDAD DETECTADA</small><strong>24 clientes están cerca de volver a comprar.</strong><p>Una campaña de recompensa esta semana podría aumentar la recurrencia.</p><button type="button">Ver recomendación →</button></div><div className="aiMiniGrid"><div><small>CLIENTES ACTIVOS</small><b>184</b><i>+12%</i></div><div><small>RECURRENCIA</small><b>38%</b><i>+6.4%</i></div></div><div className="aiBars"><span style={{height:'35%'}}></span><span style={{height:'54%'}}></span><span style={{height:'42%'}}></span><span style={{height:'76%'}}></span><span style={{height:'62%'}}></span><span style={{height:'88%'}}></span><span style={{height:'72%'}}></span></div></div></div>
        </section>
        <section className="productFeatureStrip darkFeatureStrip"><article><span>01</span><div><b>Todo conectado</b><p>Pay, Puntos, clientes, visitas y actividad en una sola lectura.</p></div></article><article><span>02</span><div><b>Encuentra oportunidades</b><p>Detecta segmentos, cambios de comportamiento y clientes en riesgo.</p></div></article><article><span>03</span><div><b>Sabe qué hacer después</b><p>Convierte la información en recomendaciones concretas para tu negocio.</p></div></article></section>
      </> : <section className="dashboardHero"><div><p className="eyebrow">INTELLIGENCE ACTIVO</p><h1>Tu operación, conectada.</h1><p>Abre el análisis conjunto de Pay y Puntos para revisar segmentos y recomendaciones.</p><a className="loginLink" href="/dashboard?section=inteligencia">Abrir panel Intelligence</a></div></section>}
    </div>
  </main>;
}
