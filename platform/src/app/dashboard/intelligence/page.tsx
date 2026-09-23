import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNavigation } from '../dashboard-navigation';
import { startNivalIntelligenceSubscription } from '@/app/checkout/actions';
import { reconcileLatestSubscription } from '@/lib/reconcile-subscription';
import { ProductInteractiveDemo } from '../product-interactive-demo';
import styles from './intelligence-dashboard.module.css';

type Visit = { customer_id: string; visited_at: string };

export default async function NivalIntelligencePage({ searchParams }: { searchParams: Promise<{ error?: string; subscription?: string; view?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fintelligence');
  const { data: membership } = await supabase.from('business_members').select('business_id, businesses(name, product_level)').eq('user_id', user.id).limit(1).maybeSingle();
  if (!membership) redirect('/dashboard');
  if (params.subscription === 'return') await reconcileLatestSubscription(membership.business_id);
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const { data: entitlements } = await supabase.from('business_product_entitlements').select('product_code').eq('business_id', membership.business_id).eq('status', 'active');
  const activeProducts = new Set((entitlements ?? []).map((item) => item.product_code));
  const hasPoints = activeProducts.has('nival_points') || business?.product_level === 'intelligence';
  const active = activeProducts.has('nival_intelligence') || business?.product_level === 'intelligence';
  const view = params.view ?? 'overview';
  const navActive = view === 'customers' ? 'inteligencia-clientes' : view === 'imports' ? 'inteligencia-importar' : view === 'assistant' ? 'inteligencia-asistente' : view === 'opportunities' ? 'inteligencia-oportunidades' : 'inteligencia';

  const [{ data: customerRows }, { data: visitRows }, { data: rewardRows }] = active ? await Promise.all([
    supabase.from('customers').select('id,name,phone,email,created_at').eq('business_id', membership.business_id).order('created_at',{ascending:false}).limit(500),
    supabase.from('visits').select('customer_id,visited_at').eq('business_id', membership.business_id).order('visited_at',{ascending:false}).limit(5000),
    supabase.from('loyalty_rewards').select('customer_id,redeemed_at').eq('business_id', membership.business_id).limit(3000),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];

  const now = Date.now();
  const day = 86400000;
  const visits = (visitRows ?? []) as Visit[];
  const visitsByCustomer = new Map<string, Visit[]>();
  for (const visit of visits) {
    const bucket = visitsByCustomer.get(visit.customer_id);
    if (bucket) bucket.push(visit); else visitsByCustomer.set(visit.customer_id, [visit]);
  }
  const customers = (customerRows ?? []).map((customer) => {
    const customerVisits = visitsByCustomer.get(customer.id) ?? [];
    const lastVisit = customerVisits[0]?.visited_at ? new Date(customerVisits[0].visited_at) : null;
    const daysSince = lastVisit ? Math.floor((now - lastVisit.getTime()) / day) : null;
    const frequency = customerVisits.length > 1 ? Math.max(1, Math.round((new Date(customerVisits[0].visited_at).getTime() - new Date(customerVisits[customerVisits.length - 1].visited_at).getTime()) / day / (customerVisits.length - 1))) : null;
    return { ...customer, visits: customerVisits.length, lastVisit, daysSince, frequency, status: daysSince === null ? 'Nuevo' : daysSince > 30 ? 'En riesgo' : customerVisits.length >= 3 ? 'Frecuente' : 'Activo' };
  });
  const visits30 = visits.filter((visit) => now - new Date(visit.visited_at).getTime() <= 30 * day).length;
  const previous30 = visits.filter((visit) => { const age = now - new Date(visit.visited_at).getTime(); return age > 30 * day && age <= 60 * day; }).length;
  const change = previous30 ? Math.round(((visits30 - previous30) / previous30) * 100) : visits30 ? 100 : 0;
  const atRisk = customers.filter((customer) => customer.status === 'En riesgo');
  const frequent = customers.filter((customer) => customer.status === 'Frecuente');
  const inactive = customers.filter((customer) => customer.daysSince !== null && customer.daysSince > 60);
  const newCustomers = customers.filter((customer) => customer.visits <= 1);
  const recoverable = atRisk.filter((customer) => customer.daysSince !== null && customer.daysSince <= 60);
  const campaignMessage = recoverable.length
    ? `¡Hola! Hace un tiempo que no te vemos en ${business?.name ?? 'nuestro negocio'}. Nos encantaría recibirte de nuevo esta semana. ¿Te esperamos?`
    : frequent.length
      ? `¡Gracias por volver a ${business?.name ?? 'nuestro negocio'}! Queremos reconocer a nuestros clientes frecuentes. Pregunta por tu beneficio en tu próxima visita.`
      : `¡Hola! Gracias por visitar ${business?.name ?? 'nuestro negocio'}. Esperamos verte de nuevo muy pronto.`;
  const activeCustomers = customers.filter((customer) => customer.daysSince !== null && customer.daysSince <= 30).length;
  const availableRewards = (rewardRows ?? []).filter((reward) => !reward.redeemed_at).length;
  const retention = customers.length ? Math.round((customers.filter(c => c.visits >= 2).length / customers.length) * 100) : 0;
  const dataCoverage = customers.length ? Math.round((customers.filter(c => c.phone || c.email).length / customers.length) * 100) : 0;
  const intelligenceScore = Math.min(100, Math.round((Math.min(customers.length, 50) / 50) * 35 + (Math.min(visits.length, 150) / 150) * 35 + (dataCoverage / 100) * 30));
  const mainAdvice = atRisk.length ? `${atRisk.length} clientes necesitan atención antes de enfriarse más.` : visits30 ? 'Tu actividad reciente es estable. Conviene reforzar a tus clientes frecuentes.' : 'Registra visitas para que Intelligence encuentre oportunidades reales.';

  return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active={navActive} />
    <div className={`dashboardContent ${!active ? 'nivalIntelligenceDark' : ''}`}>
      <header className="dashboardContentTopbar"><div><span>Nival Intelligence</span><b>Decisiones basadas en tus datos</b></div><span className="ready">{active ? 'Activo' : hasPoints ? '$449/mes' : '$399/mes'}</span></header>
      {params.error && <p className="formMessage errorMessage">{params.error}</p>}
      {params.subscription && <p className="formMessage">Estamos confirmando tu suscripción con Mercado Pago.</p>}
      {!active ? <>
        <section className="productShowcase intelligenceShowcase"><div className="productShowcaseCopy"><span className="productPill">NIVAL INTELLIGENCE</span><h1>Descubre qué hacer<br/>para vender más.</h1><p>Nival Intelligence revisa la actividad de tu negocio y te explica qué está pasando, qué clientes necesitan atención y cuál es la siguiente acción recomendable.</p><ul className="productBenefits"><li>Detecta clientes en riesgo y recurrentes</li><li>Convierte actividad en métricas claras</li><li>Recomienda acciones concretas</li></ul><div className="productPrice"><strong>{hasPoints ? '$449' : '$399'}</strong><span>MXN al mes</span></div><form action={startNivalIntelligenceSubscription}><button className="productCta">{hasPoints ? 'Activar Puntos + Intelligence' : 'Comenzar con Intelligence'} <span>→</span></button></form></div><div className="intelligenceVisual"><div className="aiGlow"/><div className="aiPanel"><div className="aiPanelTop"><b>NIVAL <em>INTELLIGENCE</em></b><span>EN VIVO</span></div><div className="aiInsight"><small>OPORTUNIDAD DETECTADA</small><strong>24 clientes están cerca de volver a comprar.</strong><p>Una campaña de regreso esta semana podría aumentar la recurrencia.</p></div><div className="aiMiniGrid"><div><small>CLIENTES ACTIVOS</small><b>184</b><i>+12%</i></div><div><small>RECURRENCIA</small><b>38%</b><i>+6.4%</i></div></div></div></div></section>
        <section className="productFeatureStrip darkFeatureStrip"><article><span>01</span><div><b>Todo conectado</b><p>Pay, Puntos, clientes, visitas y actividad en una sola lectura.</p></div></article><article><span>02</span><div><b>Encuentra oportunidades</b><p>Detecta cambios de comportamiento y clientes en riesgo.</p></div></article><article><span>03</span><div><b>Sabe qué hacer después</b><p>Convierte la información en recomendaciones concretas.</p></div></article></section>
        <ProductInteractiveDemo mode="intelligence" />
      </> : <div className={styles.shell}>
        {view === 'overview' && <>
          <section className={styles.hero}><div><span className={styles.eyebrow}>NIVAL INTELLIGENCE · HOY</span><h1>Tu negocio te está diciendo qué hacer.</h1><p>{atRisk.length ? `Hay ${atRisk.length} clientes en riesgo. ${recoverable.length} todavía están en una ventana clara de recuperación.` : frequent.length ? `Tienes ${frequent.length} clientes frecuentes. Hoy conviene fortalecer esa relación.` : 'Aún no hay una alerta urgente. Sigue registrando actividad para detectar oportunidades.'}</p><div className={styles.heroActions}><a href="/dashboard/intelligence?view=opportunities">Ver plan de hoy</a><a href="/dashboard/intelligence?view=customers">Ver clientes</a></div></div><div className={styles.todayBadge}><small>PRIORIDAD DE HOY</small><strong>{atRisk.length ? 'Recuperar clientes' : frequent.length ? 'Fidelizar frecuentes' : 'Generar recurrencia'}</strong><span>Basado en la actividad registrada</span></div></section>
          <section className={styles.customerPulse}>
            <a href="/dashboard/intelligence?view=customers"><span>EN RIESGO</span><strong>{atRisk.length}</strong><small>30+ días sin volver</small></a>
            <a href="/dashboard/intelligence?view=customers"><span>FRECUENTES</span><strong>{frequent.length}</strong><small>3+ visitas recientes</small></a>
            <a href="/dashboard/intelligence?view=customers"><span>INACTIVOS</span><strong>{inactive.length}</strong><small>60+ días sin volver</small></a>
            <a href="/dashboard/intelligence?view=customers"><span>NUEVOS</span><strong>{newCustomers.length}</strong><small>0–1 visitas registradas</small></a>
          </section>
          <section className={styles.dailyPlan}>
            <div className={styles.planHeading}><div><span className={styles.label}>RECOMENDACIÓN DIARIA</span><h2>Una estrategia concreta para hoy</h2></div><span>{recoverable.length || frequent.length || newCustomers.length} clientes objetivo</span></div>
            <div className={styles.planGrid}><article><span className={styles.step}>01 · A QUIÉN</span><h3>{recoverable.length ? `Recupera a estos ${recoverable.length} clientes` : frequent.length ? `Premia a tus ${frequent.length} frecuentes` : `Convierte a ${newCustomers.length} nuevos en recurrentes`}</h3><p>{recoverable.length ? 'Llevan entre 31 y 60 días sin volver: todavía conocen tu negocio y son el grupo más lógico para contactar primero.' : frequent.length ? 'Ya demostraron que regresan. Una recompensa pequeña puede reforzar el hábito.' : 'El segundo regreso es la señal que empieza a convertir una visita aislada en relación.'}</p><a href="/dashboard/intelligence?view=customers">Ver lista de clientes →</a></article>
            <article className={styles.messageCard}><span className={styles.step}>02 · QUÉ DECIR</span><h3>Mensaje sugerido</h3><blockquote>“{campaignMessage}”</blockquote><small>Personalízalo antes de enviarlo. Intelligence no envía mensajes sin tu aprobación.</small></article>
            <article><span className={styles.step}>03 · QUÉ MEDIR</span><h3>Busca una segunda visita</h3><p>Registra las visitas después de la campaña. Intelligence podrá comparar cuántos regresaron y ajustar la siguiente recomendación.</p><div className={styles.planMetric}><b>{retention}%</b><span>retención observada hoy</span></div></article></div>
          </section>
          <section className={styles.metrics}><article className={styles.card}><span>Clientes activos</span><strong>{activeCustomers}</strong><small>Visita en últimos 30 días</small></article><article className={styles.card}><span>Visitas en 30 días</span><strong>{visits30}</strong><small className={change >= 0 ? styles.good : styles.warn}>{change >= 0 ? '+' : ''}{change}% vs. periodo anterior</small></article><article className={styles.card}><span>En riesgo recuperable</span><strong>{recoverable.length}</strong><small>31–60 días sin volver</small></article><article className={styles.card}><span>Premios disponibles</span><strong>{availableRewards}</strong><small>Motivos para regresar</small></article></section>
        </>}
        {view === 'opportunities' && <section className={styles.grid}><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.label}>OPORTUNIDADES</span><h2>Acciones que puedes tomar hoy</h2></div></div><div className={styles.insight}><span className={styles.label}>RECUPERACIÓN</span><h3>{atRisk.length ? `${atRisk.length} clientes llevan más de 30 días sin volver` : 'No hay clientes en riesgo detectados'}</h3><p>{atRisk.length ? 'Contacta primero a quienes ya visitaron tu negocio. Intelligence los separa para que no tengas que revisar cliente por cliente.' : 'Mantén el registro de visitas activo para detectar automáticamente cuándo cambia este segmento.'}</p><a className={styles.action} href={atRisk.length ? '/dashboard/intelligence?view=customers' : '/dashboard/points?view=visits'}><span>Siguiente paso</span><b>{atRisk.length ? 'Abrir clientes analizados →' : 'Registrar actividad →'}</b></a></div></article><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.label}>FIDELIZACIÓN</span><h2>Clientes frecuentes</h2></div></div><div className={styles.insight}><h3>{frequent.length} clientes ya muestran recurrencia</h3><p>Son una buena base para recompensas, beneficios y campañas de regreso sin tratar a todos tus clientes igual.</p><a className={styles.action} href="/dashboard/intelligence?view=customers"><span>Señal</span><b>Explorar {frequent.length} frecuentes →</b></a></div></article><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.label}>CRECIMIENTO</span><h2>Actividad del negocio</h2></div></div><div className={styles.insight}><h3>{change >= 0 ? 'La actividad reciente está creciendo' : 'La actividad reciente bajó'}</h3><p>Registraste {visits30} visitas en los últimos 30 días, un {Math.abs(change)}% {change >= 0 ? 'más' : 'menos'} que en el periodo anterior.</p><div className={styles.action}><span>Prioridad</span><b>{change < 0 ? 'Reactivar clientes antes de buscar volumen nuevo' : 'Aprovechar el crecimiento para aumentar recurrencia'}</b></div></div></article></section>}
        {view === 'customers' && <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.label}>CLIENTES ANALIZADOS</span><h2>Riesgo, recurrencia y frecuencia</h2></div><a href="/dashboard/intelligence">Volver al resumen</a></div>{!customers.length ? <div className={styles.empty}>Todavía no hay actividad suficiente para analizar clientes.</div> : <div className={styles.table}>{customers.sort((a,b)=>(b.daysSince ?? -1)-(a.daysSince ?? -1)).map(customer=><article className={styles.row} key={customer.id}><div className={styles.identity}><strong>{customer.name}</strong><small>{customer.phone ?? customer.email ?? 'Sin contacto guardado'}</small></div><span className={customer.status === 'En riesgo' ? styles.risk : undefined}>{customer.status}</span><span>{customer.visits} visitas</span><span>{customer.frequency ? `Cada ${customer.frequency} días` : customer.lastVisit ? 'Primera visita' : 'Sin visitas'}</span></article>)}</div>}</section>}
        {view === 'imports' && <><section className={styles.panel}><div className={styles.importBox}><div><span className={styles.label}>CENTRO DE IMPORTACIÓN</span><h2>Trae tus clientes sin capturarlos uno por uno</h2><p>Se preparó el flujo para Excel, CSV y bases exportadas. La validación y el guardado seguro serán el siguiente paso técnico.</p></div><div className={styles.importButtons}><span>Excel .xlsx</span><span>CSV</span><span>Registro manual</span></div></div></section><section className={styles.tools}><article className={`${styles.tool} ${styles.disabled}`}><b>1. Sube tu archivo</b><p>Selecciona una hoja con nombre y al menos un dato de contacto.</p><span>Interfaz preparada</span></article><article className={`${styles.tool} ${styles.disabled}`}><b>2. Revisa las columnas</b><p>Relaciona nombre, teléfono, correo y fecha de última visita.</p><span>Próximo paso</span></article><article className={`${styles.tool} ${styles.disabled}`}><b>3. Confirma la importación</b><p>Detecta duplicados antes de guardar nuevos clientes.</p><span>Próximo paso</span></article></section></>}
        {view === 'assistant' && <section className={styles.grid}><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.label}>ASISTENTE NIVAL</span><h2>Pregunta con base en la actividad del negocio</h2></div></div><p className={styles.muted}>Ejemplos: “¿Cuántos clientes están en riesgo?”, “¿Quiénes vienen más veces al mes?” o “¿Qué debería hacer hoy?”.</p><div className={styles.chat}><input aria-label="Pregunta para el asistente" placeholder="Escribe una pregunta sobre tu negocio" disabled/><button type="button" disabled>Preguntar</button></div><p className={styles.sourceNote}>La interfaz está lista. Aún no responde para no simular una IA sin conexión segura a tus datos.</p></article><aside className={styles.panel}><span className={styles.label}>DATOS DISPONIBLES</span><div className={styles.segments}><div className={styles.segment}><span>Clientes</span><b>{customers.length}</b></div><div className={styles.segment}><span>Visitas</span><b>{visits.length}</b></div><div className={styles.segment}><span>Recompensas</span><b>{(rewardRows ?? []).length}</b></div></div></aside></section>}
      </div>}
    </div>
  </main>;
}
