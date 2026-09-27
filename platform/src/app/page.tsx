import Image from "next/image";
import Link from "next/link";
import { LandingReveal } from "./landing-reveal";
import { LandingLivePreviews } from "./landing-live-previews";
import { LandingProductVisuals } from "./landing-product-visuals";
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
const signupUrl = "/auth?mode=signup";
const payFreeUrl = "/auth?mode=signup&next=%2Fdashboard%2Fpay";
const payProUrl = "/auth?mode=signup&next=%2Fcheckout";
const reviewsFreeUrl = "/auth?mode=signup&next=%2Fdashboard%2Freviews";
const reviewsProUrl = "/auth?mode=signup&next=%2Fdashboard%2Freviews%3Fplan%3Dpro";
const pointsFreeUrl = "/auth?mode=signup&next=%2Fdashboard%2Fpoints";
const pointsProUrl = "/auth?mode=signup&next=%2Fdashboard%2Fpoints%3Fview%3Dpro";
const bundleUrl = "/auth?mode=signup&next=%2Fdashboard%2Fpoints%3Fview%3Dpro%26offer%3Dlaunch_bundle";

const Check = () => <span className="planCheck" aria-hidden="true">✓</span>;
const Cross = () => <span className="planCross" aria-hidden="true">×</span>;

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const membership = user ? await getActiveBusinessMembership(user.id) : null;
  const canBuyDirect = Boolean(membership && ['owner','manager'].includes(membership.role));

  return <main className="landing landingV4" id="inicio">
    <LandingReveal />

    <nav className="landingNav landingV3Nav" aria-label="Navegación principal">
      <Link className="landingBrand" href="#inicio"><Image src="/wallet/nival-logo.svg" alt="" width={38} height={38} priority/><span>Nival Tech</span></Link>
      <div className="landingNavLinks"><a href="#productos">Productos</a><a href="#comparar">Comparar</a><a href="#planes">Planes</a></div>
      <div className="landingNavCtas"><Link className="landingLogin" href="/auth">Entrar</Link></div>
    </nav>

    <section className="landingV4Hero">
      <div className="landingV4HeroCopy">
        <p className="landingKicker heroReveal heroReveal1"><span/> Tecnología para negocios que quieren crecer</p>
        <h1 className="heroReveal heroReveal2">Haz fácil que te paguen, vuelvan y te recomienden.</h1>
        <p className="heroReveal heroReveal3">Nival convierte tres tareas repetitivas de tu negocio en experiencias simples para ti y para tus clientes.</p>
        <div className="landingHeroActions heroReveal heroReveal4">
          <a className="landingPrimary" href="#planes">Ver planes</a>
          <Link className="landingSecondary" href="/demo">Ver demo →</Link>
        </div>
        <div className="landingDemoMicrocopy heroReveal heroReveal5">
          <b>¿Quieres entenderlo antes de registrarte?</b>
          <span>La demo te guía paso a paso por Pay, Puntos y Reseñas y te enseña exactamente lo que verá tu cliente.</span>
        </div>
      </div>
      <LandingProductVisuals />
    </section>

    <Link className="stickyDemoButton" href="/demo"><span>Ver demo</span><b>→</b></Link>

    <section className="landingQuickValue scrollReveal">
      <article><span>01</span><strong>Nival Pay</strong><p>Haz más fácil que te paguen.</p></article>
      <article><span>02</span><strong>Nival Reseñas</strong><p>Haz más fácil que te recomienden.</p></article>
      <article><span>03</span><strong>Nival Puntos</strong><p>Haz más fácil que regresen.</p></article>
    </section>

    <LandingLivePreviews />

    <section className="landingIdentity scrollReveal">
      <div className="landingSectionHeading compact"><p className="landingEyebrow landingEyebrowLarge">¿QUÉ ES NIVAL TECH?</p><h2>Tres herramientas para momentos que ya pasan todos los días en tu negocio.</h2></div>
      <div className="landingInfoTable">
        <div><span>QUÉ ES</span><strong>Una plataforma de herramientas digitales para cobrar, generar recurrencia y facilitar recomendaciones.</strong></div>
        <div><span>PARA QUIÉN</span><strong>Negocios con clientes recurrentes, cobros por transferencia o una experiencia que vale la pena recomendar.</strong></div>
        <div><span>CÓMO FUNCIONA</span><strong>Tú configuras una vez. Tu cliente abre el acceso desde su celular y sigue una experiencia clara.</strong></div>
        <div><span>PRODUCTOS</span><strong>Nival Pay · Nival Reseñas · Nival Puntos</strong></div>
        <div><span>OBJETIVO</span><strong>Quitar fricción en momentos que afectan ventas, recurrencia y reputación.</strong></div>
        <div><span>AYUDA</span><strong>Soporte directo por WhatsApp en español.</strong></div>
      </div>
      <a className="landingWhatsAppButton" href={whatsappHref} target="_blank" rel="noreferrer">Hablar por WhatsApp →</a>
    </section>

    <section className="landingPointsFocus landingPointsFocusV4 scrollReveal">
      <div>
        <p className="landingEyebrow landingEyebrowLarge">NIVAL PUNTOS PRO</p>
        <h2>Los puntos son solo el inicio.</h2>
        <p>Pro usa la actividad real de tus clientes para ayudarte a decidir qué hacer después.</p>
      </div>
      <div className="landingDataCards">
        <article><span>1</span><strong>Detecta</strong><p>Ve quién vuelve y quién dejó de hacerlo.</p></article>
        <article><span>2</span><strong>Actúa</strong><p>Identifica a quién tiene sentido contactar.</p></article>
        <article><span>3</span><strong>Mide</strong><p>Prueba campañas y revisa qué pasó después.</p></article>
      </div>
    </section>

    <section className="landingComparisons landingComparisonsV4 scrollReveal" id="comparar">
      <div className="landingSectionHeading compact"><p className="landingEyebrow landingEyebrowLarge">¿POR QUÉ CAMBIAR?</p><h2>La diferencia debe entenderse sin mover una tabla.</h2></div>

      <div className="mobileComparisonCard">
        <h3>Nival Pay <span>vs.</span> dictar tu CLABE</h3>
        <div><strong>Tu cliente paga</strong><b>Abre y copia</b><em>vs. pregunta y captura</em></div>
        <div><strong>Si cambias datos</strong><b>Editas una vez</b><em>vs. vuelves a explicar</em></div>
        <div><strong>Por WhatsApp</strong><b>Mandas un enlace</b><em>vs. escribes los datos</em></div>
        <div><strong>Experiencia</strong><b>Siempre igual y ordenada</b><em>vs. depende de quién atienda</em></div>
      </div>

      <div className="mobileComparisonCard">
        <h3>Nival Puntos Pro <span>vs.</span> fidelización básica</h3>
        <div><strong>Cliente</strong><b>Ve puntos y progreso</b><em>vs. solo acumula</em></div>
        <div><strong>Negocio</strong><b>Ve visitas y actividad</b><em>vs. registro básico</em></div>
        <div><strong>Promociones</strong><b>Usas datos reales</b><em>vs. mensajes generales</em></div>
        <div><strong>Decisiones</strong><b>Sabes a quién contactar</b><em>vs. revisas todo aparte</em></div>
      </div>
    </section>

    <section className="landingPlansV4 scrollReveal" id="planes">
      <div className="landingSectionHeading compact">
        <p className="landingEyebrow landingEyebrowLarge">EMPIEZA EN 3 PASOS</p>
        <h2>Primero crea tu cuenta. Luego configura tu negocio. Después decides si Free es suficiente o quieres subir a Pro.</h2>
      </div>

      <div className="landingStartSteps">
        <div><span>1</span><strong>Crea tu cuenta</strong><p>Correo y contraseña.</p></div>
        <div><span>2</span><strong>Configura tu negocio</strong><p>Solo los datos necesarios.</p></div>
        <div><span>3</span><strong>Sube a Pro cuando quieras</strong><p>Puedes empezar gratis.</p></div>
      </div>

      <div className="planCompareCard">
        <header><div><span>NIVAL PAY</span><h3>Haz más fácil que te paguen.</h3></div><b>Pago único</b></header>
        <div className="planCompareColumns">
          <article>
            <div className="planHead"><span>FREE</span><strong>$0</strong></div>
            <ul>
              <li><Check/> Página de cobro</li>
              <li><Check/> QR y enlace para compartir</li>
              <li><Check/> Datos editables</li>
              <li><Cross/> Acceso físico acercando el celular</li>
              <li><Cross/> 3 apartados de cobro</li>
            </ul>
            <Link href={payFreeUrl}>Iniciar con Free</Link>
          </article>
          <article className="pro">
            <div className="planHead"><span>PRO</span><strong>{mxn(NIVAL_PAY_FOUNDER_PRICE_CENTS)}</strong><small>una sola vez</small></div>
            <ul>
              <li><Check/> Página de cobro</li>
              <li><Check/> QR y enlace para compartir</li>
              <li><Check/> Datos editables</li>
              <li><Check/> Acceso físico acercando el celular</li>
              <li><Check/> 3 apartados de cobro</li>
            </ul>
            {canBuyDirect
              ? <form action={startMercadoPagoCheckout}><CheckoutSubmitButton className="landingPlanPayButton" pendingLabel="Abriendo Mercado Pago…">Pagar Pro</CheckoutSubmitButton></form>
              : <Link href={payProUrl}>Pagar Pro</Link>}
          </article>
        </div>
      </div>

      <div className="planCompareCard">
        <header><div><span>NIVAL RESEÑAS</span><h3>Haz más fácil que te recomienden.</h3></div><b>Pago único</b></header>
        <div className="planCompareColumns">
          <article>
            <div className="planHead"><span>FREE</span><strong>$0</strong></div>
            <ul>
              <li><Check/> QR para reseñas</li>
              <li><Check/> Enlace directo a Google</li>
              <li><Check/> Destino editable</li>
              <li><Cross/> Acceso físico acercando el celular</li>
            </ul>
            <Link href={reviewsFreeUrl}>Iniciar con Free</Link>
          </article>
          <article className="pro">
            <div className="planHead"><span>PRO</span><strong>{mxn(NIVAL_REVIEWS_PRO_PRICE_CENTS)}</strong><small>una sola vez</small></div>
            <ul>
              <li><Check/> QR para reseñas</li>
              <li><Check/> Enlace directo a Google</li>
              <li><Check/> Destino editable</li>
              <li><Check/> Acceso físico acercando el celular</li>
            </ul>
            {canBuyDirect
              ? <form action={startNivalReviewsCheckout}><CheckoutSubmitButton className="landingPlanPayButton" pendingLabel="Abriendo Mercado Pago…">Pagar Pro</CheckoutSubmitButton></form>
              : <Link href={reviewsProUrl}>Pagar Pro</Link>}
          </article>
        </div>
      </div>

      <div className="planCompareCard">
        <header><div><span>NIVAL PUNTOS</span><h3>Dales una razón para regresar.</h3></div><b>Mensual</b></header>
        <div className="planCompareColumns">
          <article>
            <div className="planHead"><span>FREE</span><strong>$0</strong></div>
            <ul>
              <li><Check/> Hasta {NIVAL_POINTS_FREE_CUSTOMER_LIMIT} clientes</li>
              <li><Check/> Puntos, visitas y recompensas</li>
              <li><Check/> Tarjeta digital del cliente</li>
              <li><Cross/> Promociones avanzadas</li>
              <li><Cross/> Acciones basadas en actividad</li>
            </ul>
            <Link href={pointsFreeUrl}>Iniciar con Free</Link>
          </article>
          <article className="pro">
            <div className="planHead"><span>PRO</span><strong>{mxn(NIVAL_POINTS_FOUNDER_PRICE_CENTS)}</strong><small>al mes · {NIVAL_TRIAL_DAYS} días de prueba</small></div>
            <ul>
              <li><Check/> Todo lo de Free</li>
              <li><Check/> Más capacidad de clientes</li>
              <li><Check/> Promociones y seguimiento</li>
              <li><Check/> Actividad para detectar oportunidades</li>
              <li><Check/> Herramientas para crear y medir campañas</li>
            </ul>
            {canBuyDirect
              ? <form action={startNivalPointsSubscription}><CheckoutSubmitButton className="landingPlanPayButton" pendingLabel="Abriendo Mercado Pago…">Probar Pro</CheckoutSubmitButton></form>
              : <Link href={pointsProUrl}>Probar Pro</Link>}
          </article>
        </div>
      </div>

      <div className="landingBundle">
        <div>
          <span>PAQUETE DE LANZAMIENTO</span>
          <h3>Nival Puntos Pro + Nival Reseñas + 90% de descuento en Nival Pay.</h3>
          <p>Empieza por fidelizar y añade las otras dos herramientas con una oferta de lanzamiento.</p>
        </div>
        <ul>
          <li><Check/> Nival Puntos Pro</li>
          <li><Check/> Nival Reseñas Pro incluido</li>
          <li><Check/> 90% de descuento en Nival Pay Pro</li>
        </ul>
        <Link href={bundleUrl}>Quiero este paquete →</Link>
      </div>

      <div className="plansFinalAction">
        <p>¿Todavía no sabes cuál elegir? Puedes crear tu cuenta gratis y decidir después.</p>
        <Link href={signupUrl}>Crear mi cuenta →</Link>
      </div>
    </section>

    <footer className="landingFooter">
      <Link className="landingBrand" href="#inicio"><Image src="/wallet/nival-logo.svg" alt="" width={34} height={34}/><span>Nival Tech</span></Link>
      <p>Cobrar mejor. Conseguir más reseñas. Hacer que tus clientes regresen.</p>
      <div><a href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp</a><Link href="/support">Soporte</Link><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link><Link href="/refunds">Reembolsos</Link><Link href="/auth">Entrar</Link></div>
    </footer>
  </main>;
}
