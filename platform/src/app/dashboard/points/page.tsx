import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNavigation } from '../dashboard-navigation';
import { startNivalPointsSubscription } from '@/app/checkout/actions';
import { CheckoutSubmitButton } from '@/app/checkout/submit-button';
import { PaymentStatusPoller } from '@/app/checkout/payment-status-poller';
import { reconcileLatestSubscription } from '@/lib/reconcile-subscription';
import { ProductInteractiveDemo } from '../product-interactive-demo';
import { PointsEmployeeScanner } from './points-employee-scanner';
import { PointsProgramForm } from './points-controls';
import { reversePointForm } from '@/app/points/actions';
import { PointsShareTools } from './points-share-tools';
import { PointsPromotionsPanel } from './points-promotions';
import { appleWalletReady } from '@/lib/apple-wallet';
import { activateFreeNivalPoints } from './free-actions';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { NIVAL_POINTS_FREE_CUSTOMER_LIMIT, NIVAL_POINTS_FOUNDER_PRICE_CENTS, NIVAL_POINTS_REGULAR_PRICE_CENTS, NIVAL_TRIAL_DAYS, mxn } from '@/lib/commercial';

export default async function NivalPointsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; subscription?: string; view?: string; free?: string; scan?: string; wallet?: string }>;
}) {
  const params = await searchParams;
  if (params.view === 'redemptions') redirect('/dashboard/points?view=visits');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpoints');

  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect('/dashboard');
  if (params.subscription === 'return') await reconcileLatestSubscription(membership.business_id);

  const { data: business } = await supabase
    .from('businesses')
    .select('name, slug, product_level')
    .eq('id', membership.business_id)
    .maybeSingle();
  if (!business) redirect('/dashboard');

  const [{ data: entitlement }, { data: intelligenceEntitlement }, { count: loyaltyCustomers }, { data: program }] = await Promise.all([
    supabase.from('business_product_entitlements').select('status,current_period_end').eq('business_id', membership.business_id).eq('product_code', 'nival_points').maybeSingle(),
    supabase.from('business_product_entitlements').select('status').eq('business_id', membership.business_id).eq('product_code', 'nival_intelligence').maybeSingle(),
    supabase.from('loyalty_accounts').select('id', { count: 'exact', head: true }).eq('business_id', membership.business_id),
    supabase.from('loyalty_programs')
      .select('id, name, points_per_visit, reward_threshold, reward_description, point_cooldown_minutes, daily_points_cap, review_url, review_request_visit')
      .eq('business_id', membership.business_id)
      .eq('active', true)
      .limit(1)
      .maybeSingle(),
  ]);

  const paid = entitlement?.status === 'active';
  const freePlan = entitlement?.status === 'free';
  // eslint-disable-next-line react-hooks/purity -- Server-rendered request snapshot for trial countdown.
  const now = Date.now();
  const trialEnd = freePlan && entitlement?.current_period_end ? new Date(entitlement.current_period_end).getTime() : 0;
  const trialActive = freePlan && trialEnd > now;
  const trialDaysLeft = trialActive ? Math.max(1, Math.ceil((trialEnd - now) / 86400000)) : 0;
  const proAccess = paid || trialActive;
  const baseFree = freePlan && !trialActive;
  const available = paid || freePlan;
  const hasIntelligence = intelligenceEntitlement?.status === 'active' || intelligenceEntitlement?.status === 'free' || business.product_level === 'intelligence';
  const view = params.view ?? 'overview';
  const canManage = membership.role === 'owner' || membership.role === 'manager';

  const navActive =
    view === 'customers' ? 'puntos-clientes'
      : view === 'promotions' ? 'puntos-promociones'
        : view === 'redemptions' ? 'puntos-canjes'
          : view === 'share' ? 'puntos-compartir'
            : view === 'settings' ? 'puntos-configuracion'
              : view === 'visits' ? 'puntos-visitas'
                : 'puntos';

  const [{ data: metricRows }, { data: ledgerRows }, { data: customerRows }, { data: visitRows }, { data: rewardRows }] =
    available && canManage
      ? await Promise.all([
        supabase.rpc('get_points_dashboard_metrics_for', { p_business_id: membership.business_id }),
        supabase.from('points_ledger')
          .select('id,event_type,delta,reason,occurred_at,customer_id,customers(name)')
          .eq('business_id', membership.business_id)
          .order('occurred_at', { ascending: false })
          .limit(20),
        supabase.from('customers')
          .select('id,name,phone,email,origin,created_at,marketing_consent_at,loyalty_accounts!inner(points_balance)')
          .eq('business_id', membership.business_id)
          .order('created_at', { ascending: false })
          .limit(300),
        supabase.from('visits')
          .select('customer_id,visited_at')
          .eq('business_id', membership.business_id)
          .order('visited_at', { ascending: false })
          .limit(5000),
        supabase.from('loyalty_rewards')
          .select('customer_id,description,earned_at,redeemed_at')
          .eq('business_id', membership.business_id)
          .order('earned_at', { ascending: false })
          .limit(3000),
      ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const metrics = metricRows?.[0];
  const totalVisits = (visitRows ?? []).length;
  const availableRewards = (rewardRows ?? []).filter((reward) => !reward.redeemed_at).length;
  const redeemedRewards = (rewardRows ?? []).filter((reward) => reward.redeemed_at).length;
  const qrNfcRegistrations = (customerRows ?? []).filter((customer) => customer.origin === 'qr' || customer.origin === 'nfc').length;

  const customerActivity = new Map(
    (customerRows ?? []).map((customer) => {
      const visits = (visitRows ?? []).filter((visit) => visit.customer_id === customer.id);
      const rewards = (rewardRows ?? []).filter((reward) => reward.customer_id === customer.id);
      return [
        customer.id,
        {
          visits: visits.length,
          lastVisit: visits[0]?.visited_at ?? null,
          availableRewards: rewards.filter((reward) => !reward.redeemed_at).length,
          redeemedRewards: rewards.filter((reward) => reward.redeemed_at).length,
        },
      ];
    }),
  );

  const title =
    view === 'customers' ? 'Clientes'
      : view === 'promotions' ? 'Promociones y notificaciones'
        : view === 'visits' ? 'Registrar visita y premios'
          : view === 'share' ? 'Compartir programa'
              : view === 'settings' ? 'Configurar programa'
                : program?.name ?? 'Tu programa de puntos';

  const description =
    view === 'customers' ? 'Consulta el saldo, visitas y premios de las personas registradas en tu programa.'
      : view === 'promotions' ? 'Envía descuentos y promociones por Google Wallet o abre WhatsApp con el mensaje listo, únicamente para clientes que aceptaron recibirlos.'
        : view === 'visits' ? 'Escanea una sola vez: registra la visita y, si hay un premio disponible, Nival te pregunta si el cliente quiere canjearlo ahora o guardarlo.'
          : view === 'share' ? 'Pon el QR en caja, mesa, menú o NFC para que el cliente se registre solo.'
              : view === 'settings' ? 'Define la meta y el premio. El programa se encarga del resto.'
                : program
                  ? `Cada visita suma · ${program.reward_description} al llegar a ${program.reward_threshold} puntos.`
                  : 'Un programa sencillo: registro, tarjeta digital, visitas y recompensa.';

  return <main className="dashboardApp nivalDashboard">
    <PaymentStatusPoller active={params.subscription === 'return' && !paid} />
    <DashboardNavigation businessName={business.name} active={navActive} />
    <div className={`dashboardContent ${!available ? 'nivalPointsDark' : ''}`}>
      <header className="dashboardContentTopbar">
        <div><span>Nival Puntos</span><b>Fidelización sin complicaciones</b></div>
        <span className="ready">{paid ? 'Pro' : trialActive ? `Prueba Pro · ${trialDaysLeft}d` : freePlan ? 'Gratis' : 'Empieza gratis'}</span>
      </header>

      {params.error && <p className="formMessage errorMessage">{params.error}</p>}
      {params.subscription && <p className="formMessage">{paid ? 'Suscripción confirmada. Nival Puntos Pro ya está activo.' : 'Estamos confirmando tu suscripción con Mercado Pago. No vuelvas a pagar mientras termina la validación.'}</p>}

      {!available ? <>
        <section className="productShowcase pointsShowcase">
          <div className="productShowcaseCopy">
            <span className="productPill">NIVAL PUNTOS</span>
            <h1>Una tarjeta digital<br/>para hacer que vuelvan.</h1>
            <p>El cliente escanea tu QR, se registra una vez y lleva su progreso en el celular. Tú solo registras visitas y entregas el premio cuando llegue a la meta.</p>
            <ul className="productBenefits">
              <li>Registro del cliente por QR o NFC</li>
              <li>Tarjeta digital y Google Wallet</li>
              <li>Meta configurable, puntos y recompensas</li>
            </ul>
            <div className="productPrice"><strong>{NIVAL_TRIAL_DAYS} días Pro</strong><span>después puedes seguir gratis hasta {NIVAL_POINTS_FREE_CUSTOMER_LIMIT} clientes</span></div>
            <div className="freemiumCtas">
              <form action={activateFreeNivalPoints}><CheckoutSubmitButton className="productCta" pendingLabel="Activando prueba…">Probar Pro {NIVAL_TRIAL_DAYS} días <span>→</span></CheckoutSubmitButton></form>
              <form action={startNivalPointsSubscription}><CheckoutSubmitButton className="nvSecondaryButton" pendingLabel="Abriendo Mercado Pago…">Precio fundador · {mxn(NIVAL_POINTS_FOUNDER_PRICE_CENTS)}/mes</CheckoutSubmitButton></form>
            </div>
            <small>Sin tarjeta para empezar. Precio regular previsto después del lanzamiento: {mxn(NIVAL_POINTS_REGULAR_PRICE_CENTS)}/mes.</small>
          </div>
          <div className="pointsVisual">
            <div className="walletCard walletCardBack"><span>NIVAL</span></div>
            <div className="walletCard">
              <div className="walletTop"><b>NIVAL PUNTOS</b><span>●</span></div>
              <div className="walletBusiness">TU NEGOCIO</div>
              <strong>7</strong><small>DE 10 VISITAS</small>
              <div className="walletProgress"><i style={{ width: '70%' }} /></div>
              <p>3 visitas para tu próxima recompensa</p>
              <div className="walletQr">▦</div>
            </div>
          </div>
        </section>
        <section className="productFeatureStrip">
          <article><span>01</span><div><b>Escanea</b><p>El cliente abre el QR y crea su tarjeta desde su teléfono.</p></div></article>
          <article><span>02</span><div><b>Acumula</b><p>Cada visita suma y el progreso queda guardado en su tarjeta digital.</p></div></article>
          <article><span>03</span><div><b>Premia</b><p>Cuando llega a la meta, Nival muestra la recompensa lista para canjear.</p></div></article>
        </section>
        <ProductInteractiveDemo mode="points" />
      </> : <>
        {params.free === 'started' && <p className="formMessage successMessage">Tu prueba de herramientas Pro ya está activa. Comparte tu QR y empieza a registrar clientes.</p>}

        {trialActive && <section className="freemiumBanner">
          <div>
            <span>PRUEBA PRO · {trialDaysLeft} {trialDaysLeft === 1 ? 'DÍA' : 'DÍAS'} RESTANTES</span>
            <strong>Usa configuración y promociones Pro antes de decidir.</strong>
            <p>Si no pagas al terminar, conservas tu programa y bajas al plan Gratis de hasta {NIVAL_POINTS_FREE_CUSTOMER_LIMIT} clientes. No borramos tu información.</p>
          </div>
          <form action={startNivalPointsSubscription}><CheckoutSubmitButton className="nvPrimaryLink" pendingLabel="Abriendo Mercado Pago…">Conservar Pro · {mxn(NIVAL_POINTS_FOUNDER_PRICE_CENTS)}/mes →</CheckoutSubmitButton></form>
        </section>}
        {baseFree && <section className="freemiumBanner">
          <div>
            <span>NIVAL PUNTOS GRATIS</span>
            <strong>{Math.min(loyaltyCustomers ?? 0, NIVAL_POINTS_FREE_CUSTOMER_LIMIT)} de {NIVAL_POINTS_FREE_CUSTOMER_LIMIT} clientes usados</strong>
            <p>Tu programa, tarjetas, puntos y recompensas siguen funcionando. Pro aumenta capacidad y recupera configuración y promociones.</p>
          </div>
          <form action={startNivalPointsSubscription}><CheckoutSubmitButton className="nvPrimaryLink" pendingLabel="Abriendo Mercado Pago…">Volver a Pro · {mxn(NIVAL_POINTS_FOUNDER_PRICE_CENTS)}/mes →</CheckoutSubmitButton></form>
        </section>}

        <section className="pointsV1Hero">
          <div><p className="eyebrow">NIVAL PUNTOS</p><h1>{title}</h1><p>{description}</p></div>
          {(view === 'share' || view === 'overview') && business.slug &&
            <a className="nvSecondaryButton" href={`/b/${business.slug}`} target="_blank" rel="noreferrer">
              {view === 'overview' ? 'Ver experiencia del cliente ↗' : 'Abrir registro ↗'}
            </a>}
        </section>

        {canManage && view === 'overview' && <>
          <section className="pointsMetricGrid">
            <article><span>Clientes registrados</span><strong>{loyaltyCustomers ?? 0}</strong><small>personas con tarjeta</small></article>
            <article><span>Visitas registradas</span><strong>{totalVisits}</strong><small>movimientos del programa</small></article>
            <article><span>Premios listos</span><strong>{availableRewards}</strong><small>por entregar</small></article>
            <article><span>Premios canjeados</span><strong>{redeemedRewards}</strong><small>ya entregados</small></article>
          </section>

          <section className="pointsTodayAction">
            <div>
              <span>OPERACIÓN SIMPLE</span>
              <h2>{availableRewards > 0 ? `Tienes ${availableRewards} premio${availableRewards === 1 ? '' : 's'} listo${availableRewards === 1 ? '' : 's'} para entregar.` : 'Tu trabajo aquí es solo registrar visitas y entregar recompensas.'}</h2>
              <p>{qrNfcRegistrations > 0 ? `${qrNfcRegistrations} clientes se registraron por QR o NFC. Nival se encarga de construir la base mientras usas el programa.` : 'Comparte el QR para que los clientes se registren solos y evita capturar información manualmente.'}</p>
            </div>
            <a href={availableRewards > 0 ? '/dashboard/points?view=visits' : '/dashboard/points?view=share'}>
              {availableRewards > 0 ? 'Registrar visita / premio →' : 'Compartir mi QR →'}
            </a>
          </section>

          <section className="pointsQuickOps">
            <a href="/dashboard/points?view=share"><span>1 · REGISTRAR</span><strong>Comparte tu QR</strong><small>El cliente crea su tarjeta solo →</small></a>
            <a href="/dashboard/points?view=visits"><span>2 · ACUMULAR</span><strong>Registrar visita</strong><small>Escanea el código del cliente →</small></a>
            <a href="/dashboard/points?view=visits"><span>3 · PREMIAR</span><strong>Premio dentro de la visita</strong><small>Nival te avisa cuando haya uno disponible →</small></a>
            {proAccess && <a href="/dashboard/points?view=promotions"><span>4 · RECUPERAR</span><strong>Enviar descuento o promoción</strong><small>Google Wallet o WhatsApp →</small></a>}
          </section>

          <section className="productBridge">
            <div>
              <span>{hasIntelligence ? 'NIVAL INTELLIGENCE CONECTADO' : 'CUANDO QUIERAS IR MÁS ALLÁ'}</span>
              <h2>{hasIntelligence ? 'Intelligence aprende de los clientes que Nival Puntos registra por ti.' : 'Puntos crea la base. Intelligence encuentra qué hacer con ella.'}</h2>
              <p>{hasIntelligence ? 'Visitas, recurrencia y recompensas alimentan las recomendaciones sin pedirte volver a capturar clientes.' : 'Cuando actives Intelligence, usará automáticamente estos clientes y visitas para detectar frecuentes, personas en riesgo y oportunidades de campaña.'}</p>
            </div>
            <a href="/dashboard/intelligence">{hasIntelligence ? 'Abrir Intelligence →' : 'Conocer Intelligence →'}</a>
          </section>
        </>}

        {canManage && view === 'customers' && <section className="pointsHistory pointsCustomerRegistry">
          <div className="pointsSectionHeading">
            <div><span>CLIENTES DEL PROGRAMA</span><h2>Tarjetas y progreso</h2></div>
            <p>Datos operativos del programa. El análisis de comportamiento vive en Nival Intelligence.</p>
          </div>
          {!customerRows?.length ? <div className="pointsEmptyState">Todavía no hay clientes registrados. Comparte tu QR para comenzar.</div> :
            <div className="pointsHistoryList">{customerRows.map((customer) => {
              const account = Array.isArray(customer.loyalty_accounts) ? customer.loyalty_accounts[0] : customer.loyalty_accounts;
              const activity = customerActivity.get(customer.id);
              return <article key={customer.id} className="pointsCustomerInsightRow">
                <div className="pointsCustomerIdentity">
                  <strong>{customer.name}</strong>
                  <span>{customer.phone ?? customer.email ?? 'Sin contacto'} · {customer.origin?.toUpperCase() ?? 'REGISTRO'}</span>
                  <small>Alta: {new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'America/Mexico_City' }).format(new Date(customer.created_at))}</small>
                </div>
                <div className="pointsCustomerStats">
                  <span><small>Saldo</small><b>{account?.points_balance ?? 0} pts</b></span>
                  <span><small>Visitas</small><b>{activity?.visits ?? 0}</b></span>
                  <span><small>Última visita</small><b>{activity?.lastVisit ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(activity.lastVisit)) : '—'}</b></span>
                  <span><small>Premios</small><b>{activity?.availableRewards ?? 0} disp. · {activity?.redeemedRewards ?? 0} canj.</b></span>
                </div>
              </article>;
            })}</div>}
        </section>}

        {canManage && view === 'promotions' && baseFree &&
          <section className="freemiumLocked">
            <span>PROMOCIONES PRO</span>
            <h2>Envía una promoción general a quienes aceptaron recibirla.</h2>
            <p>La selección inteligente de audiencias, recuperación de clientes y campañas medidas pertenece a Nival Intelligence.</p>
            <form action={startNivalPointsSubscription}><CheckoutSubmitButton className="nvPrimaryLink" pendingLabel="Abriendo Mercado Pago…">Desbloquear promociones · {mxn(NIVAL_POINTS_FOUNDER_PRICE_CENTS)}/mes →</CheckoutSubmitButton></form>
          </section>}

        {canManage && view === 'promotions' && proAccess &&
          <PointsPromotionsPanel
            businessName={business.name}
            appleEnabled={appleWalletReady()}
            customers={(customerRows ?? []).map((customer) => ({
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              marketing_consent_at: customer.marketing_consent_at,
            }))}
          />}

        {view === 'visits' && <PointsEmployeeScanner mode="visit" initialScanToken={params.scan ?? ''} initialWalletToken={params.wallet ?? ''} />}
        {view === 'share' && business.slug &&
          <PointsShareTools url={`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nival-tech-platform.vercel.app'}/b/${business.slug}`} />}

        {canManage && program && view === 'settings' && baseFree &&
          <section className="freemiumLocked">
            <span>CONFIGURACIÓN PRO</span>
            <h2>El plan gratis usa una regla simple para que puedas empezar rápido.</h2>
            <p>Pro te deja cambiar la meta, el premio, límites, tiempos de espera y estrategia de reseñas.</p>
            <form action={startNivalPointsSubscription}><CheckoutSubmitButton className="nvPrimaryLink" pendingLabel="Abriendo Mercado Pago…">Desbloquear configuración · {mxn(NIVAL_POINTS_FOUNDER_PRICE_CENTS)}/mes →</CheckoutSubmitButton></form>
          </section>}

        {canManage && program && view === 'settings' && proAccess &&
          <section className="pointsAdminGrid">
            <article className="pointsPanel">
              <div className="pointsSectionHeading"><div><span>CONFIGURACIÓN</span><h2>Programa</h2></div><p>Define la experiencia de fidelización, no un sistema de analítica.</p></div>
              <PointsProgramForm program={program} />
            </article>
          </section>}

        {canManage && view === 'overview' && <section className="pointsHistory">
          <div className="pointsSectionHeading">
            <div><span>ACTIVIDAD RECIENTE</span><h2>Últimos movimientos</h2></div>
            <p>Un historial operativo para confirmar que las visitas y puntos se registraron.</p>
          </div>
          {!ledgerRows?.length ? <div className="pointsEmptyState">Todavía no hay movimientos.</div> :
            <div className="pointsHistoryList">{ledgerRows.map((movement) => {
              const linkedCustomer = Array.isArray(movement.customers) ? movement.customers[0] : movement.customers;
              return <article key={movement.id}>
                <div><strong>{linkedCustomer?.name ?? 'Cliente'}</strong><span>{movement.reason}</span></div>
                <div>
                  <b>{movement.delta > 0 ? '+' : ''}{movement.delta}</b>
                  <time>{new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(movement.occurred_at))}</time>
                  {movement.event_type === 'visit_award' && <form action={reversePointForm}><input type="hidden" name="ledgerId" value={movement.id} /><button className="nvTertiaryButton" type="submit">Anular punto</button></form>}
                </div>
              </article>;
            })}</div>}
        </section>}

        {canManage && view === 'overview' && metrics && <p className="pointsDataSourceNote">Hoy: {metrics.visits_today ?? 0} visitas · {metrics.new_customers_today ?? 0} clientes nuevos · {metrics.rewards_redeemed_today ?? 0} premios canjeados. Para análisis, segmentos y decisiones, abre Nival Intelligence.</p>}
      </>}
    </div>
  </main>;
}
