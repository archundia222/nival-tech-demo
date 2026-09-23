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
  const slipping = customers.filter((customer) => customer.frequency && customer.daysSince !== null && customer.daysSince > customer.frequency * 1.5 && customer.daysSince <= 30);
  const frequentAtRisk = atRisk.filter((customer) => customer.visits >= 3);
  const contactableRisk = recoverable.filter((customer) => customer.phone || customer.email);
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
          <section className={styles.solutionHero}><div><span className={styles.eyebrow}>NIVAL INTELLIGENCE · PLAN DE ACCIÓN</span><h1>{recoverable.length ? `Hoy puedes intentar recuperar ${recoverable.length} clientes.` : frequent.length ? `Hoy puedes fortalecer a ${frequent.length} clientes frecuentes.` : 'Hoy toca convertir visitas en clientes que regresan.'}</h1><p>Nival ya revisó la actividad. No necesitas interpretar gráficas ni buscar patrones: aquí tienes la acción más útil para hacer hoy.</p></div><div className={styles.solutionImpact}><small>OBJETIVO</small><strong>{recoverable.length ? 'Recuperar' : frequent.length ? 'Fidelizar' : 'Repetir'}</strong><span>{recoverable.length || frequent.length || newCustomers.length} clientes detectados</span></div></section>
          <section className={styles.actionMission}>
            <div className={styles.missionHeader}><div><span className={styles.label}>MISIÓN DE HOY</span><h2>{recoverable.length ? 'Trae de vuelta a clientes que ya te conocen' : frequent.length ? 'Haz que tus mejores clientes se sientan reconocidos' : 'Consigue la segunda visita'}</h2></div><span className={styles.timePill}>≈ 5 min</span></div>
            <div className={styles.missionFlow}>
              <article><span className={styles.step}>1 · NIVAL ENCONTRÓ</span><strong>{recoverable.length || frequent.length || newCustomers.length}</strong><h3>{recoverable.length ? 'clientes recuperables' : frequent.length ? 'clientes frecuentes' : 'clientes nuevos'}</h3><p>{recoverable.length ? 'Ya compraron antes y llevan entre 31 y 60 días sin volver.' : frequent.length ? 'Ya demostraron recurrencia. Son los clientes que más conviene cuidar.' : 'Solo han registrado una visita. El objetivo es provocar la segunda.'}</p><a href="/dashboard/intelligence?view=customers">Ver exactamente quiénes son →</a></article>
              <article className={styles.messageCard}><span className={styles.step}>2 · NIVAL PROPONE</span><h3>Envía este mensaje</h3><blockquote>“{campaignMessage}”</blockquote><div className={styles.channelHint}>Úsalo por WhatsApp, SMS o el canal que ya utilices.</div></article>
              <article><span className={styles.step}>3 · NIVAL MEDIRÁ</span><h3>¿Funcionó?</h3><p>Cuando vuelvan a registrar una visita, Nival podrá reconocer el regreso y usar ese resultado para mejorar la siguiente estrategia.</p><div className={styles.outcome}><strong>{retention}%</strong><span>de tus clientes actuales ya han regresado al menos una vez</span></div></article>
            </div>
          </section>
          <section className={styles.nextActions}><div className={styles.sectionIntro}><span className={styles.label}>DESPUÉS DE ESO</span><h2>Nival ya encontró las siguientes acciones</h2></div>
            <div className={styles.solutionCards}>
              <a href="/dashboard/intelligence?view=customers"><small>RECUPERAR</small><strong>{frequentAtRisk.length ? `${frequentAtRisk.length} clientes valiosos se están alejando` : `${contactableRisk.length} clientes en riesgo tienen contacto`}</strong><span>{frequentAtRisk.length ? 'Prioriza a quienes antes regresaban seguido.' : 'Ya puedes contactarlos sin revisar toda tu base.'}</span><b>Resolver →</b></a>
              <a href="/dashboard/intelligence?view=opportunities"><small>ANTICIPAR</small><strong>{slipping.length ? `${slipping.length} clientes rompieron su hábito` : 'Sin hábitos rotos detectados'}</strong><span>{slipping.length ? 'Nival los detectó antes de que se vuelvan inactivos.' : 'Seguiremos vigilando la frecuencia automáticamente.'}</span><b>Ver señal →</b></a>
              <a href="/dashboard/intelligence?view=customers"><small>FIDELIZAR</small><strong>{frequent.length ? `${frequent.length} clientes merecen trato especial` : 'Aún construyendo clientes frecuentes'}</strong><span>{frequent.length ? 'Crea una razón para que mantengan su hábito.' : 'Nival detectará este grupo conforme regresen.'}</span><b>Ver clientes →</b></a>
            </div>
          </section>
          <section className={styles.backgroundSignals}><div><span>En riesgo</span><b>{atRisk.length}</b></div><div><span>Frecuentes</span><b>{frequent.length}</b></div><div><span>Inactivos</span><b>{inactive.length}</b></div><div><span>Nuevos</span><b>{newCustomers.length}</b></div><p>Estas cifras alimentan las soluciones de arriba. No necesitas analizarlas para usar Intelligence.</p></section>
        </>}
        {view === 'opportunities' && <section className={styles.grid}><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.label}>OPORTUNIDADES</span><h2>Clientes y acciones con mayor impacto</h2></div></div><div className={styles.insight}><span className={styles.label}>RECUPERACIÓN</span><h3>{frequentAtRisk.length ? `${frequentAtRisk.length} clientes frecuentes necesitan recuperación` : atRisk.length ? `${atRisk.length} clientes llevan más de 30 días sin volver` : 'No hay clientes en riesgo detectados'}</h3><p>{atRisk.length ? 'Contacta primero a quienes ya visitaron tu negocio. Intelligence los separa para que no tengas que revisar cliente por cliente.' : 'Mantén el registro de visitas activo para detectar automáticamente cuándo cambia este segmento.'}</p><a className={styles.action} href={atRisk.length ? '/dashboard/intelligence?view=customers' : '/dashboard/points?view=visits'}><span>Siguiente paso</span><b>{atRisk.length ? 'Abrir clientes analizados →' : 'Registrar actividad →'}</b></a></div></article><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.label}>FIDELIZACIÓN</span><h2>Clientes frecuentes</h2></div></div><div className={styles.insight}><h3>{frequent.length} clientes ya muestran recurrencia</h3><p>Son una buena base para recompensas, beneficios y campañas de regreso sin tratar a todos tus clientes igual.</p><a className={styles.action} href="/dashboard/intelligence?view=customers"><span>Señal</span><b>Explorar {frequent.length} frecuentes →</b></a></div></article><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.label}>CRECIMIENTO</span><h2>Actividad del negocio</h2></div></div><div className={styles.insight}><h3>{change >= 0 ? 'La actividad reciente está creciendo' : 'La actividad reciente bajó'}</h3><p>Registraste {visits30} visitas en los últimos 30 días, un {Math.abs(change)}% {change >= 0 ? 'más' : 'menos'} que en el periodo anterior.</p><div className={styles.action}><span>Prioridad</span><b>{change < 0 ? 'Reactivar clientes antes de buscar volumen nuevo' : 'Aprovechar el crecimiento para aumentar recurrencia'}</b></div></div></article></section>}
        {view === 'customers' && <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.label}>CLIENTES ANALIZADOS</span><h2>Riesgo, recurrencia y frecuencia</h2></div><a href="/dashboard/intelligence">Volver al resumen</a></div>{!customers.length ? <div className={styles.empty}>Todavía no hay actividad suficiente para analizar clientes.</div> : <div className={styles.table}>{customers.sort((a,b)=>(b.daysSince ?? -1)-(a.daysSince ?? -1)).map(customer=><article className={styles.row} key={customer.id}><div className={styles.identity}><strong>{customer.name}</strong><small>{customer.phone ?? customer.email ?? 'Sin contacto guardado'}</small></div><span className={customer.status === 'En riesgo' ? styles.risk : undefined}>{customer.status}</span><span>{customer.visits} visitas</span><span>{customer.frequency ? `Cada ${customer.frequency} días` : customer.lastVisit ? 'Primera visita' : 'Sin visitas'}</span></article>)}</div>}</section>}
        {view === 'imports' && <><section className={styles.panel}><div className={styles.importBox}><div><span className={styles.label}>CENTRO DE IMPORTACIÓN</span><h2>Trae tus clientes sin capturarlos uno por uno</h2><p>Se preparó el flujo para Excel, CSV y bases exportadas. La validación y el guardado seguro serán el siguiente paso técnico.</p></div><div className={styles.importButtons}><span>Excel .xlsx</span><span>CSV</span><span>Registro manual</span></div></div></section><section className={styles.tools}><article className={`${styles.tool} ${styles.disabled}`}><b>1. Sube tu archivo</b><p>Selecciona una hoja con nombre y al menos un dato de contacto.</p><span>Interfaz preparada</span></article><article className={`${styles.tool} ${styles.disabled}`}><b>2. Revisa las columnas</b><p>Relaciona nombre, teléfono, correo y fecha de última visita.</p><span>Próximo paso</span></article><article className={`${styles.tool} ${styles.disabled}`}><b>3. Confirma la importación</b><p>Detecta duplicados antes de guardar nuevos clientes.</p><span>Próximo paso</span></article></section></>}
        {view === 'assistant' && <section className={styles.grid}><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.label}>ASISTENTE NIVAL</span><h2>Pregunta con base en la actividad del negocio</h2></div></div><p className={styles.muted}>Ejemplos: “¿Cuántos clientes están en riesgo?”, “¿Quiénes vienen más veces al mes?” o “¿Qué debería hacer hoy?”.</p><div className={styles.chat}><input aria-label="Pregunta para el asistente" placeholder="Escribe una pregunta sobre tu negocio" disabled/><button type="button" disabled>Preguntar</button></div><p className={styles.sourceNote}>La interfaz está lista. Aún no responde para no simular una IA sin conexión segura a tus datos.</p></article><aside className={styles.panel}><span className={styles.label}>DATOS DISPONIBLES</span><div className={styles.segments}><div className={styles.segment}><span>Clientes</span><b>{customers.length}</b></div><div className={styles.segment}><span>Visitas</span><b>{visits.length}</b></div><div className={styles.segment}><span>Recompensas</span><b>{(rewardRows ?? []).length}</b></div></div></aside></section>}
      </div>}
    </div>
  </main>;
}
