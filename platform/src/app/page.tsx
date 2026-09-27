import Image from "next/image";
import Link from "next/link";
import { LandingReveal } from "./landing-reveal";
import { LandingLivePreviews } from "./landing-live-previews";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusinessMembership } from "@/lib/active-business";
import { startMercadoPagoCheckout, startNivalPointsSubscription, startNivalReviewsCheckout } from "@/app/checkout/actions";
import { CheckoutSubmitButton } from "@/app/checkout/submit-button";
import {
  NIVAL_PAY_FOUNDER_PRICE_CENTS,
  NIVAL_POINTS_FOUNDER_PRICE_CENTS,
  NIVAL_POINTS_FREE_CUSTOMER_LIMIT,
  NIVAL_REVIEWS_PRO_PRICE_CENTS,
  NIVAL_TRIAL_DAYS,
  mxn,
} from "@/lib/commercial";

const whatsappHref = "https://wa.me/525539044788?text=" + encodeURIComponent("Hola, vi Nival Tech y quiero información para mi negocio.");
const payFreeUrl = "/auth?mode=signup&next=%2Fdashboard%2Fpay";
const payProUrl = "/auth?mode=signup&next=%2Fcheckout";
const reviewsFreeUrl = "/auth?mode=signup&next=%2Fdashboard%2Freviews";
const reviewsProUrl = "/auth?mode=signup&next=%2Fdashboard%2Freviews";
const pointsFreeUrl = "/auth?mode=signup&next=%2Fdashboard%2Fpoints";
const pointsProUrl = "/auth?mode=signup&next=%2Fdashboard%2Fpoints%3Fview%3Dpro";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const membership = user ? await getActiveBusinessMembership(user.id) : null;
  const canBuyDirect = Boolean(membership && ['owner','manager'].includes(membership.role));

  return <main className="landing landingV3" id="inicio">
    <LandingReveal />

    <nav className="landingNav landingV3Nav" aria-label="Navegación principal">
      <Link className="landingBrand" href="#inicio"><Image src="/wallet/nival-logo.svg" alt="" width={38} height={38} priority/><span>Nival Tech</span></Link>
      <div className="landingNavLinks"><a href="#productos">Productos</a><a href="#comparar">Comparar</a><a href="#planes">Planes</a></div>
      <div className="landingNavCtas"><Link className="landingLogin" href="/auth">Entrar</Link></div>
    </nav>

    <section className="landingV3Hero">
      <div className="landingV3HeroCopy">
        <p className="landingKicker heroReveal heroReveal1"><span/> Tecnología para hacer crecer tu negocio</p>
        <h1 className="heroReveal heroReveal2">Cobra fácil.<br/>Fideliza clientes.<br/><em>Crece.</em></h1>
        <p className="heroReveal heroReveal3">Menos tiempo explicando cómo pagar, más razones para que tus clientes regresen y más oportunidades para convertir una buena experiencia en una reseña.</p>
        <div className="landingHeroActions heroReveal heroReveal4">
          <a className="landingPrimary" href="#planes">Ver planes</a>
          <Link className="landingSecondary" href="/demo">Observar demo →</Link>
        </div>
        <div className="landingV3Differentiator heroReveal heroReveal5">
          <b>Sin apps para tus clientes.</b>
          <span>Abren, entienden y usan Nival desde su celular.</span>
        </div>
      </div>
      <div className="landingV3HeroVisual heroVisualReveal" aria-label="Vista de productos Nival">
        <div className="heroPhoneCard heroPay"><span>NIVAL PAY</span><strong>Datos listos para cobrar</strong><small>QR · enlace · acercar celular</small></div>
        <div className="heroPhoneCard heroPoints"><span>NIVAL PUNTOS</span><strong>7 / 10 visitas</strong><i><b/></i><small>3 visitas para tu recompensa</small></div>
        <div className="heroPhoneCard heroReviews"><span>NIVAL RESEÑAS</span><strong>★★★★★</strong><small>Directo a Google</small></div>
      </div>
    </section>

    <section className="landingQuickValue scrollReveal" id="productos">
      <article><span>01</span><strong>Nival Pay</strong><p>Haz más fácil que te paguen.</p></article>
      <article><span>02</span><strong>Nival Reseñas</strong><p>Haz más fácil que te recomienden.</p></article>
      <article><span>03</span><strong>Nival Puntos</strong><p>Haz más visible la razón para volver.</p></article>
    </section>

    <section className="landingDemoInvite scrollReveal">
      <div><p className="landingEyebrow">PRUÉBALO ANTES DE DECIDIR</p><h2>La demo te enseña cómo configurarlo y cómo lo verá tu cliente.</h2><p>Sin registro. Paso a paso. Primero Pay, después Puntos y Reseñas.</p></div>
      <Link className="landingPrimary" href="/demo">Abrir demo guiada →</Link>
    </section>

    <LandingLivePreviews />

    <section className="landingIdentity scrollReveal">
      <div className="landingSectionHeading compact"><p className="landingEyebrow">¿QUÉ ES NIVAL TECH?</p><h2>Herramientas simples para problemas que un negocio vive todos los días.</h2></div>
      <div className="landingInfoTable">
        <div><span>QUÉ ES</span><strong>Una plataforma de herramientas digitales para negocios locales.</strong></div>
        <div><span>PARA QUIÉN</span><strong>Dueños de cafeterías, barberías, restaurantes, tiendas, servicios y otros negocios locales.</strong></div>
        <div><span>PRODUCTOS</span><strong>Nival Pay · Nival Reseñas · Nival Puntos</strong></div>
        <div><span>DÓNDE SE USA</span><strong>Desde el navegador del celular. Tus clientes no necesitan instalar una app.</strong></div>
        <div><span>QUÉ BUSCA</span><strong>Reducir fricción al cobrar, ayudar a generar recurrencia y aprovechar mejor cada buena experiencia.</strong></div>
        <div><span>SOPORTE</span><strong>Atención directa por WhatsApp en español.</strong></div>
      </div>
      <a className="landingWhatsAppButton" href={whatsappHref} target="_blank" rel="noreferrer">Hablar por WhatsApp →</a>
    </section>

    <section className="landingPointsFocus scrollReveal">
      <div>
        <p className="landingEyebrow">NIVAL PUNTOS PRO</p>
        <h2>No se trata solo de regalar puntos.</h2>
        <p>La actividad de visitas te ayuda a entender quién vuelve, quién se está alejando y qué promoción vale la pena probar. Pro agrega herramientas para actuar sobre esos datos reales.</p>
      </div>
      <div className="landingDataCards">
        <article><span>CLIENTES</span><strong>Quién regresa</strong><p>Consulta visitas, saldo y recompensas.</p></article>
        <article><span>ACCIONES</span><strong>A quién contactar</strong><p>Usa actividad real para orientar promociones.</p></article>
        <article><span>CAMPAÑAS</span><strong>Qué probar</strong><p>Prepara mensajes y mide qué pasó después.</p></article>
      </div>
    </section>

    <section className="landingComparisons scrollReveal" id="comparar">
      <div className="landingSectionHeading compact"><p className="landingEyebrow">¿POR QUÉ CAMBIAR?</p><h2>Compara la experiencia, no solo la herramienta.</h2></div>

      <div className="comparisonTableV3">
        <header><span></span><strong>Nival Pay</strong><strong>Dictar CLABE / papelito</strong></header>
        <div><span>Para pagar</span><b>El cliente abre y copia</b><em>Tiene que preguntar o capturar</em></div>
        <div><span>Si cambian tus datos</span><b>Editas una vez</b><em>Vuelves a imprimir o explicar</em></div>
        <div><span>Desde WhatsApp</span><b>Compartes un enlace</b><em>Mandas datos manualmente</em></div>
        <div><span>Experiencia</span><b>Ordenada y consistente</b><em>Depende de cada persona</em></div>
      </div>

      <div className="comparisonTableV3">
        <header><span></span><strong>Nival Puntos Pro</strong><strong>Programa básico de fidelización</strong></header>
        <div><span>Premios</span><b>Puntos + progreso visible</b><em>Puntos o sellos</em></div>
        <div><span>Datos</span><b>Visitas y actividad del cliente</b><em>Registro básico</em></div>
        <div><span>Después del registro</span><b>Promociones basadas en actividad</b><em>Campañas generales</em></div>
        <div><span>Decisiones</span><b>Información para decidir a quién contactar</b><em>Normalmente requiere revisar datos aparte</em></div>
      </div>
    </section>

    <section className="landingPlansV3 scrollReveal" id="planes">
      <div className="landingSectionHeading compact"><p className="landingEyebrow">PLANES CLAROS</p><h2>Empieza gratis. Paga cuando la versión completa ya tenga sentido para tu negocio.</h2></div>

      <div className="productPricingV3">
        <div className="pricingProductTitle"><span>NIVAL PAY</span><h3>Haz más fácil que te paguen.</h3></div>
        <article><span>GRATIS</span><strong>$0</strong><p>Página de cobro, QR y enlace.</p><Link href={payFreeUrl}>Empezar gratis</Link></article>
        <article className="featured"><span>PRO</span><strong>{mxn(NIVAL_PAY_FOUNDER_PRICE_CENTS)}</strong><small>pago único</small><p>Todo Gratis + acceso físico para acercar el celular + 3 apartados de cobro.</p>{canBuyDirect
  ? <form action={startMercadoPagoCheckout}><CheckoutSubmitButton pendingLabel="Abriendo Mercado Pago…">Comprar Nival Pay Pro</CheckoutSubmitButton></form>
  : <Link href={payProUrl}>Comprar Nival Pay Pro</Link>}</article>
      </div>

      <div className="productPricingV3">
        <div className="pricingProductTitle"><span>NIVAL RESEÑAS</span><h3>Haz más fácil que te recomienden.</h3></div>
        <article><span>GRATIS</span><strong>$0</strong><p>QR y enlace directo a tus reseñas de Google.</p><Link href={reviewsFreeUrl}>Crear mi QR gratis</Link></article>
        <article className="featured"><span>PRO</span><strong>{mxn(NIVAL_REVIEWS_PRO_PRICE_CENTS)}</strong><small>pago único</small><p>Todo Gratis + acceso físico para que el cliente acerque el celular.</p>{canBuyDirect
  ? <form action={startNivalReviewsCheckout}><CheckoutSubmitButton pendingLabel="Abriendo Mercado Pago…">Comprar Nival Reseñas Pro</CheckoutSubmitButton></form>
  : <Link href={reviewsProUrl}>Comprar Nival Reseñas Pro</Link>}</article>
      </div>

      <div className="productPricingV3">
        <div className="pricingProductTitle"><span>NIVAL PUNTOS</span><h3>Dales una razón para volver.</h3></div>
        <article><span>GRATIS</span><strong>$0</strong><p>Programa de puntos para hasta {NIVAL_POINTS_FREE_CUSTOMER_LIMIT} clientes.</p><Link href={pointsFreeUrl}>Empezar gratis</Link></article>
        <article className="featured"><span>PRO</span><strong>{mxn(NIVAL_POINTS_FOUNDER_PRICE_CENTS)}</strong><small>al mes · {NIVAL_TRIAL_DAYS} días de prueba</small><p>Más capacidad, promociones y herramientas para actuar sobre la actividad de tus clientes.</p>{canBuyDirect
  ? <form action={startNivalPointsSubscription}><CheckoutSubmitButton pendingLabel="Abriendo Mercado Pago…">Activar Nival Puntos Pro</CheckoutSubmitButton></form>
  : <Link href={pointsProUrl}>Probar Nival Puntos Pro</Link>}</article>
      </div>

      <div className="landingPlanHelp"><span>¿No sabes cuál elegir?</span><p>Cuéntame cómo funciona tu negocio y te digo por dónde empezaría.</p><a href={whatsappHref} target="_blank" rel="noreferrer">Escribir por WhatsApp</a></div>
    </section>

    <section className="landingFinalCta landingV3Final scrollReveal">
      <p className="landingEyebrow">SIN COMPLICAR TU NEGOCIO</p><h2>Empieza con un problema real. No con diez herramientas.</h2>
      <div className="landingHeroActions"><a className="landingPrimary" href="#planes">Elegir un plan</a><Link className="landingSecondary" href="/demo">Ver demo</Link></div>
    </section>

    <footer className="landingFooter">
      <Link className="landingBrand" href="#inicio"><Image src="/wallet/nival-logo.svg" alt="" width={34} height={34}/><span>Nival Tech</span></Link>
      <p>Cobrar mejor. Conseguir más reseñas. Hacer que tus clientes regresen.</p>
      <div><a href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp</a><Link href="/support">Soporte</Link><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link><Link href="/refunds">Reembolsos</Link><Link href="/auth">Entrar</Link></div>
    </footer>
  </main>;
}
