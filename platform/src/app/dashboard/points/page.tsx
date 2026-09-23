import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNavigation } from '../dashboard-navigation';
import { startNivalPointsSubscription } from '@/app/checkout/actions';
import { reconcileLatestSubscription } from '@/lib/reconcile-subscription';
import { ProductInteractiveDemo } from '../product-interactive-demo';
import { PointsEmployeeScanner } from './points-employee-scanner';
import { PointsProgramForm } from './points-controls';
import { importSalesCsv, registerDailySalesSummary, registerQuickCustomer, registerQuickSale, reversePointForm } from '@/app/points/actions';
import { PointsShareTools } from './points-share-tools';
import { activateFreeNivalPoints } from './free-actions';
import { getActiveBusinessMembership } from '@/lib/active-business';

export default async function NivalPointsPage({ searchParams }: { searchParams: Promise<{ error?: string; subscription?: string; view?: string; free?: string; saved?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpoints');
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect('/dashboard');
  if (params.subscription === 'return') await reconcileLatestSubscription(membership.business_id);
  const { data: business } = await supabase.from('businesses')
    .select('name, slug, product_level')
    .eq('id', membership.business_id)
    .maybeSingle();
  if (!business) redirect('/dashboard');
  const [{ data: entitlement }, { data: intelligenceEntitlement }, { count: customers }, { count: visits }, { data: program }] = await Promise.all([
    supabase.from('business_product_entitlements').select('status').eq('business_id', membership.business_id).eq('product_code', 'nival_points').maybeSingle(),
    supabase.from('business_product_entitlements').select('status').eq('business_id', membership.business_id).eq('product_code', 'nival_intelligence').eq('status', 'active').maybeSingle(),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', membership.business_id),
    supabase.from('visits').select('id', { count: 'exact', head: true }).eq('business_id', membership.business_id),
    supabase.from('loyalty_programs').select('id, name, points_per_visit, reward_threshold, reward_description, point_cooldown_minutes, daily_points_cap, review_url, review_request_visit').eq('business_id', membership.business_id).eq('active', true).limit(1).maybeSingle(),
  ]);
  const paid = entitlement?.status === 'active';
  const freePlan = entitlement?.status === 'free';
  const available = paid || freePlan;
  const hasIntelligence = Boolean(intelligenceEntitlement);
  const view = params.view ?? 'overview';
  const navActive = view === 'analytics' ? 'puntos-analitica' : view === 'customers' ? 'puntos-clientes' : (view === 'register' || view === 'visits') ? 'puntos-registro' : view === 'redemptions' ? 'puntos-canjes' : view === 'share' ? 'puntos-compartir' : view === 'settings' ? 'puntos-configuracion' : 'puntos';
  const canManage = membership.role === 'owner' || membership.role === 'manager';
  const [{ data: metricRows }, { data: ledgerRows }, { data: customerRows }, { data: visitRows }, { data: rewardRows }, { data: saleRows }] = available && canManage ? await Promise.all([
    supabase.rpc('get_points_dashboard_metrics_for', { p_business_id: membership.business_id }),
    supabase.from('points_ledger')
      .select('id,event_type,delta,reason,occurred_at,customer_id,customers(name)')
      .eq('business_id', membership.business_id)
      .order('occurred_at', { ascending: false })
      .limit(20),
    supabase.from('customers')
      .select('id,name,phone,email,origin,created_at,loyalty_accounts(points_balance)')
      .eq('business_id', membership.business_id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('visits').select('customer_id,visited_at').eq('business_id', membership.business_id).order('visited_at',{ascending:false}).limit(2000),
    supabase.from('loyalty_rewards').select('customer_id,description,earned_at,redeemed_at').eq('business_id', membership.business_id).order('earned_at',{ascending:false}).limit(1000),
    supabase.from('business_sales').select('id,customer_id,amount_cents,payment_method,transactions_count,sold_at,source').eq('business_id', membership.business_id).order('sold_at',{ascending:false}).limit(500),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const metrics = metricRows?.[0]; // deployment sync
  const nowMs=Date.now(), dayMs=86400000;
  const customerInsights=new Map((customerRows??[]).map(customer=>{const cv=(visitRows??[]).filter(v=>v.customer_id===customer.id);const cr=(rewardRows??[]).filter(r=>r.customer_id===customer.id);const last=cv[0]?.visited_at?new Date(cv[0].visited_at).getTime():null;const first=cv.length?new Date(cv[cv.length-1].visited_at).getTime():null;const avg=cv.length>1&&first&&last?Math.round((last-first)/dayMs/(cv.length-1)):null;return [customer.id,{visits30:cv.filter(v=>nowMs-new Date(v.visited_at).getTime()<=30*dayMs).length,totalVisits:cv.length,lastVisit:last?new Date(last):null,avgDays:avg,rewardsAvailable:cr.filter(x=>!x.redeemed_at).length,rewardsRedeemed:cr.filter(x=>x.redeemed_at).length,lastReward:cr.find(x=>x.redeemed_at)?.description??null}]}));
  const insightValues=[...customerInsights.values()];
  const active30Customers=insightValues.filter(insight=>insight.visits30>0).length;
  const returning30Customers=insightValues.filter(insight=>insight.visits30>0&&insight.totalVisits>=2).length;
  const recurrence30=active30Customers?Math.round((returning30Customers/active30Customers)*100):0;
  const sales30Rows=(saleRows??[]).filter(sale=>nowMs-new Date(sale.sold_at).getTime()<=30*dayMs);
  const sales30Cents=sales30Rows.reduce((sum,sale)=>sum+Number(sale.amount_cents??0),0);
  const transactions30=sales30Rows.reduce((sum,sale)=>sum+Number(sale.transactions_count??1),0);
  const availableRewardsCount=(rewardRows??[]).filter(reward=>!reward.redeemed_at).length;
  const redeemed30=(rewardRows??[]).filter(reward=>reward.redeemed_at&&nowMs-new Date(reward.redeemed_at).getTime()<=30*dayMs).length;
  const pointsTodayAction = Number(metrics?.new_customers_today ?? 0)>Number(metrics?.returning_customers_today ?? 0)
    ? { title:'Convierte clientes nuevos en una segunda visita', text:'Hoy entraron más clientes nuevos que recurrentes. Asegúrate de que entiendan qué premio pueden alcanzar y cómo volver a sumar.', href:'/dashboard/points?view=share', cta:'Revisar cómo compartes el programa' }
    : availableRewardsCount>0
      ? { title:`Tienes ${availableRewardsCount} recompensas listas para crear una buena experiencia`, text:'Un premio bien entregado refuerza el hábito. Revisa quién puede canjear y evita que una recompensa se quede olvidada.', href:'/dashboard/points?view=redemptions', cta:'Canjear recompensas' }
      : { title:'Haz que registrar una visita tome segundos', text:'El valor de Puntos crece cuando cada visita se registra. Mantén el QR o escáner listo para que tu equipo no se salte movimientos.', href:'/dashboard/points?view=visits', cta:'Registrar una visita' };
  return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active={navActive} />
    <div className={`dashboardContent ${!available ? "nivalPointsDark" : ""}`}>
      <header className="dashboardContentTopbar"><div><span>Nival Puntos</span><b>Haz que vuelvan</b></div><span className="ready">{paid ? 'Pro' : freePlan ? 'Gratis' : 'Empieza gratis'}</span></header>
      {params.error && <p className="formMessage errorMessage">{params.error}</p>}
      {params.subscription && <p className="formMessage">Estamos confirmando tu suscripción con Mercado Pago.</p>}
      {params.saved === 'customer' && <p className="formMessage successMessage">Cliente registrado y tarjeta de puntos creada.</p>}
      {params.saved === 'existing' && <p className="formMessage successMessage">Ese cliente ya estaba registrado. No creamos un duplicado.</p>}
      {params.saved === 'sale' && <p className="formMessage successMessage">Venta registrada.</p>}
      {params.saved === 'summary' && <p className="formMessage successMessage">Resumen del día registrado.</p>}
      {params.saved?.startsWith('import-') && <p className="formMessage successMessage">Importación lista: {params.saved.replace('import-','')} ventas agregadas.</p>}
      {!available ? <>
        <section className="productShowcase pointsShowcase">
          <div className="productShowcaseCopy"><span className="productPill">NIVAL PUNTOS</span><h1>Haz que tus clientes<br/>quieran volver.</h1><p>Premia cada visita con puntos. Tus clientes ven su saldo desde el celular y tú administras todo sin tarjetas de papel.</p><ul className="productBenefits"><li>Registro con código QR</li><li>Tarjeta digital del cliente</li><li>Visitas, puntos y premios en un mismo lugar</li></ul><div className="productPrice"><strong>Gratis</strong><span>hasta 30 clientes</span></div><div className="freemiumCtas"><form action={activateFreeNivalPoints}><button className="productCta">Crear mi programa gratis <span>→</span></button></form><form action={startNivalPointsSubscription}><button className="nvSecondaryButton">Ver Nival Puntos Pro · $199/mes</button></form></div><small>Empieza sin tarjeta. Paga cuando necesites más clientes, personalización y resultados completos.</small></div>
          <div className="pointsVisual"><div className="walletCard walletCardBack"><span>NIVAL</span></div><div className="walletCard"><div className="walletTop"><b>NIVAL PUNTOS</b><span>●</span></div><div className="walletBusiness">TU NEGOCIO</div><strong>840</strong><small>PUNTOS DISPONIBLES</small><div className="walletProgress"><i></i></div><p>160 puntos para tu próxima recompensa</p><div className="walletQr">▦</div></div><div className="floatStat statOne"><b>+28%</b><span>recurrencia</span></div><div className="floatStat statTwo"><b>12</b><span>premios este mes</span></div></div>
        </section>
        <section className="productFeatureStrip"><article><span>01</span><div><b>Tarjeta digital</b><p>El cliente abre sus puntos y recompensas desde el navegador, sin descargar una app.</p></div></article><article><span>02</span><div><b>Clientes que sí conoces</b><p>Historial, saldo, visitas, premios y canjes en un mismo lugar.</p></div></article><article><span>03</span><div><b>Resultados útiles</b><p>Recurrencia, actividad y señales para saber si el programa sí está haciendo que vuelvan.</p></div></article></section>
        <section className="productStorySection">
          <div className="productStoryHeading"><span>CÓMO FUNCIONA</span><h2>Un programa sencillo para ti y para tus clientes.</h2><p>No necesitan descargar una aplicación ni aprender un sistema complicado.</p></div>
          <div className="productSteps"><article><b>1</b><div><h3>Comparte tu QR</h3><p>El cliente lo escanea y registra su tarjeta digital desde el teléfono.</p></div></article><article><b>2</b><div><h3>Registra cada visita</h3><p>Tu equipo busca al cliente y agrega sus puntos en segundos.</p></div></article><article><b>3</b><div><h3>Entrega recompensas</h3><p>Cuando llega a la meta, el sistema indica que su premio ya está disponible.</p></div></article></div>
        </section>
        <ProductInteractiveDemo mode="points" />
        <section className="productPreviewSection pointsProductPreview">
          <div className="productStoryHeading"><span>VISTA PREVIA</span><h2>Esto es lo que usarán todos los días.</h2><p>El cliente consulta sus puntos desde el celular. El negocio registra visitas y canjes desde su panel.</p></div>
          <div className="pointsPreviewGrid">
            <article className="customerPhonePreview"><div className="phoneTop"><span>9:41</span><i>● ● ●</i></div><div className="phoneBrand">CAFÉ DEL CENTRO</div><div className="phonePoints"><small>TUS PUNTOS</small><strong>8</strong><span>Te faltan 2 para tu bebida gratis</span></div><div className="phoneProgress"><i /></div><div className="phoneReward"><b>Tu próxima recompensa</b><span>Bebida mediana gratis</span></div><button type="button" className="nvSecondaryButton">Mostrar mi tarjeta</button></article>
            <article className="merchantPreview"><header><div><small>NIVAL PUNTOS</small><h3>Clientes de hoy</h3></div><span>Programa activo</span></header><div className="merchantMetrics"><div><small>Visitas hoy</small><strong>14</strong></div><div><small>Premios disponibles</small><strong>3</strong></div></div><div className="merchantCustomer"><span>AM</span><div><b>Ana Martínez</b><small>8 de 10 puntos</small></div><button type="button" className="nvSecondaryButton">Registrar visita</button></div><div className="merchantCustomer"><span>JR</span><div><b>José Ramírez</b><small>10 de 10 puntos</small></div><button type="button" className="nvSecondaryButton">Canjear premio</button></div></article>
          </div>
          <p className="previewNote">Ejemplo visual. Los nombres y cifras son demostrativos.</p>
        </section>
        <section className="productSolutionsSection">
          <div className="productStoryHeading"><span>SOLUCIONES</span><h2>Más que una tarjeta de puntos.</h2></div>
          <div className="solutionGrid"><article><span>Clientes</span><h3>Conoce quién regresa</h3><p>Consulta visitas, puntos disponibles y recompensas de cada persona.</p></article><article><span>Operación</span><h3>Atiende sin complicaciones</h3><p>Registra visitas y canjes desde un panel claro para todo tu equipo.</p></article><article><span>Campañas</span><h3>Ideas para hacerlos volver</h3><p>Recibe recomendaciones basadas en la actividad de tu programa.</p></article><article><span>Experiencia</span><h3>Todo desde el celular</h3><p>Tus clientes consultan su tarjeta con un enlace, QR o Wallet.</p></article></div>
        </section>
        <section className="productUseCases"><div><span>IDEAL PARA</span><h2>Cafeterías, restaurantes, barberías, salones y negocios con clientes frecuentes.</h2></div><form action={activateFreeNivalPoints}><button className="productCta">Empezar gratis <span>→</span></button></form></section>
      </> : <>
        {params.free === 'started' && <p className="formMessage successMessage">Nival Puntos Gratis ya está activo. Comparte tu QR y empieza a registrar clientes.</p>}
        {freePlan && <section className="freemiumBanner"><div><span>NIVAL PUNTOS GRATIS</span><strong>{Math.min(customers ?? 0,30)} de 30 clientes usados</strong><p>Tu programa funciona de verdad. Cuando necesites más capacidad, resultados completos o configuración avanzada, puedes pasar a Pro sin perder clientes ni puntos.</p></div><form action={startNivalPointsSubscription}><button type="submit">Desbloquear Pro · $199/mes →</button></form></section>}
        <section className="pointsV1Hero">
          <div><p className="eyebrow">NIVAL PUNTOS</p><h1>{view === 'analytics' ? 'Resultados' : view === 'customers' ? 'Tus clientes' : view === 'register' ? 'Registrar' : view === 'visits' ? 'Registrar visita' : view === 'redemptions' ? 'Canjear premio' : view === 'share' ? 'Compartir programa' : view === 'settings' ? 'Configurar programa' : (program?.name ?? 'Tu programa de puntos')}</h1><p>{view === 'analytics' ? 'Mide si el programa está logrando lo importante: que más personas regresen y usen sus recompensas.' : view === 'customers' ? 'Consulta primero a los clientes más recientes, su progreso y actividad.' : view === 'register' ? 'Captura solo lo que ya haces: una visita, una venta, un cliente nuevo o el total del día.' : view === 'visits' ? 'Escanea el código de visita del cliente y confirma en segundos.' : view === 'redemptions' ? 'Valida una recompensa específica y confirma únicamente cuando la entregues.' : view === 'share' ? 'Administra las formas de acceso al programa mediante QR, enlace o NFC.' : view === 'settings' ? 'Define cómo se obtienen puntos, las recompensas y las reglas del programa.' : (program ? `1 punto por visita · Premio al llegar a ${program.reward_threshold} puntos · ${program.daily_points_cap === 0 ? 'Sin tope diario' : `Máximo ${program.daily_points_cap} al día`}.` : 'Configura tu programa para comenzar.')}</p></div>
          {(view === 'share' || view === 'overview') && business?.slug && <a className="nvSecondaryButton" href={`/b/${business.slug}`} target="_blank" rel="noreferrer">{view === 'overview' ? 'Ver experiencia del cliente ↗' : 'Abrir registro ↗'}</a>}
        </section>

        {canManage && view === 'overview' && <section className="pointsMetricGrid">
          <article><span>Visitas hoy</span><strong>{metrics?.visits_today ?? 0}</strong></article>
          <article><span>Clientes nuevos</span><strong>{metrics?.new_customers_today ?? 0}</strong></article>
          <article><span>Regresaron</span><strong>{metrics?.returning_customers_today ?? 0}</strong></article>
          <article><span>Premios canjeados</span><strong>{metrics?.rewards_redeemed_today ?? 0}</strong></article>
        </section>}

        {canManage && view === 'overview' && <section className="pointsTodayAction"><div><span>LO MÁS ÚTIL AHORA</span><h2>{pointsTodayAction.title}</h2><p>{pointsTodayAction.text}</p></div><a href={pointsTodayAction.href}>{pointsTodayAction.cta} →</a></section>}

        {view === 'overview' && <section className="pointsQuickOps"><a href="/dashboard/points?view=register"><span>REGISTRAR</span><strong>Visita, venta o cliente</strong><small>Captura rápida sin cambiar tu forma de trabajar →</small></a><a href="/dashboard/points?view=redemptions"><span>PREMIAR</span><strong>Canjear premio</strong><small>Validar y confirmar entrega →</small></a><a href="/dashboard/points?view=customers"><span>ENTENDER</span><strong>Ver clientes</strong><small>Quién vuelve, quién progresa y quién tiene premio →</small></a></section>}


        {view === 'register' && <>
          <section className="captureIntro">
            <div><span>REGISTRO RÁPIDO</span><h2>No cambies tu operación para usar Nival.</h2><p>Registra únicamente el dato que tengas a la mano. Puedes empezar con una visita, una venta individual, el total del día o un archivo CSV de tu sistema actual.</p></div>
            <div className="captureMiniStats"><span><b>{(sales30Cents/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'})}</b>ventas registradas · 30 días</span><span><b>{transactions30}</b>operaciones registradas</span></div>
          </section>
          {canManage && <div className="captureGrid">
            <article className="captureCard">
              <span>CLIENTE NUEVO · 15 SEG</span><h3>Regístralo con lo mínimo</h3><p>Nombre y teléfono. El cliente queda listo para Nival Puntos sin llenar una ficha larga.</p>
              <form action={registerQuickCustomer}>
                <label>Nombre<input name="name" required minLength={2} maxLength={100} placeholder="Ej. Ana López"/></label>
                <label>Teléfono<input name="phone" required inputMode="tel" minLength={10} maxLength={18} placeholder="55 1234 5678"/></label>
                <label>Correo <small>opcional</small><input name="email" type="email" placeholder="cliente@correo.com"/></label>
                <label className="checkLabel"><input name="marketingConsent" type="checkbox"/> El cliente acepta recibir promociones.</label>
                <button type="submit">Registrar cliente</button>
              </form>
            </article>

            <article className="captureCard">
              <span>VENTA RÁPIDA · 10 SEG</span><h3>Guarda el monto, nada más si eso es lo que tienes</h3><p>El cliente es opcional. Si lo relacionas, Intelligence podrá entender mejor su valor y recurrencia.</p>
              <form action={registerQuickSale}>
                <label>Monto de la venta<input name="amount" required inputMode="decimal" placeholder="185.00"/></label>
                <label>Cliente <small>opcional</small><select name="customerId" defaultValue=""><option value="">Sin cliente identificado</option>{(customerRows??[]).map(customer=><option value={customer.id} key={customer.id}>{customer.name}</option>)}</select></label>
                <label>Método<select name="paymentMethod" defaultValue="other"><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="card">Tarjeta</option><option value="other">Otro</option></select></label>
                <label>Nota <small>opcional</small><input name="note" maxLength={200} placeholder="Ej. corte + barba"/></label>
                <button type="submit">Guardar venta</button>
              </form>
            </article>

            <article className="captureCard">
              <span>SI YA LLEVAS TUS VENTAS EN OTRO LADO</span><h3>Solo sube el total del día</h3><p>No necesitas volver a capturar ticket por ticket. Esto sirve para negocios que ya usan libreta, caja o un POS.</p>
              <form action={registerDailySalesSummary}>
                <label>Fecha<input name="saleDate" type="date" required defaultValue={new Date().toISOString().slice(0,10)}/></label>
                <label>Total vendido<input name="amount" required inputMode="decimal" placeholder="3450"/></label>
                <label>Número de ventas<input name="transactions" type="number" min={1} max={100000} defaultValue={1}/></label>
                <button type="submit">Guardar resumen</button>
              </form>
            </article>

            <article className="captureCard">
              <span>IMPORTAR</span><h3>Trae un CSV de tu sistema actual</h3><p>Acepta hasta 500 ventas por archivo. Solo necesitas una columna <b>Monto</b>; opcionalmente Fecha, Teléfono y Método.</p>
              <form action={importSalesCsv}>
                <label>Archivo CSV<input name="salesFile" type="file" accept=".csv,text/csv" required/></label>
                <small className="captureFormat">Ejemplo: Fecha, Monto, Teléfono, Método</small>
                <button type="submit">Importar ventas</button>
              </form>
            </article>
          </div>}
          <section className="captureScanner"><div><span>VISITA CON NIVAL PUNTOS</span><h2>Si el cliente ya tiene tarjeta, escanéala.</h2><p>El flujo de puntos sigue igual: código temporal, confirmación y registro en segundos.</p></div><PointsEmployeeScanner mode="visit" /></section>
        </>}

        {canManage && view === 'overview' && !hasIntelligence && Number(customers ?? 0) > 0 && <section className="productBridge"><div><span>CUANDO QUIERAS IR MÁS ALLÁ DE LOS PUNTOS</span><h2>Ya estás registrando comportamiento. Intelligence puede convertirlo en acciones.</h2><p>Usa visitas y recurrencia para encontrar clientes en riesgo, preparar campañas y medir quién regresó después.</p></div><a href="/dashboard/intelligence">Conocer Intelligence · paquete $449/mes →</a></section>}

        {canManage && view === 'analytics' && freePlan && <section className="freemiumLocked"><span>RESULTADOS PRO</span><h2>Nival ya está registrando la actividad. Pro te ayuda a entender si realmente están volviendo.</h2><p>Desbloquea recurrencia, clientes activos, premios usados y recomendaciones para mejorar el programa.</p><form action={startNivalPointsSubscription}><button type="submit">Desbloquear resultados · $199/mes →</button></form></section>}
        {canManage && view === 'analytics' && paid && <section className="pointsResultsGrid"><article><span>CLIENTES ACTIVOS · 30 DÍAS</span><strong>{active30Customers}</strong><p>Personas con al menos una visita reciente.</p></article><article><span>REGRESARON</span><strong>{returning30Customers}</strong><p>Clientes activos que ya tienen dos o más visitas registradas.</p></article><article><span>RECURRENCIA OBSERVADA</span><strong>{recurrence30}%</strong><p>Qué parte de los clientes activos ya volvió al menos una vez.</p></article><article><span>PREMIOS USADOS · 30 DÍAS</span><strong>{redeemed30}</strong><p>Recompensas que sí terminaron en una experiencia entregada.</p></article></section>}

        {canManage && view === 'analytics' && paid && <section className="pointsResultsAdvice"><span>QUÉ HACER CON ESTO</span><h2>{recurrence30>=40?'Protege lo que ya está funcionando.':recurrence30>=20?'Hay recurrencia, pero todavía puedes empujar la segunda visita.':'Tu mayor oportunidad es lograr que la primera visita no sea la última.'}</h2><p>{recurrence30>=40?'Mantén el premio fácil de entender y revisa que tus clientes frecuentes sigan sintiendo valor.':recurrence30>=20?'Haz más visible el progreso y recuérdale al cliente qué gana si vuelve.':'Simplifica el programa, comunica el premio desde la primera visita y evita que el cliente se vaya sin saber cómo regresar.'}</p><a href="/dashboard/points?view=customers">Ver clientes →</a></section>}

        {view === 'visits' && <PointsEmployeeScanner mode="visit" />}

        {view === 'redemptions' && <PointsEmployeeScanner mode="redeem" />}

        {view === 'share' && business?.slug && <PointsShareTools url={`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nival-tech-platform.vercel.app'}/b/${business.slug}`} />}

        {canManage && program && view === 'settings' && freePlan && <section className="freemiumLocked"><span>CONFIGURACIÓN PRO</span><h2>Tu plan gratis usa una configuración simple para que puedas empezar rápido.</h2><p>Pro desbloquea reglas avanzadas, reseñas, límites personalizados y más control del programa.</p><form action={startNivalPointsSubscription}><button type="submit">Desbloquear configuración →</button></form></section>}
        {canManage && program && view === 'settings' && paid && <section className="pointsAdminGrid">
          {view === 'settings' && <article className="pointsPanel">
            <div className="pointsSectionHeading"><div><span>CONFIGURACIÓN</span><h2>Programa</h2></div><p>Los límites se validan en el servidor.</p></div>
            <PointsProgramForm program={program} />
          </article>}
        </section>}

        {canManage && view === 'customers' && <section className="pointsHistory pointsCustomerRegistry">
          <div className="pointsSectionHeading"><div><span>REGISTRO DE CLIENTES</span><h2>Clientes y actividad</h2></div><p>Información de lealtad para tomar decisiones. Los puntos solo cambian mediante visitas y reglas del programa.</p></div>
          {!customerRows?.length ? <div className="pointsEmptyState">Todavía no hay clientes registrados.</div> :
            <div className="pointsHistoryList">{customerRows.map((customer) => {
              const account = Array.isArray(customer.loyalty_accounts) ? customer.loyalty_accounts[0] : customer.loyalty_accounts;
              const insight=customerInsights.get(customer.id); return <article key={customer.id} className="pointsCustomerInsightRow"><div className="pointsCustomerIdentity"><strong>{customer.name}</strong><span>{customer.phone ?? customer.email ?? 'Sin contacto'} · {customer.origin?.toUpperCase() ?? 'REGISTRO'}</span><small>Alta: {new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeZone:'America/Mexico_City'}).format(new Date(customer.created_at))}</small></div><div className="pointsCustomerStats"><span><small>Saldo</small><b>{account?.points_balance ?? 0} pts</b></span><span><small>Visitas 30 días</small><b>{insight?.visits30 ?? 0}</b></span><span><small>Visitas totales</small><b>{insight?.totalVisits ?? 0}</b></span><span><small>Frecuencia</small><b>{insight?.avgDays != null ? `cada ${insight.avgDays} d` : '—'}</b></span><span><small>Última visita</small><b>{insight?.lastVisit ? new Intl.DateTimeFormat('es-MX',{dateStyle:'short',timeZone:'America/Mexico_City'}).format(insight.lastVisit) : '—'}</b></span><span><small>Recompensas</small><b>{insight?.rewardsAvailable ?? 0} disp. · {insight?.rewardsRedeemed ?? 0} canj.</b></span></div>{insight?.lastReward&&<p className="pointsLastReward">Último premio canjeado: <strong>{insight.lastReward}</strong></p>}</article>;
            })}</div>}
        </section>}

        {canManage && view === 'overview' && <section className="pointsHistory">
          <div className="pointsSectionHeading"><div><span>HISTORIAL</span><h2>Movimientos recientes</h2></div><p>El ledger es inmutable; las correcciones se registran como reversas.</p></div>
          {!ledgerRows?.length ? <div className="pointsEmptyState">Todavía no hay movimientos.</div> :
            <div className="pointsHistoryList">{ledgerRows.map((movement) => {
              const linkedCustomer = Array.isArray(movement.customers) ? movement.customers[0] : movement.customers;
              return <article key={movement.id}><div><strong>{linkedCustomer?.name ?? 'Cliente'}</strong><span>{movement.reason}</span></div><div><b>{movement.delta > 0 ? '+' : ''}{movement.delta}</b><time>{new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'}).format(new Date(movement.occurred_at))}</time>{movement.event_type === 'visit_award' && <form action={reversePointForm}><input type="hidden" name="ledgerId" value={movement.id} /><button className="nvTertiaryButton" type="submit">Anular punto</button></form>}</div></article>;
            })}</div>}
        </section>}
      </>}
    </div>
  </main>;
}
