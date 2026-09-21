import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNavigation } from '../dashboard-navigation';
import { startNivalPointsSubscription } from '@/app/checkout/actions';
import { reconcileLatestSubscription } from '@/lib/reconcile-subscription';
import { ProductInteractiveDemo } from '../product-interactive-demo';

export default async function NivalPointsPage({ searchParams }: { searchParams: Promise<{ error?: string; subscription?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpoints');
  const { data: membership } = await supabase.from('business_members')
    .select('business_id, businesses(name, product_level)').eq('user_id', user.id).limit(1).maybeSingle();
  if (!membership) redirect('/dashboard');
  if (params.subscription === 'return') await reconcileLatestSubscription(membership.business_id);
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const [{ data: entitlement }, { count: customers }, { count: visits }, { data: program }] = await Promise.all([
    supabase.from('business_product_entitlements').select('status').eq('business_id', membership.business_id).eq('product_code', 'nival_points').eq('status', 'active').maybeSingle(),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', membership.business_id),
    supabase.from('visits').select('id', { count: 'exact', head: true }).eq('business_id', membership.business_id),
    supabase.from('loyalty_programs').select('id, name, points_per_visit, reward_threshold, reward_description').eq('business_id', membership.business_id).eq('active', true).limit(1).maybeSingle(),
  ]);
  const active = Boolean(entitlement) || business?.product_level === 'intelligence';
  return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active="puntos" />
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
            <article className="customerPhonePreview"><div className="phoneTop"><span>9:41</span><i>● ● ●</i></div><div className="phoneBrand">CAFÉ DEL CENTRO</div><div className="phonePoints"><small>TUS PUNTOS</small><strong>8</strong><span>Te faltan 2 para tu bebida gratis</span></div><div className="phoneProgress"><i /></div><div className="phoneReward"><b>Tu próxima recompensa</b><span>Bebida mediana gratis</span></div><button type="button">Mostrar mi tarjeta</button></article>
            <article className="merchantPreview"><header><div><small>NIVAL PUNTOS</small><h3>Clientes de hoy</h3></div><span>Programa activo</span></header><div className="merchantMetrics"><div><small>Visitas hoy</small><strong>14</strong></div><div><small>Premios disponibles</small><strong>3</strong></div></div><div className="merchantCustomer"><span>AM</span><div><b>Ana Martínez</b><small>8 de 10 puntos</small></div><button type="button">Registrar visita</button></div><div className="merchantCustomer"><span>JR</span><div><b>José Ramírez</b><small>10 de 10 puntos</small></div><button type="button">Canjear premio</button></div></article>
          </div>
          <p className="previewNote">Ejemplo visual. Los nombres y cifras son demostrativos.</p>
        </section>
        <section className="productSolutionsSection">
          <div className="productStoryHeading"><span>SOLUCIONES</span><h2>Más que una tarjeta de puntos.</h2></div>
          <div className="solutionGrid"><article><span>Clientes</span><h3>Conoce quién regresa</h3><p>Consulta visitas, puntos disponibles y recompensas de cada persona.</p></article><article><span>Operación</span><h3>Atiende sin complicaciones</h3><p>Registra visitas y canjes desde un panel claro para todo tu equipo.</p></article><article><span>Campañas</span><h3>Ideas para hacerlos volver</h3><p>Recibe recomendaciones basadas en la actividad de tu programa.</p></article><article><span>Experiencia</span><h3>Todo desde el celular</h3><p>Tus clientes consultan su tarjeta con un enlace, QR o Wallet.</p></article></div>
        </section>
        <section className="productUseCases"><div><span>IDEAL PARA</span><h2>Cafeterías, restaurantes, barberías, salones y negocios con clientes frecuentes.</h2></div><form action={startNivalPointsSubscription}><button className="productCta">Crear mi programa <span>→</span></button></form></section>
      </> : <>
        <section className="dashboardHero"><div><p className="eyebrow">TU PROGRAMA</p><h1>{program?.name ?? 'Configura Nival Puntos'}</h1><p>{program ? `${program.points_per_visit} puntos por visita · Premio al llegar a ${program.reward_threshold} puntos.` : 'Define los puntos por visita y la recompensa de tus clientes.'}</p><a className="loginLink" href="/dashboard?section=configuracion">{program ? 'Editar programa' : 'Configurar programa'}</a></div></section>
        <section className="metricGrid"><article><span>Clientes</span><strong>{customers ?? 0}</strong></article><article><span>Visitas</span><strong>{visits ?? 0}</strong></article><article><span>Recompensa</span><strong>{program?.reward_threshold ?? '—'} pts</strong></article></section>
        <section className="analyticsGrid"><article className="chartCard"><h2>Clientes y canjes</h2><p>Registra visitas, revisa saldos y canjea premios.</p><a className="loginLink" href="/dashboard?section=clientes">Abrir clientes</a></article><article className="chartCard"><h2>Tarjeta y QR</h2><p>Comparte el registro público y la tarjeta virtual del programa.</p><a className="loginLink" href="/dashboard?section=configuracion">Administrar programa</a></article></section>
      </>}
    </div>
  </main>;
}
