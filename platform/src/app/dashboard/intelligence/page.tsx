import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNavigation } from '../dashboard-navigation';
import { reconcileLatestSubscription } from '@/lib/reconcile-subscription';
import { ProductInteractiveDemo } from '../product-interactive-demo';
import { saveAverageTicket, startIntelligenceCampaign, startIntelligenceMeasurement } from './actions';
import { activateFreeNivalIntelligence } from './free-actions';
import styles from './intelligence-dashboard.module.css';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { NIVAL_GROWTH_PRICE_CENTS, NIVAL_POINTS_FOUNDER_PRICE_CENTS, NIVAL_TRIAL_DAYS, mxn } from '@/lib/commercial';
import { startNivalGrowthSubscription } from '@/app/checkout/actions';
import { CheckoutSubmitButton } from '@/app/checkout/submit-button';
import { PaymentStatusPoller } from '@/app/checkout/payment-status-poller';

type Visit = { customer_id: string; visited_at: string };
type Sale = { customer_id: string | null; amount_cents: number; sold_at: string };
type Campaign = { id: string; name: string; audience_rule: unknown; message: string; status: string; sent_at: string | null; created_at: string };

export default async function NivalIntelligencePage({ searchParams }: { searchParams: Promise<{ error?: string; subscription?: string; view?: string; campaign?: string; ticket?: string; question?: string; free?: string; saved?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fintelligence');
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect('/dashboard');
  await reconcileLatestSubscription(membership.business_id);
  const { data: business } = await supabase.from('businesses')
    .select('name, product_level, average_ticket_cents')
    .eq('id', membership.business_id)
    .maybeSingle();
  if (!business) redirect('/dashboard');
  const { data: entitlements } = await supabase.from('business_product_entitlements').select('product_code,status,current_period_end').eq('business_id', membership.business_id);
  const entitlementMap = new Map((entitlements ?? []).map((item) => [item.product_code, item]));
  const pointsEntitlement = entitlementMap.get('nival_points');
  const intelligenceEntitlement = entitlementMap.get('nival_intelligence');
  const pointsStatus = pointsEntitlement?.status;
  const intelligenceStatus = intelligenceEntitlement?.status;
  const growthCheckoutCents = pointsStatus === 'active'
    ? NIVAL_GROWTH_PRICE_CENTS - NIVAL_POINTS_FOUNDER_PRICE_CENTS
    : NIVAL_GROWTH_PRICE_CENTS;
  const growthCheckoutLabel = pointsStatus === 'active'
    ? `Subir a Growth · +${mxn(growthCheckoutCents)}/mes`
    : `Activar Growth · ${mxn(growthCheckoutCents)}/mes`;
  const hasPoints = pointsStatus === 'active' || pointsStatus === 'free' || business?.product_level === 'intelligence';
  const paid = intelligenceStatus === 'active' || business?.product_level === 'intelligence';
  const freePlan = !paid && intelligenceStatus === 'free';
  // eslint-disable-next-line react-hooks/purity -- Server-rendered request snapshot for trial countdown and analysis.
  const now = Date.now();
  const trialEnd = freePlan && intelligenceEntitlement?.current_period_end ? new Date(intelligenceEntitlement.current_period_end).getTime() : 0;
  const trialActive = freePlan && trialEnd > now;
  const trialDaysLeft = trialActive ? Math.max(1, Math.ceil((trialEnd - now) / 86400000)) : 0;
  const baseFree = freePlan && !trialActive;
  const available = paid || freePlan;
  const view = params.view ?? 'overview';
  if (view === 'imports') redirect('/dashboard/intelligence');
  const navActive = view === 'risk' ? 'inteligencia-riesgo' : view === 'inactive' ? 'inteligencia-inactivos' : view === 'recurring' ? 'inteligencia-recurrentes' : view === 'campaigns' ? 'inteligencia-campanas' : view === 'impact' ? 'inteligencia-impacto' : view === 'assistant' ? 'inteligencia-asistente' : 'inteligencia';

  const [{ data: customerRows }, { data: visitRows }, { data: rewardRows }, { data: campaignRows }, { data: saleRows }] = available && hasPoints ? await Promise.all([
    supabase.from('customers').select('id,name,phone,email,marketing_consent_at,created_at,loyalty_accounts!inner(id)').eq('business_id', membership.business_id).order('created_at',{ascending:false}).limit(500),
    supabase.from('visits').select('customer_id,visited_at').eq('business_id', membership.business_id).order('visited_at',{ascending:false}).limit(5000),
    supabase.from('loyalty_rewards').select('customer_id,redeemed_at').eq('business_id', membership.business_id).limit(3000),
    supabase.from('campaigns').select('id,name,audience_rule,message,status,sent_at,created_at').eq('business_id', membership.business_id).order('created_at',{ascending:false}).limit(20),
    supabase.from('business_sales').select('customer_id,amount_cents,sold_at').eq('business_id', membership.business_id).not('customer_id','is',null).order('sold_at',{ascending:false}).limit(5000),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

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
    const cadenceLate = frequency !== null && daysSince !== null && daysSince > Math.max(14, Math.round(frequency * 1.5));
    const status = daysSince === null || customerVisits.length <= 1
      ? 'Nuevo'
      : daysSince > 60
        ? 'Inactivo'
        : daysSince > 30 || cadenceLate
          ? 'En riesgo'
          : customerVisits.length >= 3
            ? 'Frecuente'
            : 'Activo';
    return { ...customer, visits: customerVisits.length, lastVisit, daysSince, frequency, cadenceLate, status };
  });
  const visits30 = visits.filter((visit) => now - new Date(visit.visited_at).getTime() <= 30 * day).length;
  const previous30 = visits.filter((visit) => { const age = now - new Date(visit.visited_at).getTime(); return age > 30 * day && age <= 60 * day; }).length;
  const change = previous30 ? Math.round(((visits30 - previous30) / previous30) * 100) : visits30 ? 100 : 0;
  const atRisk = customers.filter((customer) => customer.status === 'En riesgo');
  const inactive = customers.filter((customer) => customer.status === 'Inactivo');
  const frequent = customers.filter((customer) => customer.status === 'Frecuente');
  const newCustomers = customers.filter((customer) => customer.visits <= 1);
  const recoverable = atRisk.filter((customer) => customer.daysSince !== null && customer.daysSince <= 60);
  const highValueRisk = atRisk.filter((customer) => customer.visits >= 3);
  const slipping = customers.filter((customer) => customer.frequency && customer.daysSince !== null && customer.daysSince > customer.frequency * 1.5 && customer.daysSince <= 30);
  const frequentAtRisk = atRisk.filter((customer) => customer.visits >= 3);
  const contactableRisk = recoverable.filter((customer) => (customer.phone || customer.email) && customer.marketing_consent_at);
  const inactiveContacts = inactive.filter((customer) => (customer.phone || customer.email) && customer.marketing_consent_at);
  const inactiveTop = inactiveContacts.sort((a,b) => b.visits - a.visits).slice(0,5);
  const priorityAudience = frequentAtRisk.length ? frequentAtRisk : recoverable.length ? recoverable : frequent.length ? frequent : newCustomers;
  const priorityContacts = priorityAudience.filter((customer) => (customer.phone || customer.email) && customer.marketing_consent_at);
  const topPriority = priorityContacts.slice(0, 5);
  const pointsCustomers = customers.filter((customer) => customer.visits >= 2);
  const secondVisitOpportunity = newCustomers.filter((customer) => customer.visits === 1 && customer.daysSince !== null && customer.daysSince <= 21);
  const loyaltyOpportunity = frequent.filter((customer) => customer.visits >= 4);
  const unreachableRisk = recoverable.filter((customer) => !(customer.phone || customer.email) || !customer.marketing_consent_at);
  const actionScore = priorityAudience.length ? Math.round((priorityContacts.length / priorityAudience.length) * 100) : 0;
  const priorityLabel = frequentAtRisk.length ? 'clientes frecuentes que se están alejando' : recoverable.length ? 'clientes que puedes recuperar' : frequent.length ? 'clientes frecuentes' : 'clientes nuevos';
  const nextBestAction = frequentAtRisk.length ? 'Recuperarlos antes de ofrecer promociones a clientes nuevos' : recoverable.length ? 'Lanzar una campaña de regreso' : frequent.length ? 'Darles un beneficio exclusivo para reforzar el hábito' : 'Provocar una segunda visita';
  const businessName = business?.name ?? 'nuestro negocio';
  const campaignMessage = recoverable.length
    ? `Hola {{nombre}} 👋 hace rato que no te vemos por ${businessName}. Esta semana queremos consentir a algunos clientes que ya nos conocen. Si te das una vuelta, enséñanos este mensaje y te contamos lo que preparamos para ti. ¿Te vemos pronto?`
    : frequent.length
      ? `Hola {{nombre}} 🙌 nos dimos cuenta de que eres de las personas que más regresan a ${businessName} y queríamos agradecértelo. En tu próxima visita queremos tener un detalle contigo. Cuando vengas, enséñanos este mensaje 😊`
      : `Hola {{nombre}} 👋 gracias por haber venido a ${businessName}. Nos dio gusto recibirte. Si vuelves esta semana, dinos que recibiste este mensaje; queremos darte una buena razón para que esta no sea tu única visita 😊`;
  const inactiveMessage = `Hola {{nombre}} 👋 hace tiempo que no te vemos por ${businessName}. No queremos llenarte de promociones; solo queríamos invitarte a volver cuando te haga sentido. Si vienes de nuevo, enséñanos este mensaje y nos dará gusto recibirte otra vez.`;
  const alternateMessage = recoverable.length
    ? `Hola {{nombre}}, ¿cómo estás? Hace un rato que no coincides con nosotros en ${businessName} y queríamos invitarte a volver. Si tienes chance esta semana, nos encantará verte otra vez 🙌`
    : frequent.length
      ? `{{nombre}}, gracias por seguir regresando a ${businessName} ❤️ clientes como tú son los que hacen crecer el negocio. Queremos agradecerte en tu próxima visita.`
      : `Hola {{nombre}} 😊 ¿cómo te fue en tu primera visita a ${businessName}? Nos gustaría verte otra vez. Si vuelves pronto, cuéntanos que recibiste este mensaje.`;
  const activeCustomers = customers.filter((customer) => customer.daysSince !== null && customer.daysSince <= 30).length;
  const availableRewards = (rewardRows ?? []).filter((reward) => !reward.redeemed_at).length;
  const redeemedRewards = (rewardRows ?? []).filter((reward) => reward.redeemed_at).length;
  const retention = customers.length ? Math.round((customers.filter(c => c.visits >= 2).length / customers.length) * 100) : 0;
  const averageTicketCents = Number(business?.average_ticket_cents ?? 0);
  const linkedSales = (saleRows ?? []) as Sale[];
  const campaigns = (campaignRows ?? []) as Campaign[];
  const campaignStats = campaigns.filter((campaign) => campaign.status === 'sent' && campaign.sent_at).map((campaign) => {
    const rule = campaign.audience_rule && typeof campaign.audience_rule === 'object' ? campaign.audience_rule as Record<string, unknown> : {};
    const ids = Array.isArray(rule.customer_ids) ? rule.customer_ids.map(String) : [];
    const sentAt = new Date(campaign.sent_at as string).getTime();
    const windowEnd = sentAt + 30 * day;
    const returnedIds = new Set(visits.filter((visit) => ids.includes(visit.customer_id)).filter((visit) => {
      const visitAt = new Date(visit.visited_at).getTime();
      return visitAt > sentAt && visitAt <= windowEnd;
    }).map((visit) => visit.customer_id));
    const observedSales = linkedSales.filter((sale) => sale.customer_id && ids.includes(sale.customer_id)).filter((sale) => {
      const saleAt = new Date(sale.sold_at).getTime();
      return saleAt > sentAt && saleAt <= windowEnd;
    });
    const observedSalesCents = observedSales.reduce((sum, sale) => sum + Number(sale.amount_cents || 0), 0);
    const observedBuyerCount = new Set(observedSales.map((sale) => sale.customer_id).filter(Boolean)).size;
    return {
      ...campaign,
      audience: ids.length,
      returned: returnedIds.size,
      rate: ids.length ? Math.round((returnedIds.size / ids.length) * 100) : 0,
      observedSalesCents,
      observedSalesCount: observedSales.length,
      observedBuyerCount,
    };
  });
  const preparedCampaign = campaigns.find((campaign) => campaign.status === 'approved' && !campaign.sent_at) ?? null;
  const preparedRule = preparedCampaign?.audience_rule && typeof preparedCampaign.audience_rule === 'object'
    ? preparedCampaign.audience_rule as Record<string, unknown>
    : {};
  const preparedAudienceCount = Array.isArray(preparedRule.customer_ids) ? preparedRule.customer_ids.length : 0;
  const latestCampaign = campaignStats[0] ?? null;
  const latestEstimatedValueCents = latestCampaign && averageTicketCents ? latestCampaign.returned * averageTicketCents : 0;
  const latestObservedSalesCents = latestCampaign?.observedSalesCents ?? 0;
  const latestHasObservedSales = latestObservedSalesCents > 0;
  const opportunityValueCents = averageTicketCents ? priorityAudience.length * averageTicketCents : 0;
  const dataConfidence = visits.length >= 40 && customers.length >= 15 ? 'Alta' : visits.length >= 15 && customers.length >= 6 ? 'Media' : 'Inicial';
  const dataConfidenceText = dataConfidence === 'Alta'
    ? 'Hay suficiente actividad para comparar hábitos con más confianza.'
    : dataConfidence === 'Media'
      ? 'Ya hay patrones útiles, pero seguir registrando visitas mejora la precisión.'
      : 'Las recomendaciones son tempranas; Nival las ajustará conforme acumules más visitas.';
  const campaignLearning = !latestCampaign ? null
    : latestCampaign.audience < 3 ? 'La audiencia aún es pequeña. Reúne más casos antes de sacar conclusiones.'
    : latestCampaign.rate >= 30 ? 'La señal es buena: prueba una campaña similar con otro grupo comparable antes de cambiar la estrategia.'
    : latestCampaign.rate >= 10 ? 'Hubo respuesta, pero todavía hay margen. Prueba un mensaje o beneficio diferente y compara.'
    : 'La respuesta fue baja. No repitas exactamente lo mismo: cambia el mensaje, el beneficio o el momento y vuelve a medir.';
  const messageForCustomer = (customer: typeof customers[number]) => {
    const name = customer.name || 'Hola';
    if (customer.status === 'Inactivo') {
      return `Hola ${name} 👋 hace tiempo que no te vemos por ${businessName}. Solo queríamos saludarte e invitarte a volver cuando te haga sentido. Si te das una vuelta, enséñanos este mensaje; nos dará gusto recibirte otra vez.`;
    }
    if (customer.visits >= 3 && customer.daysSince !== null && customer.daysSince > 30) {
      return `Hola ${name} 👋 siempre nos da gusto verte en ${businessName}. Hace unas semanas que no coincidimos y queríamos invitarte a volver. Si te das una vuelta estos días, enséñanos este mensaje; queremos tener un detalle contigo 😊`;
    }
    if (customer.visits >= 2 && customer.daysSince !== null && customer.daysSince > 30) {
      return `Hola ${name} 👋 ¿cómo estás? Hace rato que no te vemos por ${businessName}. Nos acordamos de ti y nos encantaría recibirte otra vez. Si vienes esta semana, enséñanos este mensaje 🙌`;
    }
    if (customer.visits === 1) {
      return `Hola ${name} 😊 gracias por tu primera visita a ${businessName}. Nos gustaría verte otra vez. Si vuelves pronto, cuéntanos que recibiste este mensaje; queremos hacer que la segunda visita valga la pena.`;
    }
    return `Hola ${name} 🙌 gracias por seguir regresando a ${businessName}. Queríamos reconocértelo: en tu próxima visita enséñanos este mensaje porque queremos tener un detalle contigo.`;
  };
  const contactHref = (customer: typeof customers[number]) => {
    const message = encodeURIComponent(messageForCustomer(customer));
    if (customer.phone) {
      const digits = customer.phone.replace(/\D/g, '');
      const whatsappNumber = digits.length === 10 ? `52${digits}` : digits;
      return `https://wa.me/${whatsappNumber}?text=${message}`;
    }
    if (customer.email) return `mailto:${customer.email}?subject=${encodeURIComponent(businessName)}&body=${message}`;
    return '#';
  };
  const question = (params.question ?? '').trim().toLowerCase();
  const assistantAnswer = !question ? null
    : /inactiv|dejaron|mucho tiempo|se enfri/.test(question) ? (inactive.length ? `Tienes ${inactive.length} clientes con más de 60 días sin volver. Yo empezaría por ${inactiveTop.filter(customer => customer.visits >= 3).length || inactiveTop.length} que antes tuvieron más relación con el negocio; ${inactiveContacts.length} tienen contacto y consentimiento.` : 'No detecto clientes inactivos por ahora. Conviene enfocarse en quienes están en riesgo antes de que se enfríen.')
    : /riesgo|perdiendo|volver|recuper/.test(question) ? (recoverable.length ? `Yo empezaría por ${frequentAtRisk.length || recoverable.length} clientes que ya conocen tu negocio. ${priorityContacts.length} tienen contacto y consentimiento para una campaña. Mi recomendación es recuperación antes de invertir en adquisición nueva.` : inactive.length ? `No veo una ventana clara de riesgo reciente, pero sí ${inactive.length} clientes inactivos. Conviene revisar Inactivos y priorizar a quienes antes regresaban más.` : 'No detecto ahora un grupo claro de recuperación. Me enfocaría en provocar segundas visitas y proteger a los frecuentes.')
    : /frecuent|mejor|vip|leal/.test(question) ? (frequent.length ? `Tienes ${frequent.length} clientes frecuentes y ${loyaltyOpportunity.length} ya acumulan 4 o más visitas. A ellos les conviene reconocimiento o un beneficio especial, no una promoción masiva.` : 'Todavía no hay un grupo frecuente fuerte. El objetivo inmediato debería ser conseguir segundas y terceras visitas.')
    : /campaña|promoci|mensaje/.test(question) ? `La campaña que más sentido tiene ahora es: ${recoverable.length ? 'recuperación' : frequent.length ? 'beneficio VIP' : 'segunda visita'}. Audiencia útil: ${priorityContacts.length} clientes con contacto y consentimiento.`
    : /dinero|venta|resultado|funcion/.test(question) ? (latestCampaign ? `La campaña más reciente tiene ${latestCampaign.returned} regresos posteriores de ${latestCampaign.audience} clientes objetivo (${latestCampaign.rate}%).${latestHasObservedSales ? ` Además hay ${(latestObservedSalesCents / 100).toLocaleString('es-MX')} MXN en ventas registradas después entre clientes de esa audiencia; es dinero observado, no ingreso atribuido causalmente a la campaña.` : averageTicketCents ? ` Con tu ticket promedio, esas visitas representan aproximadamente ${(latestEstimatedValueCents / 100).toLocaleString('es-MX')} MXN en valor estimado.` : ' Si registras ventas por cliente o agregas tu ticket promedio en Resultados, Nival puede traducir esos regresos a valor.'}` : `En los últimos 30 días Nival Puntos registró ${visits30} visitas. Todavía no hay una campaña medida; inicia una desde Campañas para observar quién vuelve después.`)
    : `La acción que priorizaría hoy es: ${nextBestAction}. La audiencia principal es de ${priorityAudience.length} clientes y ${priorityContacts.length} están listos para contacto.`;

  return <main className="dashboardApp nivalDashboard">
    <PaymentStatusPoller active={params.subscription === 'return' && !paid} />
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active={navActive} />
    <div className={`dashboardContent ${!available ? 'nivalIntelligenceDark' : ''}`}>
      <header className="dashboardContentTopbar"><div><span>Nival Intelligence</span><b>Herramienta incluida en Nival Growth</b></div><span className="ready">{paid ? 'Growth activo' : trialActive ? `Prueba · ${trialDaysLeft}d` : freePlan ? 'Vista gratis' : 'Desde Puntos'}</span></header>
      {params.error && <p className="formMessage errorMessage">{params.error}</p>}
      {params.subscription && <p className="formMessage">{paid ? 'Suscripción confirmada. Nival Growth ya está activo.' : 'Estamos confirmando tu suscripción con Mercado Pago. No vuelvas a pagar mientras termina la validación.'}</p>}
      {!hasPoints ? <>
        <section className="productShowcase intelligenceShowcase">
          <div className="productShowcaseCopy">
            <span className="productPill">NIVAL INTELLIGENCE · DENTRO DE GROWTH</span>
            <h1>Primero crea la señal.<br/>Luego deja que Nival piense.</h1>
            <p>Intelligence trabaja a partir de los clientes y visitas que Nival Puntos registra automáticamente. No necesitas volver a capturar una base ni alimentar otro sistema.</p>
            <ul className="productBenefits">
              <li>Puntos registra clientes desde QR, NFC y tarjeta digital</li>
              <li>Intelligence detecta frecuentes, riesgo y oportunidades</li>
              <li>Las campañas se basan en comportamiento real del programa</li>
            </ul>
            <div className="freemiumCtas"><a className="productCta" href="/dashboard/points">Activar Nival Puntos primero <span>→</span></a></div>
          </div>
          <div className="intelligenceVisual"><div className="aiGlow"/><div className="aiPanel"><div className="aiPanelTop"><b>NIVAL <em>INTELLIGENCE</em></b><span>CONECTADO A PUNTOS</span></div><div className="aiInsight"><small>CUANDO HAYA ACTIVIDAD</small><strong>Nival convierte visitas en decisiones.</strong><p>Quién está regresando, quién se está alejando y qué acción tiene más sentido.</p></div></div></div>
        </section>
        <section className="productFeatureStrip darkFeatureStrip"><article><span>01</span><div><b>Puntos registra</b><p>El cliente se da de alta solo y cada visita queda guardada.</p></div></article><article><span>02</span><div><b>Intelligence entiende</b><p>Compara hábitos y detecta cambios sin pedirte capturas adicionales.</p></div></article><article><span>03</span><div><b>Tú actúas</b><p>Recibes audiencias, mensajes y acciones concretas para hacer que vuelvan.</p></div></article></section>
      </> : !available ? <>
        <section className="productShowcase intelligenceShowcase"><div className="productShowcaseCopy"><span className="productPill">NIVAL INTELLIGENCE · DENTRO DE GROWTH</span><h1>Puntos registra.<br/>Intelligence decide.</h1><p>Nival analiza automáticamente a los clientes y visitas de tu programa de fidelización para convertirlos en una acción concreta: a quién contactar, qué decir y qué medir después.</p><ul className="productBenefits"><li>Detecta clientes frecuentes y personas que se están alejando</li><li>Propone campañas según el comportamiento de Nival Puntos</li><li>Mide quién regresó y aprende del resultado</li></ul><div className="productPrice"><strong>{NIVAL_TRIAL_DAYS} días Pro</strong><span>después queda una vista gratuita de oportunidades</span></div><div className="freemiumCtas"><form action={activateFreeNivalIntelligence}><CheckoutSubmitButton className="productCta" pendingLabel="Activando prueba…">Probar Intelligence {NIVAL_TRIAL_DAYS} días <span>→</span></CheckoutSubmitButton></form><form action={startNivalGrowthSubscription}><CheckoutSubmitButton className="nvSecondaryButton" pendingLabel="Abriendo Mercado Pago…">{growthCheckoutLabel}</CheckoutSubmitButton></form></div><small>{pointsStatus === 'active' ? 'Ya pagas Puntos Pro: Growth solo agrega $250/mes, para un total de $449/mes.' : 'Growth cuesta $449/mes e incluye Puntos Pro + Intelligence.'}</small></div><div className="intelligenceVisual"><div className="aiGlow"/><div className="aiPanel"><div className="aiPanelTop"><b>NIVAL <em>INTELLIGENCE</em></b><span>HOY</span></div><div className="aiInsight"><small>HAZ ESTO PRIMERO</small><strong>Recupera a 8 clientes que antes regresaban seguido.</strong><p>Nival ya eligió la audiencia y preparó un mensaje de regreso.</p><button type="button">Abrir campaña →</button></div><div className="aiMiniGrid"><div><small>PUEDES CONTACTAR</small><b>6</b><i>ahora</i></div><div><small>OBJETIVO</small><b>Volver</b><i>30 días</i></div></div></div></div></section>
        <section className="productFeatureStrip darkFeatureStrip"><article><span>01</span><div><b>Detecta</b><p>Nival encuentra clientes que se están alejando, hábitos que cambiaron y oportunidades de segunda visita.</p></div></article><article><span>02</span><div><b>Actúa</b><p>Te dice con quién empezar y prepara una estrategia lista para ejecutar.</p></div></article><article><span>03</span><div><b>Aprende</b><p>Mide quién volvió después y usa el resultado para recomendar la siguiente acción.</p></div></article></section>
        <ProductInteractiveDemo mode="intelligence" />
      </> : baseFree ? <div className={styles.shell}>
        {params.free === 'started' && <p className="formMessage successMessage">La prueba de Intelligence ya está activa. Nival usará los clientes y visitas registrados en Puntos.</p>}
        <section className="freemiumBanner">
          <div><span>VISTA GRATUITA DE INTELLIGENCE</span><strong>Nival te muestra la oportunidad principal. Growth te ayuda a actuar.</strong><p>El plan gratuito conserva la lectura básica. Nival Growth reúne Puntos + Intelligence con audiencias, mensajes, campañas, seguimiento y resultados.</p></div>
          <form action={startNivalGrowthSubscription}><CheckoutSubmitButton className="nvPrimaryLink" pendingLabel="Abriendo Mercado Pago…">{growthCheckoutLabel} →</CheckoutSubmitButton></form>
        </section>
        <section className={styles.solutionHero}>
          <div><span className={styles.eyebrow}>NIVAL ENCONTRÓ ESTO</span><h1>{recoverable.length ? `${recoverable.length} clientes podrían estar alejándose.` : frequent.length ? `${frequent.length} clientes ya muestran recurrencia.` : secondVisitOpportunity.length ? `${secondVisitOpportunity.length} clientes están a tiempo de una segunda visita.` : 'Todavía necesitamos más actividad para detectar un patrón fuerte.'}</h1><p>{recoverable.length ? 'Recuperar clientes que ya te conocen suele ser una oportunidad más clara que empezar desde cero.' : frequent.length ? 'Tus clientes frecuentes son una base que conviene proteger antes de lanzar promociones generales.' : 'Sigue registrando visitas: Intelligence se vuelve más útil conforme entiende el comportamiento real.'}</p><div className={styles.decisionLine}><span>RECOMENDACIÓN GRATIS</span><strong>{nextBestAction}</strong><small>Nival actualiza esta lectura conforme cambian tus clientes y visitas.</small></div></div>
          <div className={styles.solutionImpact}><small>SEÑAL PRINCIPAL</small><strong>{recoverable.length || frequent.length || secondVisitOpportunity.length}</strong><span>{priorityLabel}</span></div>
        </section>
        <section className={styles.valuePromise}><div><small>CLIENTES</small><strong>{customers.length}</strong><span>registrados en Puntos</span></div><div><small>VISITAS · 30 DÍAS</small><strong>{visits30}</strong><span>actividad reciente</span></div><div><small>RECURRENCIA</small><strong>{retention}%</strong><span>han vuelto al menos una vez</span></div></section>
        <section className="freemiumLocked intelligenceFreeLock"><span>NIVAL GROWTH</span><h2>Nival ya sabe qué grupo revisar. Pro te dice exactamente con quién empezar.</h2><p>Desbloquea nombres, prioridad por cliente, mensajes personalizados, WhatsApp, campañas medibles, resultados e impacto estimado.</p><div className="freemiumPreviewRows"><div><b>Cliente prioritario</b><span>••••••••</span><em>🔒</em></div><div><b>Mensaje recomendado</b><span>Personalizado según recurrencia</span><em>🔒</em></div><div><b>Resultado de campaña</b><span>Quién volvió después</span><em>🔒</em></div></div><form action={startNivalGrowthSubscription}><CheckoutSubmitButton className="nvPrimaryLink" pendingLabel="Abriendo Mercado Pago…">{growthCheckoutLabel} →</CheckoutSubmitButton></form></section>
      </div> : <div className={styles.shell}>
        {trialActive && <section className="freemiumBanner"><div><span>PRUEBA DE INTELLIGENCE · {trialDaysLeft} {trialDaysLeft === 1 ? 'DÍA' : 'DÍAS'}</span><strong>Usa la experiencia completa antes de decidir.</strong><p>Al terminar, conservarás una vista gratuita. Intelligence se contrata dentro de Nival Growth.</p></div><form action={startNivalGrowthSubscription}><CheckoutSubmitButton className="nvPrimaryLink" pendingLabel="Abriendo Mercado Pago…">{growthCheckoutLabel} →</CheckoutSubmitButton></form></section>}
        {view === 'overview' && <>
          <section className={styles.solutionHero}><div><span className={styles.eyebrow}>HOY EN TU NEGOCIO</span><h1>{recoverable.length ? `Hoy puedes intentar recuperar ${recoverable.length} clientes.` : frequent.length ? `Hoy puedes fortalecer a ${frequent.length} clientes frecuentes.` : 'Hoy toca convertir visitas en clientes que regresan.'}</h1><p>Ya revisamos lo importante por ti. Esta es la acción que más sentido tiene hacer ahora.</p><div className={styles.decisionLine}><span>HAZ ESTO PRIMERO</span><strong>{nextBestAction}</strong><small>{priorityContacts.length} de {priorityAudience.length} clientes objetivo tienen contacto disponible</small></div></div><div className={styles.solutionImpact}><small>IMPACTO POTENCIAL</small><strong>{opportunityValueCents ? `~${(opportunityValueCents / 100).toLocaleString('es-MX')} MXN` : `${priorityAudience.length} clientes`}</strong><span>{opportunityValueCents ? 'si cada regreso se acerca a tu ticket promedio' : 'agrega tu ticket promedio para estimar valor'}</span><em>Señal {dataConfidence.toLowerCase()}</em></div></section>
          <section className={styles.valuePromise}><div><small>OPORTUNIDAD DE HOY</small><strong>{priorityAudience.length}</strong><span>{priorityLabel}</span></div><div><small>PRIORIDAD ALTA</small><strong>{highValueRisk.length}</strong><span>clientes recurrentes que cambiaron su hábito</span></div><div><small>PUEDES ACTUAR AHORA</small><strong>{priorityContacts.length}</strong><span>{actionScore}% de la audiencia tiene contacto y consentimiento</span></div></section><section className={styles.confidenceNote}><div><span>CALIDAD DE LA SEÑAL · {dataConfidence.toUpperCase()}</span><strong>{dataConfidenceText}</strong></div><a href="/dashboard/points?view=visits">Seguir registrando visitas →</a></section>
          <section className={styles.actionMission}>
            <div className={styles.missionHeader}><div><span className={styles.label}>PASO A PASO</span><h2>{recoverable.length ? 'Trae de vuelta a clientes que ya te conocen' : frequent.length ? 'Haz que tus mejores clientes se sientan reconocidos' : 'Consigue la segunda visita'}</h2></div><span className={styles.timePill}>≈ 5 min</span></div>
            <div className={styles.missionFlow}>
              <article><span className={styles.step}>1 · NIVAL ENCONTRÓ</span><strong>{recoverable.length || frequent.length || newCustomers.length}</strong><h3>{recoverable.length ? 'clientes recuperables' : frequent.length ? 'clientes frecuentes' : 'clientes nuevos'}</h3><p>{recoverable.length ? 'Ya compraron antes y llevan entre 31 y 60 días sin volver.' : frequent.length ? 'Ya demostraron recurrencia. Son los clientes que más conviene cuidar.' : 'Solo han registrado una visita. El objetivo es provocar la segunda.'}</p><a href={recoverable.length ? '/dashboard/intelligence?view=risk' : '/dashboard/intelligence?view=recurring'}>Ver la solución completa →</a></article>
              <article className={styles.messageCard}><span className={styles.step}>2 · NIVAL PROPONE</span><h3>Envía este mensaje</h3><blockquote>“{campaignMessage}”</blockquote><div className={styles.personalizationPreview}><small>ASÍ LO PERSONALIZA NIVAL</small><div><span>Nombre</span><b>{priorityContacts[0]?.name ?? '{{nombre}}'}</b></div><div><span>Relación</span><b>{frequentAtRisk.length ? 'Era frecuente' : recoverable.length ? 'Ya te conoce' : frequent.length ? 'Cliente recurrente' : 'Primera visita'}</b></div><div><span>Momento</span><b>{priorityContacts[0]?.daysSince ? `${priorityContacts[0].daysSince} días sin volver` : 'Según su actividad'}</b></div></div><div className={styles.messageWhy}><span>PERSONALIZA</span><p>Reemplaza <b>{'{{nombre}}'}</b> por el nombre del cliente y, si puedes, agrega un beneficio real o una referencia que tenga sentido para tu negocio.</p></div><details className={styles.altMessage}><summary>Ver otra versión</summary><p>“{alternateMessage}”</p></details><div className={styles.channelHint}>Pensado para sonar como un mensaje del negocio, no como publicidad masiva.</div>{priorityContacts.length > 0 && <form action={startIntelligenceCampaign} className={styles.overviewCampaignStart}><input type="hidden" name="customerIds" value={JSON.stringify(topPriority.map(customer => customer.id))}/><input type="hidden" name="segment" value={priorityLabel}/><input type="hidden" name="message" value={campaignMessage}/><input type="hidden" name="campaignName" value={recoverable.length ? 'Recuperación de clientes' : frequent.length ? 'Clientes frecuentes' : 'Segunda visita'}/><button type="submit">Preparar esta campaña →</button><small>Nival guardará hasta {topPriority.length} contactos prioritarios. La medición empieza solo cuando confirmes que ya enviaste los mensajes.</small></form>}</article>
              <article><span className={styles.step}>3 · NIVAL MEDIRÁ</span><h3>¿Funcionó?</h3><p>Cuando vuelvan a registrar una visita, Nival podrá reconocer el regreso y usar ese resultado para mejorar la siguiente estrategia.</p><div className={styles.outcome}><strong>{retention}%</strong><span>de tus clientes actuales ya han regresado al menos una vez</span></div></article>
            </div>
          </section>
          <section className={styles.priorityPeople}><div className={styles.sectionIntro}><span className={styles.label}>NO BUSQUES EN UNA TABLA</span><h2>Empieza con estas personas</h2></div>{topPriority.length ? <div className={styles.peopleStrip}>{topPriority.map((customer, index)=><article key={customer.id}><span>#{index + 1}</span><div><strong>{customer.name}</strong><small>{customer.frequency && customer.daysSince !== null ? `Solía volver cada ~${customer.frequency} días · ahora lleva ${customer.daysSince}` : `${customer.visits} visitas · ${customer.daysSince ?? 0} días sin volver`}</small></div><a href={contactHref(customer)} target={customer.phone ? '_blank' : undefined} rel={customer.phone ? 'noreferrer' : undefined}>{customer.phone ? 'Abrir WhatsApp →' : 'Abrir correo →'}</a></article>)}</div> : <div className={styles.emptyAction}>Todavía no hay clientes con contacto dentro de la audiencia prioritaria. Nival seguirá buscando oportunidades conforme se registren visitas.</div>}</section>
          {latestCampaign && <section className={styles.learningCard}><div><span className={styles.label}>NIVAL APRENDE DE LO QUE HACES</span><h2>La última campaña dejó una señal útil</h2><p>{campaignLearning}</p></div><div className={styles.learningNumbers}><strong>{latestCampaign.returned}/{latestCampaign.audience}</strong><span>regresaron después</span><b>{latestCampaign.rate}%</b></div><a href="/dashboard/intelligence?view=impact">Ver qué funcionó →</a></section>}
          <section className={styles.ownerQuestions}><div><span className={styles.label}>SI QUIERES IR MÁS LEJOS</span><h2>Nival ya tiene estas respuestas</h2></div><div className={styles.questionGrid + " " + styles.questionGridFive}><a href="/dashboard/intelligence?view=risk"><small>¿A QUIÉN ESTOY PERDIENDO?</small><strong>{atRisk.length ? `${atRisk.length} clientes necesitan atención` : 'No detectamos pérdidas urgentes'}</strong><span>Nival prioriza quién vale la pena recuperar.</span></a><a href="/dashboard/intelligence?view=inactive"><small>¿QUIÉN YA SE ENFRIÓ?</small><strong>{inactive.length ? `${inactive.length} clientes inactivos` : 'Sin inactivos por ahora'}</strong><span>Separa reactivación de prevención.</span></a><a href="/dashboard/intelligence?view=recurring"><small>¿A QUIÉN DEBO CUIDAR?</small><strong>{frequent.length ? `${frequent.length} clientes ya son recurrentes` : 'Aún formando recurrencia'}</strong><span>Convierte buenos clientes en hábito.</span></a><a href="/dashboard/intelligence?view=campaigns"><small>¿QUÉ PROMOCIÓN HAGO?</small><strong>{recoverable.length ? 'Campaña de regreso' : frequent.length ? 'Beneficio VIP' : 'Campaña de segunda visita'}</strong><span>La estrategia cambia según el problema detectado.</span></a><a href="/dashboard/intelligence?view=impact"><small>¿ESTÁ FUNCIONANDO?</small><strong>{retention}% de recurrencia observada</strong><span>Revisa resultados, no solo actividad.</span></a></div></section>
          <section className={styles.growthPlaybook}><div className={styles.sectionIntro}><span className={styles.label}>NIVAL BUSCA CRECIMIENTO, NO SOLO PROBLEMAS</span><h2>Oportunidades que puedes aprovechar</h2></div><div className={styles.growthGrid}><article><span>SEGUNDA VISITA</span><strong>{secondVisitOpportunity.length}</strong><h3>clientes están a tiempo de crear hábito</h3><p>Vinieron una vez en las últimas 3 semanas. Un motivo para regresar ahora puede ser más útil que esperar a que se enfríen.</p><a href="/dashboard/intelligence?view=campaigns">Crear estrategia →</a></article><article><span>CLIENTES VIP</span><strong>{loyaltyOpportunity.length}</strong><h3>clientes ya tienen 4+ visitas</h3><p>Son candidatos para reconocimiento, beneficios especiales o una recompensa que proteja su recurrencia.</p><a href="/dashboard/intelligence?view=recurring">Cuidar este grupo →</a></article><article><span>DATO QUE TE ESTÁ FALTANDO</span><strong>{unreachableRisk.length}</strong><h3>clientes en riesgo no tienen contacto</h3><p>Si capturas teléfono o correo en futuras visitas, Nival podrá ayudarte a recuperarlos cuando cambie su comportamiento.</p><a href="/dashboard/points?view=customers">Mejorar mis datos →</a></article></div></section>
          <section className={styles.nextActions}><div className={styles.sectionIntro}><span className={styles.label}>DESPUÉS</span><h2>Lo siguiente que vale la pena hacer</h2></div>
            <div className={styles.solutionCards}>
              <a href="/dashboard/intelligence?view=risk"><small>RECUPERAR</small><strong>{frequentAtRisk.length ? `${frequentAtRisk.length} clientes valiosos se están alejando` : `${contactableRisk.length} clientes en riesgo tienen contacto`}</strong><span>{frequentAtRisk.length ? 'Prioriza a quienes antes regresaban seguido.' : 'Ya puedes contactarlos sin revisar toda tu base.'}</span><b>Resolver →</b></a>
              <a href="/dashboard/intelligence?view=risk"><small>ANTICIPAR</small><strong>{slipping.length ? `${slipping.length} clientes rompieron su hábito` : 'Sin hábitos rotos detectados'}</strong><span>{slipping.length ? 'Nival los detectó antes de que se vuelvan inactivos.' : 'Seguiremos vigilando la frecuencia automáticamente.'}</span><b>Ver señal →</b></a>
              <a href="/dashboard/intelligence?view=recurring"><small>FIDELIZAR</small><strong>{frequent.length ? `${frequent.length} clientes merecen trato especial` : 'Aún construyendo clientes frecuentes'}</strong><span>{frequent.length ? 'Crea una razón para que mantengan su hábito.' : 'Nival detectará este grupo conforme regresen.'}</span><b>Ver clientes →</b></a>
            </div>
          </section>
          <section className={styles.backgroundSignals}><div><span>En riesgo</span><b>{atRisk.length}</b></div><div><span>Inactivos</span><b>{inactive.length}</b></div><div><span>Frecuentes</span><b>{frequent.length}</b></div><div><span>Visitas · 30 días</span><b>{visits30}</b></div><p>Estas señales salen del uso normal de Nival Puntos: clientes registrados, visitas y recompensas. No necesitas capturar ventas para empezar a obtener recomendaciones.</p></section>
        </>}
        {view === 'risk' && <section className={styles.solutionWorkspace}><div className={styles.workspaceHero}><span className={styles.label}>RECUPERAR CLIENTES</span><h1>{recoverable.length ? `Nival encontró ${recoverable.length} clientes que vale la pena intentar recuperar.` : 'No hay clientes en una ventana clara de recuperación.'}</h1><p>{recoverable.length ? 'No te damos una lista para que tú inventes la estrategia. Nival separa a quién contactar, qué decir y qué resultado buscar.' : 'Seguiremos vigilando automáticamente cuándo un cliente rompe su ritmo o deja de regresar.'}</p></div><div className={styles.recoverySummary}><div><small>INTENTAR RECUPERAR</small><strong>{frequentAtRisk.length || recoverable.length}</strong><span>{priorityLabel}</span></div><div><small>PUEDES CONTACTAR HOY</small><strong>{priorityContacts.length}</strong><span>con teléfono o correo</span></div><div><small>PRIORIDAD</small><strong>{frequentAtRisk.length ? 'Alta' : recoverable.length ? 'Media' : 'Sin alerta'}</strong><span>{frequentAtRisk.length ? 'eran clientes frecuentes' : 'según comportamiento actual'}</span></div></div><div className={styles.peopleStrip}>{topPriority.length ? topPriority.map((customer,index)=><article key={customer.id}><span>#{index+1}</span><div><strong>{customer.name}</strong><small>{customer.frequency && customer.daysSince !== null ? `Solía volver cada ~${customer.frequency} días · ahora lleva ${customer.daysSince}` : `${customer.visits} visitas · ${customer.daysSince ?? 0} días sin volver`}</small></div><a href={contactHref(customer)} target={customer.phone ? '_blank' : undefined} rel={customer.phone ? 'noreferrer' : undefined}>{customer.phone ? 'Enviar mensaje →' : 'Abrir correo →'}</a></article>) : <div className={styles.emptyAction}>Sin clientes con contacto y consentimiento en este segmento.</div>}</div><div className={styles.playbook}><article><small>POR QUÉ ELLOS</small><strong>{frequentAtRisk.length || recoverable.length}</strong><h3>{frequentAtRisk.length ? 'Primero: clientes que antes eran frecuentes' : 'Clientes entre 31 y 60 días sin volver'}</h3><p>Son más valiosos que empezar desde cero porque ya conocen el negocio.</p></article><article className={styles.messageCard}><small>ACCIÓN RECOMENDADA</small><h3>Campaña de regreso</h3><blockquote>“{campaignMessage}”</blockquote><p>Personaliza {'{{nombre}}'} y el beneficio antes de enviarlo. La idea es que parezca escrito por el negocio, no por una plataforma.</p><details className={styles.altMessage}><summary>Alternativa más corta</summary><p>“{alternateMessage}”</p></details></article><article><small>ÉXITO =</small><h3>Que vuelvan a visitar</h3><p>Nival comparará sus próximas visitas para que la siguiente recomendación se base en resultados, no intuición.</p></article></div></section>}
        {view === 'inactive' && <section className={styles.solutionWorkspace}>
          <div className={styles.workspaceHero}><span className={styles.label}>CLIENTES INACTIVOS</span><h1>{inactive.length ? `${inactive.length} clientes llevan más de 60 días sin volver.` : 'No hay clientes inactivos por ahora.'}</h1><p>{inactive.length ? 'Este grupo ya no necesita el mismo mensaje que alguien apenas en riesgo. Prioriza primero a quienes tuvieron varias visitas y evita descuentos masivos.' : 'Buena señal: hoy no detectamos clientes con más de 60 días de ausencia.'}</p></div>
          <div className={styles.recoverySummary}><div><small>INACTIVOS</small><strong>{inactive.length}</strong><span>más de 60 días sin visita</span></div><div><small>CONTACTABLES</small><strong>{inactiveContacts.length}</strong><span>con consentimiento y contacto</span></div><div><small>PRIORIDAD</small><strong>{inactiveTop.filter(c=>c.visits>=3).length}</strong><span>antes tuvieron 3+ visitas</span></div></div>
          {inactiveTop.length ? <div className={styles.peopleStrip}>{inactiveTop.map((customer,index)=><article key={customer.id}><span>#{index+1}</span><div><strong>{customer.name}</strong><small>{customer.visits} visitas históricas · {customer.daysSince ?? 0} días sin volver</small></div><a href={contactHref(customer)} target={customer.phone ? '_blank' : undefined} rel={customer.phone ? 'noreferrer' : undefined}>{customer.phone ? 'Contactar →' : 'Abrir correo →'}</a></article>)}</div> : <div className={styles.emptyAction}>No hay clientes inactivos con contacto y consentimiento disponibles para una acción directa.</div>}
          <div className={styles.playbook}><article><small>QUIÉN VA PRIMERO</small><h3>Los que antes sí regresaban</h3><p>Ordena la recuperación por relación previa: un cliente con varias visitas merece prioridad sobre alguien que solo vino una vez.</p></article><article className={styles.messageCard}><small>MENSAJE RECOMENDADO</small><h3>Reactivación sin presión</h3><blockquote>“{inactiveMessage}”</blockquote><p>Evita prometer descuentos si no son necesarios. La meta es reabrir la relación, no regalar margen sin saber si hace falta.</p></article><article><small>QUÉ MEDIR</small><h3>Regreso en 30 días</h3><p>Si vuelven y registran una visita, Nival podrá separar reactivaciones reales de mensajes que no movieron comportamiento.</p></article></div>
        </section>}
        {view === 'recurring' && <section className={styles.solutionWorkspace}><div className={styles.workspaceHero}><span className={styles.label}>FIDELIZAR RECURRENTES</span><h1>{frequent.length ? `Tienes ${frequent.length} clientes que ya demostraron que regresan.` : 'Todavía no hay suficientes clientes recurrentes.'}</h1><p>La solución no es enseñar una tabla: es decirte cómo proteger a tus mejores clientes antes de perderlos.</p></div><div className={styles.playbook}><article><small>QUÉ HACER</small><h3>Trátalos distinto al resto</h3><p>Prueba un beneficio exclusivo, recompensa anticipada o una experiencia especial para mantener el hábito.</p></article><article><small>NIVAL PUNTOS</small><h3>{hasPoints ? 'Úsalo para reforzar recurrencia' : 'Conecta lealtad con Intelligence'}</h3><p>{hasPoints ? `Nival detecta ${pointsCustomers.length} clientes con 2+ visitas y ${availableRewards} recompensas disponibles. Úsalas con quienes ya muestran hábito, no como descuento indiscriminado.` : 'Con Puntos, Intelligence puede observar visitas y recompensas para entender mejor quién está regresando.'}</p></article><article><small>SEÑAL ACTUAL</small><strong>{retention}%</strong><h3>recurrencia observada</h3><p>Porcentaje de clientes registrados que ya acumulan dos o más visitas.</p></article></div></section>}
        {view === 'campaigns' && <section className={styles.solutionWorkspace}><div className={styles.workspaceHero}><span className={styles.label}>CAMPAÑAS RECOMENDADAS</span><h1>Promociona con una razón, no por costumbre.</h1><p>Nival decide qué objetivo tiene sentido, a quién dirigirlo y qué deberías medir. Así evitas regalar descuentos a personas que habrían regresado de todos modos.</p></div>{preparedCampaign && <div className={styles.campaignDecision}><span>CAMPAÑA PREPARADA</span><strong>{preparedCampaign.name}</strong><p>{preparedAudienceCount} clientes quedaron guardados para esta prueba. Envía los mensajes y confirma después para que Nival empiece a medir desde el momento correcto.</p><form action={startIntelligenceMeasurement} className={styles.campaignStart}><input type="hidden" name="campaignId" value={preparedCampaign.id}/><button type="submit">Ya envié los mensajes · empezar medición →</button><small>No marcamos una campaña como enviada hasta que tú lo confirmas.</small></form></div>}<div className={styles.campaignDecision}><span>NIVAL RECOMIENDA EMPEZAR POR</span><strong>{recoverable.length ? 'Campaña de recuperación' : frequent.length ? 'Beneficio VIP' : 'Segunda visita'}</strong><p>{nextBestAction}. Empieza con una sola estrategia, mide el resultado y después escala.</p>{priorityContacts.length > 0 && <form action={startIntelligenceCampaign} className={styles.campaignStart}><input type="hidden" name="customerIds" value={JSON.stringify(topPriority.map(customer => customer.id))}/><input type="hidden" name="segment" value={priorityLabel}/><input type="hidden" name="message" value={campaignMessage}/><input type="hidden" name="campaignName" value={recoverable.length ? 'Recuperación de clientes' : frequent.length ? 'Clientes frecuentes' : 'Segunda visita'}/><button type="submit">Preparar campaña →</button><small>Incluye hasta {topPriority.length} clientes prioritarios con contacto y consentimiento. Después confirmas cuándo realmente enviaste los mensajes.</small></form>}</div><div className={styles.dontDo}><span>EVITA ESTO</span><strong>{frequent.length && recoverable.length ? 'No mandes la misma promoción a frecuentes y clientes en riesgo.' : frequent.length ? 'No regales descuentos generales a clientes que ya tienen hábito.' : 'No promociones por promocionar: define primero qué comportamiento quieres provocar.'}</strong><p>Una buena campaña cambia según el problema: recuperar, provocar segunda visita o premiar recurrencia.</p></div><div className={styles.campaignGrid}><article><small>RECUPERACIÓN</small><h3>“Te extrañamos”</h3><p>Para {recoverable.length} clientes con 31–60 días sin volver.</p><b>{recoverable.length ? 'Recomendada ahora' : 'Sin audiencia suficiente'}</b></article><article><small>FIDELIZACIÓN</small><h3>Beneficio VIP</h3><p>Para {frequent.length} clientes con recurrencia alta.</p><b>{frequent.length ? 'Lista para probar' : 'Aún formando audiencia'}</b></article><article><small>SEGUNDA VISITA</small><h3>Vuelve esta semana</h3><p>Para {newCustomers.length} clientes con 0–1 visitas.</p><b>{newCustomers.length ? 'Oportunidad detectada' : 'Sin audiencia'}</b></article><article><small>PREVENCIÓN</small><h3>Antes de que se vaya</h3><p>Para {slipping.length} clientes que se retrasaron frente a su frecuencia habitual.</p><b>{slipping.length ? 'Señal temprana detectada' : 'Sin alerta ahora'}</b></article></div></section>}
        {view === 'impact' && <section className={styles.solutionWorkspace}><div className={styles.workspaceHero}><span className={styles.label}>RESULTADOS E IMPACTO</span><h1>¿Lo que hiciste con Nival trajo clientes de vuelta?</h1><p>Aquí separamos hechos de estimaciones: visitas posteriores, ventas registradas de la audiencia y valor aproximado cuando falta el monto real. Ninguno se presenta como causalidad sin evidencia.</p></div>{params.campaign === 'started' && <div className={styles.successBanner}>Campaña registrada. Desde ahora Nival observará qué clientes de esa audiencia vuelven durante los próximos 30 días.</div>}{latestCampaign ? <div className={styles.campaignResult}><div><small>ÚLTIMA CAMPAÑA</small><strong>{latestCampaign.name}</strong><span>{latestCampaign.audience} clientes objetivo</span></div><div><small>REGRESARON DESPUÉS</small><strong>{latestCampaign.returned}</strong><span>{latestCampaign.rate}% de la audiencia</span></div><div><small>{latestHasObservedSales ? 'VENTAS OBSERVADAS DESPUÉS' : 'VALOR ESTIMADO'}</small><strong>{latestHasObservedSales ? (latestObservedSalesCents / 100).toLocaleString('es-MX') : averageTicketCents ? (latestEstimatedValueCents / 100).toLocaleString('es-MX') : '—'}</strong><span>{latestHasObservedSales ? `MXN · ${latestCampaign.observedSalesCount} venta${latestCampaign.observedSalesCount === 1 ? '' : 's'} registrada${latestCampaign.observedSalesCount === 1 ? '' : 's'}` : averageTicketCents ? 'MXN · estimación con ticket promedio' : 'Registra ventas o configura tu ticket promedio'}</span></div></div> : <div className={styles.emptyAction}>Aún no hay una campaña medida. Inicia una desde Campañas para comenzar a comparar resultados.</div>}<div className={styles.impactGrid}><article><small>RECURRENCIA OBSERVADA</small><strong>{retention}%</strong><p>Clientes registrados con dos o más visitas.</p></article><article><small>VISITAS · 30 DÍAS</small><strong>{visits30}</strong><p>{previous30 ? `${change >= 0 ? '+' : ''}${change}% frente a los 30 días anteriores.` : 'Aún sin periodo anterior comparable.'}</p></article><article><small>VENTAS VINCULADAS</small><strong>{linkedSales.length}</strong><p>Registros con cliente identificado que Growth puede cruzar con campañas.</p></article></div><div className={styles.impactRoadmap}><div><span>1</span><b>Nival recomienda</b><small>Una campaña y audiencia concretas.</small></div><div><span>2</span><b>El negocio la aplica</b><small>Guardamos a quién se dirigió y cuándo.</small></div><div><span>3</span><b>Nival observa</b><small>Detectamos visitas y ventas posteriores de esa audiencia.</small></div><div><span>4</span><b>Nival aprende</b><small>Comparamos estrategias y recomendamos la siguiente.</small></div></div><div className={styles.ticketSetup}><div><b>Usa el ticket promedio como respaldo, no como verdad</b><p>Cuando una venta está vinculada al cliente, Growth usa el monto real registrado. Si no lo está, el ticket promedio sirve únicamente para estimar el valor de los regresos.</p></div><form action={saveAverageTicket}><label>Ticket promedio (MXN)<input name="averageTicket" inputMode="decimal" defaultValue={averageTicketCents ? (averageTicketCents / 100).toFixed(0) : ''} placeholder="Ej. 180" required/></label><button type="submit">Guardar</button></form></div><div className={styles.attributionNotice}><b>Qué significa “ventas observadas después”</b><p>Son compras registradas de clientes que estaban en la audiencia y ocurrieron después del inicio de medición. Nival no afirma que la campaña las haya causado; las muestra como señal temporal verificable.</p></div></section>}
        {view === 'assistant' && <section className={styles.grid}><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.label}>PREGÚNTALE A NIVAL</span><h2>Pregunta algo útil sobre tu negocio</h2></div></div><p className={styles.muted}>Prueba: “¿A quién estoy perdiendo?”, “¿Qué campaña harías?”, “¿Cómo van mis frecuentes?” o “¿Funcionó la última campaña?”.</p><form className={styles.chat} method="get"><input type="hidden" name="view" value="assistant"/><input name="question" aria-label="Pregunta para Nival" defaultValue={params.question ?? ''} placeholder="¿Qué debería hacer hoy?"/><button type="submit">Preguntar</button></form>{assistantAnswer && <div className={styles.assistantAnswer}><small>NIVAL RESPONDE CON TUS DATOS</small><p>{assistantAnswer}</p></div>}<p className={styles.sourceNote}>La respuesta se genera con la actividad disponible de este negocio; no inventa clientes, ventas ni resultados.</p></article><aside className={styles.panel}><span className={styles.label}>LO QUE NIVAL ESTÁ VIENDO</span><div className={styles.segments}><div className={styles.segment}><span>En riesgo</span><b>{atRisk.length}</b></div><div className={styles.segment}><span>Frecuentes</span><b>{frequent.length}</b></div><div className={styles.segment}><span>Campañas medidas</span><b>{campaignStats.length}</b></div></div></aside></section>}
      </div>}
    </div>
  </main>;
}
