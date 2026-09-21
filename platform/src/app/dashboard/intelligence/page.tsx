import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNavigation } from '../dashboard-navigation';
import { startNivalIntelligenceSubscription } from '@/app/checkout/actions';
import { reconcileLatestSubscription } from '@/lib/reconcile-subscription';
import { ProductInteractiveDemo } from '../product-interactive-demo';

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
  return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active="inteligencia" />
    <div className={`dashboardContent ${!active ? "nivalIntelligenceDark" : ""}`}>
      <header className="dashboardContentTopbar"><div><span>Nival Intelligence</span><b>Pay + Puntos en un solo lugar</b></div><span className="ready">{active ? 'Activo' : hasPoints ? '$449/mes' : '$399/mes'}</span></header>
      {params.error && <p className="formMessage errorMessage">{params.error}</p>}
      {params.subscription && <p className="formMessage">Estamos confirmando tu suscripción con Mercado Pago.</p>}
      {!active ? <>
        <section className="productShowcase intelligenceShowcase">
          <div className="productShowcaseCopy"><span className="productPill">NIVAL INTELLIGENCE</span><h1>Descubre qué hacer<br/>para vender más.</h1><p>Nival Intelligence revisa la actividad de tu negocio y te explica, con palabras sencillas, qué está pasando y cuál es la siguiente acción recomendable.</p><ul className="productBenefits"><li>Detecta clientes que podrían regresar</li><li>Explica cambios importantes</li><li>Recomienda acciones concretas</li></ul><div className="productPrice"><strong>{hasPoints ? '$449' : '$399'}</strong><span>MXN al mes</span></div><form action={startNivalIntelligenceSubscription}><button className="productCta">{hasPoints ? 'Activar Puntos + Intelligence' : 'Comenzar con Intelligence'} <span>→</span></button></form>{hasPoints && <small>Tu plan incluye Nival Puntos + Intelligence por $449 MXN al mes.</small>}</div>
          <div className="intelligenceVisual"><div className="aiGlow"></div><div className="aiPanel"><div className="aiPanelTop"><b>NIVAL <em>INTELLIGENCE</em></b><span>EN VIVO</span></div><div className="aiInsight"><small>OPORTUNIDAD DETECTADA</small><strong>24 clientes están cerca de volver a comprar.</strong><p>Una campaña de recompensa esta semana podría aumentar la recurrencia.</p><button type="button">Ver recomendación →</button></div><div className="aiMiniGrid"><div><small>CLIENTES ACTIVOS</small><b>184</b><i>+12%</i></div><div><small>RECURRENCIA</small><b>38%</b><i>+6.4%</i></div></div><div className="aiBars"><span style={{height:'35%'}}></span><span style={{height:'54%'}}></span><span style={{height:'42%'}}></span><span style={{height:'76%'}}></span><span style={{height:'62%'}}></span><span style={{height:'88%'}}></span><span style={{height:'72%'}}></span></div></div></div>
        </section>
        <section className="productFeatureStrip darkFeatureStrip"><article><span>01</span><div><b>Todo conectado</b><p>Pay, Puntos, clientes, visitas y actividad en una sola lectura.</p></div></article><article><span>02</span><div><b>Encuentra oportunidades</b><p>Detecta segmentos, cambios de comportamiento y clientes en riesgo.</p></div></article><article><span>03</span><div><b>Sabe qué hacer después</b><p>Convierte la información en recomendaciones concretas para tu negocio.</p></div></article></section>
        <section className="productStorySection intelligenceStory">
          <div className="productStoryHeading"><span>DE LOS DATOS A LA ACCIÓN</span><h2>No necesitas ser experto para entender tu negocio.</h2><p>Intelligence organiza la información de Pay y Puntos y la convierte en respuestas claras.</p></div>
          <div className="productSteps"><article><b>1</b><div><h3>Observa la actividad</h3><p>Reúne visitas, clientes, recurrencia y uso de tus páginas.</p></div></article><article><b>2</b><div><h3>Detecta cambios</h3><p>Señala oportunidades, clientes en riesgo y comportamientos importantes.</p></div></article><article><b>3</b><div><h3>Recomienda una acción</h3><p>Te dice qué puedes hacer después con una explicación sencilla.</p></div></article></div>
        </section>
        <ProductInteractiveDemo mode="intelligence" />
        <section className="productPreviewSection intelligenceProductPreview">
          <div className="productStoryHeading"><span>VISTA PREVIA</span><h2>Abres el panel y sabes qué necesita atención.</h2><p>Sin tablas complicadas: primero ves el hallazgo, después la explicación y finalmente la acción sugerida.</p></div>
          <div className="intelligenceDashboardPreview">
            <header><div><small>RESUMEN DE ESTA SEMANA</small><h3>Tu negocio está creciendo, pero hay clientes por recuperar.</h3></div><span>Actualizado hoy</span></header>
            <div className="previewMetricRow"><article><small>Clientes activos</small><strong>184</strong><span className="positive">+12% este mes</span></article><article><small>Recurrencia</small><strong>38%</strong><span className="positive">+6.4%</span></article><article><small>En riesgo</small><strong>24</strong><span>Sin volver en 30 días</span></article></div>
            <div className="previewInsightRow"><article><span>OPORTUNIDAD PRINCIPAL</span><h4>24 clientes están cerca de volver a comprar.</h4><p>La mayoría visitó el negocio dos veces durante el último mes, pero todavía no regresa esta semana.</p><div className="suggestedAction"><b>Acción recomendada</b><p>Envía una promoción de regreso válida durante 5 días.</p><button type="button">Preparar campaña</button></div></article><article className="previewSegments"><h4>Segmentos importantes</h4><div><span><i className="greenDot"/>Frecuentes</span><b>42</b></div><div><span><i className="goldDot"/>Nuevos</span><b>31</b></div><div><span><i className="redDot"/>En riesgo</span><b>24</b></div><div><span><i className="blueDot"/>Premio listo</span><b>9</b></div></article></div>
          </div>
          <p className="previewNote">Ejemplo visual con datos demostrativos. Tu panel utilizará la actividad real de tu negocio.</p>
        </section>
        <section className="productSolutionsSection intelligenceSolutions">
          <div className="productStoryHeading"><span>LO QUE RESUELVE</span><h2>Respuestas concretas para decisiones diarias.</h2></div>
          <div className="solutionGrid"><article><span>Recurrencia</span><h3>¿Quién dejó de venir?</h3><p>Identifica clientes en riesgo antes de perderlos por completo.</p></article><article><span>Oportunidades</span><h3>¿A quién conviene contactar?</h3><p>Encuentra grupos con mayor posibilidad de responder a una campaña.</p></article><article><span>Rendimiento</span><h3>¿Está funcionando mi programa?</h3><p>Compara actividad y recurrencia para entender los cambios.</p></article><article><span>Prioridades</span><h3>¿Qué hago hoy?</h3><p>Recibe una lista breve de acciones sugeridas y por qué importan.</p></article></div>
        </section>
        <section className="intelligenceConnection">
          <div><span>UNA SOLA VISTA</span><h2>Nival Pay registra interés. Nival Puntos registra relaciones. Intelligence conecta ambos.</h2></div>
          <div className="connectionFlow"><span>Nival Pay</span><i>+</i><span>Nival Puntos</span><i>→</i><strong>Intelligence</strong></div>
        </section>
        <section className="productUseCases darkUseCases"><div><span>EMPIEZA CON TUS DATOS REALES</span><h2>Activa Intelligence y convierte la actividad diaria en oportunidades.</h2></div><form action={startNivalIntelligenceSubscription}><button className="productCta">{hasPoints ? 'Activar Puntos + Intelligence' : 'Comenzar con Intelligence'} <span>→</span></button></form></section>
      </> : <section className="dashboardHero"><div><p className="eyebrow">INTELLIGENCE ACTIVO</p><h1>Tu operación, conectada.</h1><p>Abre el análisis conjunto de Pay y Puntos para revisar segmentos y recomendaciones.</p><a className="loginLink" href="/dashboard?section=inteligencia">Abrir panel Intelligence</a></div></section>}
    </div>
  </main>;
}
