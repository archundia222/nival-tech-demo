import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNavigation } from '../dashboard-navigation';
import { startNivalPointsSubscription } from '@/app/checkout/actions';
import { reconcileLatestSubscription } from '@/lib/reconcile-subscription';
import { ProductInteractiveDemo } from '../product-interactive-demo';
import { PointsEmployeeScanner } from './points-employee-scanner';
import { PointsProgramForm } from './points-controls';
import { reversePointForm } from '@/app/points/actions';
import { PointsShareTools } from './points-share-tools';

export default async function NivalPointsPage({ searchParams }: { searchParams: Promise<{ error?: string; subscription?: string; view?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpoints');
  const { data: membership } = await supabase.from('business_members')
    .select('business_id, role, businesses(name, slug, product_level)').eq('user_id', user.id).limit(1).maybeSingle();
  if (!membership) redirect('/dashboard');
  if (params.subscription === 'return') await reconcileLatestSubscription(membership.business_id);
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const [{ data: entitlement }, { count: customers }, { count: visits }, { data: program }] = await Promise.all([
    supabase.from('business_product_entitlements').select('status').eq('business_id', membership.business_id).eq('product_code', 'nival_points').eq('status', 'active').maybeSingle(),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', membership.business_id),
    supabase.from('visits').select('id', { count: 'exact', head: true }).eq('business_id', membership.business_id),
    supabase.from('loyalty_programs').select('id, name, points_per_visit, reward_threshold, reward_description, point_cooldown_minutes, daily_points_cap, review_url, review_request_visit').eq('business_id', membership.business_id).eq('active', true).limit(1).maybeSingle(),
  ]);
  const active = Boolean(entitlement);
  const view = params.view ?? 'overview';
  const navActive = view === 'analytics' ? 'puntos-analitica' : view === 'customers' ? 'puntos-clientes' : view === 'visits' ? 'puntos-visitas' : view === 'redemptions' ? 'puntos-canjes' : view === 'share' ? 'puntos-compartir' : view === 'settings' ? 'puntos-configuracion' : 'puntos';
  const canManage = membership.role === 'owner' || membership.role === 'manager';
  const [{ data: metricRows }, { data: ledgerRows }, { data: customerRows }, { data: visitRows }, { data: rewardRows }] = active && canManage ? await Promise.all([
    supabase.rpc('get_points_dashboard_metrics'),
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
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const metrics = metricRows?.[0]; // deployment sync
  const nowMs=Date.now(), dayMs=86400000;
  const customerInsights=new Map((customerRows??[]).map(customer=>{const cv=(visitRows??[]).filter(v=>v.customer_id===customer.id);const cr=(rewardRows??[]).filter(r=>r.customer_id===customer.id);const last=cv[0]?.visited_at?new Date(cv[0].visited_at).getTime():null;const first=cv.length?new Date(cv[cv.length-1].visited_at).getTime():null;const avg=cv.length>1&&first&&last?Math.round((last-first)/dayMs/(cv.length-1)):null;return [customer.id,{visits30:cv.filter(v=>nowMs-new Date(v.visited_at).getTime()<=30*dayMs).length,totalVisits:cv.length,lastVisit:last?new Date(last):null,avgDays:avg,rewardsAvailable:cr.filter(x=>!x.redeemed_at).length,rewardsRedeemed:cr.filter(x=>x.redeemed_at).length,lastReward:cr.find(x=>x.redeemed_at)?.description??null}]}));
  return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active={navActive} />
    <div className={`dashboardContent ${!active ? "nivalPointsDark" : ""}`}>
      <header className="dashboardContentTopbar"><div><span>Nival Puntos</span><b>Lealtad y recompensas</b></div><span className="ready">{active ? 'Activo' : '$199/mes'}</span></header>
      {params.error && <p className="formMessage errorMessage">{params.error}</p>}
      {params.subscription && <p className="formMessage">Estamos confirmando tu suscripción con Mercado Pago.</p>}
      {!active ? <>
        <section className="productShowcase pointsShowcase">
          <div className="productShowcaseCopy"><span className="productPill">NIVAL PUNTOS</span><h1>Haz que tus clientes<br/>quieran volver.</h1><p>Premia cada visita con puntos. Tus clientes ven su saldo desde el celular y tú administras todo sin tarjetas de papel.</p><ul className="productBenefits"><li>Registro con código QR</li><li>Puntos y premios automáticos</li><li>Historial de clientes y visitas</li></ul><div className="productPrice"><strong>$199</strong><span>MXN al mes</span></div><form action={startNivalPointsSubscription}><button className="productCta">Activar Nival Puntos <span>→</span></button></form><small>$199 MXN al mes. Puedes cancelar cuando quieras.</small></div>
          <div className="pointsVisual"><div className="walletCard walletCardBack"><span>NIVAL</span></div><div className="walletCard"><div className="walletTop"><b>NIVAL PUNTOS</b><span>●</span></div><div className="walletBusiness">TU NEGOCIO</div><strong>840</strong><small>PUNTOS DISPONIBLES</small><div className="walletProgress"><i></i></div><p>160 puntos para tu próxima recompensa</p><div className="walletQr">▦</div></div><div className="floatStat statOne"><b>+28%</b><span>recurrencia</span></div><div className="floatStat statTwo"><b>12</b><span>premios este mes</span></div></div>
        </section>
        <section className="productFeatureStrip"><article><span>01</span><div><b>Tarjeta en Wallet</b><p>Google Wallet y Apple Wallet para que tu programa siempre esté a la mano.</p></div></article><article><span>02</span><div><b>Clientes que sí conoces</b><p>Historial, saldo, visitas, premios y canjes en un mismo lugar.</p></div></article><article><span>03</span><div><b>Decisiones con datos</b><p>Recurrencia, actividad y sugerencias para mejorar tu programa.</p></div></article></section>
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
        <section className="productUseCases"><div><span>IDEAL PARA</span><h2>Cafeterías, restaurantes, barberías, salones y negocios con clientes frecuentes.</h2></div><form action={startNivalPointsSubscription}><button className="productCta">Crear mi programa <span>→</span></button></form></section>
      </> : <>
        <section className="pointsV1Hero">
          <div><p className="eyebrow">NIVAL PUNTOS</p><h1>{view === 'analytics' ? 'Analítica de datos' : view === 'customers' ? 'Clientes' : view === 'visits' ? 'Registrar visita' : view === 'redemptions' ? 'Canjear recompensa' : view === 'share' ? 'QR y NFC' : view === 'settings' ? 'Programa de lealtad' : (program?.name ?? 'Tu programa de puntos')}</h1><p>{view === 'analytics' ? 'Entiende qué está pasando en tu programa y toma decisiones con datos útiles.' : view === 'customers' ? 'Consulta primero a los clientes más recientes, su progreso y actividad.' : view === 'visits' ? 'Escanea el código de visita del cliente y confirma en segundos.' : view === 'redemptions' ? 'Valida una recompensa específica y confirma únicamente cuando la entregues.' : view === 'share' ? 'Administra las formas de acceso al programa mediante QR, enlace o NFC.' : view === 'settings' ? 'Define cómo se obtienen puntos, las recompensas y las reglas del programa.' : (program ? `1 punto por visita · Premio al llegar a ${program.reward_threshold} puntos · ${program.daily_points_cap === 0 ? 'Sin tope diario' : `Máximo ${program.daily_points_cap} al día`}.` : 'Configura tu programa para comenzar.')}</p></div>
          {view === 'share' && business?.slug && <a className="nvSecondaryButton" href={`/b/${business.slug}`} target="_blank" rel="noreferrer">Abrir registro ↗</a>}
        </section>
        {view === 'overview' && <section className="pointsV1Hero pointsOverviewIntro">
          <div><p className="eyebrow">NIVAL PUNTOS V1</p><h1>{program?.name ?? 'Tu programa de puntos'}</h1><p>{program ? `1 punto por visita · Premio al llegar a ${program.reward_threshold} puntos · ${program.daily_points_cap === 0 ? 'Sin tope diario' : `Máximo ${program.daily_points_cap} al día`}.` : 'Configura tu programa para comenzar.'}</p></div>
          {business?.slug && <a className="nvSecondaryButton" href={`/b/${business.slug}`} target="_blank" rel="noreferrer">Abrir registro de clientes ↗</a>}
        </section>}

        {canManage && view === 'overview' && <section className="pointsMetricGrid">
          <article><span>Visitas hoy</span><strong>{metrics?.visits_today ?? 0}</strong></article>
          <article><span>Clientes nuevos</span><strong>{metrics?.new_customers_today ?? 0}</strong></article>
          <article><span>Regresaron</span><strong>{metrics?.returning_customers_today ?? 0}</strong></article>
          <article><span>Premios canjeados</span><strong>{metrics?.rewards_redeemed_today ?? 0}</strong></article>
        </section>}

        {view === 'overview' && <section className="pointsQuickOps"><a href="/dashboard/points?view=visits"><span>OPERACIÓN DIARIA</span><strong>Registrar visita</strong><small>Escanear QR o ingresar código →</small></a><a href="/dashboard/points?view=redemptions"><span>RECOMPENSAS</span><strong>Canjear recompensa</strong><small>Validar y confirmar entrega →</small></a><a href="/dashboard/points?view=customers"><span>CLIENTES</span><strong>Ver clientes</strong><small>Actividad, puntos y registros →</small></a></section>}

                {view === 'visits' && <PointsEmployeeScanner mode="visit" />}

        {view === 'redemptions' && <PointsEmployeeScanner mode="redeem" />}

        {view === 'share' && business?.slug && <PointsShareTools url={`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nival-tech-platform.vercel.app'}/b/${business.slug}`} />}

        {canManage && program && (view === 'settings' || view === 'share') && <section className="pointsAdminGrid">
          {view === 'settings' && <article className="pointsPanel">
            <div className="pointsSectionHeading"><div><span>CONFIGURACIÓN</span><h2>Programa</h2></div><p>Los límites se validan en el servidor.</p></div>
            <PointsProgramForm program={program} />
          </article>}
          {view === 'share' && <article className="pointsPanel">
            <div className="pointsSectionHeading"><div><span>COMPARTIR</span><h2>Alta de clientes</h2></div></div>
            <p>Comparte este enlace como QR o prográmalo en una tarjeta NFC.</p>
            {business?.slug && <code className="pointsShareUrl">{`/b/${business.slug}`}</code>}
            <p className="pointsMuted">{customers ?? 0} clientes · {visits ?? 0} visitas históricas</p>
          </article>}
        </section>}

        {canManage && (view === 'overview' || view === 'customers' || view === 'analytics') && <section className="pointsHistory pointsCustomerRegistry">
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
