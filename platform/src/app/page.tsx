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
  NIVAL_WIFI_PRO_PRICE_CENTS,
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
const wifiFreeUrl = "/auth?mode=signup&next=%2Fdashboard%2Fwifi";
const wifiProUrl = "/auth?mode=signup&next=%2Fdashboard%2Fwifi%3Fview%3Dpro";

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
        <h1 className="heroReveal heroReveal2">Haz más fácil que te paguen, vuelvan y te recomienden.</h1>
        <p className="heroReveal heroReveal3">Pagos, lealtad, reseñas y acceso WiFi en experiencias simples para tu negocio y para tus clientes.</p>
        <div className="landingHeroActions heroReveal heroReveal4">
          <a className="landingPrimary" href="#planes">Ver planes</a>
          <Link className="landingSecondary landingDemoPrimary" href="/demo"><span>▶</span> Ver demo guiada</Link>
        </div>
        <div className="landingHeroTrust heroReveal heroReveal5"><span>QR</span><span>NFC</span><span>Sin app para el cliente</span></div>
      </div>
      <LandingProductVisuals />
    </section>

    <Link className="stickyDemoButton" href="/demo"><span>Ver demo</span><b>→</b></Link>

    <LandingLivePreviews />

    <section className="landingIdentity landingIdentityCompact scrollReveal">
      <div className="landingSectionHeading compact">
        <p className="landingEyebrow landingEyebrowLarge">¿QUÉ ES NIVAL TECH?</p>
        <h2>Herramientas simples para momentos que ya pasan todos los días.</h2>
      </div>
      <div className="landingIdentityPills">
        <article><span>COBRA</span><strong>Tu cliente encuentra cómo pagarte sin preguntarte los datos.</strong></article>
        <article><span>HAZ QUE VUELVAN</span><strong>Convierte visitas en progreso, recompensas y actividad útil.</strong></article>
        <article><span>CONSIGUE RESEÑAS</span><strong>Llévalos directo a Google cuando la experiencia todavía está fresca.</strong></article>
        <article><span>CONECTA</span><strong>Nival WiFi simplifica el acceso a internet con QR o NFC.</strong></article>
      </div>
      <div className="landingNfcExplainer">
        <div className="nfcTechIcon">)))</div>
        <div><span>¿QUÉ ES NFC?</span><h3>Acercas el celular y se abre una acción.</h3><p>Es la tecnología que usa una Nival Card para abrir Pay, Puntos, Reseñas o WiFi sin escribir una dirección ni buscar una app.</p></div>
      </div>
      <a className="landingWhatsAppButton" href={whatsappHref} target="_blank" rel="noreferrer">Hablar por WhatsApp →</a>
    </section>

    <section className="landingPointsFocus landingPointsFocusV4 scrollReveal">
      <div>
        <p className="landingEyebrow landingEyebrowLarge">NIVAL PUNTOS PRO</p>
        <h2>Los puntos son solo el inicio.</h2>
        <p>Ve quién vuelve, a quién recuperar y qué pasó después de una campaña.</p>
      </div>
      <div className="landingDataCards">
        <article><span>1</span><strong>Detecta</strong><p>Frecuentes, por recuperar e inactivos.</p></article>
        <article><span>2</span><strong>Actúa</strong><p>Prepara una promoción para el grupo correcto.</p></article>
        <article><span>3</span><strong>Mide</strong><p>Revisa quién volvió y qué funcionó.</p></article>
      </div>
      <Link className="landingProDemoLink" href="/demo/puntos-pro">Ver Puntos Pro con datos de ejemplo →</Link>
    </section>

    <section className="landingComparisons landingComparisonsV4 scrollReveal" id="comparar">
      <div className="landingSectionHeading compact"><p className="landingEyebrow landingEyebrowLarge">LA DIFERENCIA, SIN ROLLOS</p><h2>Compara en segundos.</h2></div>

      <div className="landingComparisonTable">
        <header><strong>Nival Pay</strong><span>Forma tradicional</span></header>
        <div><b>Abre y copia</b><span>Pregunta y captura</span></div>
        <div><b>Editas una vez</b><span>Vuelves a explicar</span></div>
        <div><b>Compartes un enlace</b><span>Mandas datos sueltos</span></div>
        <div><b>La experiencia siempre es clara</b><span>Depende de quién atienda</span></div>
      </div>

      <div className="landingComparisonTable">
        <header><strong>Nival Puntos Pro</strong><span>Programa básico</span></header>
        <div><b>El cliente ve progreso</b><span>Solo acumula</span></div>
        <div><b>Ves actividad real</b><span>Registro básico</span></div>
        <div><b>Segmentas promociones</b><span>Mandas mensajes generales</span></div>
        <div><b>Mides quién volvió</b><span>No sabes qué funcionó</span></div>
      </div>
    </section>

    <section className="landingPlansV4 scrollReveal" id="planes">
      <div className="landingSectionHeading compact">
        <p className="landingEyebrow landingEyebrowLarge">PRUEBA LAS NIVAL CARDS</p>
        <h2>Prueba Pay, Reseñas y WiFi durante 15 días. Después, compra tu acceso permanente.</h2>
        <p>Cada Nival Card funciona durante 15 días con enlace y QR, sin tarjeta física. Al terminar la prueba, el acceso se suspende hasta comprar Pro. Pro incluye una tarjeta NFC física sin costo adicional.</p>
      </div>

      <div className="landingStartSteps">
        <div><span>1</span><strong>Crea tu cuenta</strong><p>Activa 15 días sin pagar.</p></div>
        <div><span>2</span><strong>Prueba desde tu celular</strong><p>Comparte el enlace y QR durante 15 días.</p></div>
        <div><span>3</span><strong>Hazlo permanente con Pro</strong><p>Compra Pro y recibe tu tarjeta NFC incluida.</p></div>
      </div>

      <div className="planCompareCard">
        <header><div><span>NIVAL PAY</span><h3>Haz más fácil que te paguen.</h3></div><b>Pago único</b></header>
        <div className="planCompareColumns">
          <article>
            <div className="planHead"><span>PRUEBA 15 DÍAS</span><strong>$0</strong></div>
            <ul>
              <li><Check/> Página de cobro</li>
              <li><Check/> Enlace para compartir</li>
              <li><Check/> Datos editables</li>
              <li><Check/> 1 punto de cobro</li>
              <li><Check/> QR y enlace durante 15 días</li>
              <li><Cross/> Tarjeta NFC física durante la prueba</li>
              <li><Check/> Acceso durante 15 días; después requiere Pro</li>
            </ul>
            <Link href={payFreeUrl}>Empezar prueba</Link>
          </article>
          <article className="pro">
            <div className="planHead"><span>PRO</span><strong>{mxn(NIVAL_PAY_FOUNDER_PRICE_CENTS)}</strong><small>una sola vez</small></div>
            <ul>
              <li><Check/> Página de cobro y enlace</li>
              <li><Check/> Datos editables</li>
              <li><Check/> Puntos de cobro ilimitados</li>
              <li><Check/> QR fijo listo para imprimir</li>
              <li><Check/> Nival Card física con NFC incluida</li>
              <li><Check/> Páginas Nival Pay adicionales: $99 cada una</li>
              <li><Check/> Tu cliente acerca el celular y abre tu cobro</li>
            </ul>
            {canBuyDirect
              ? <form action={startMercadoPagoCheckout}><CheckoutSubmitButton className="landingPlanPayButton" pendingLabel="Abriendo Mercado Pago…">Pagar Pro</CheckoutSubmitButton></form>
              : <Link href={payProUrl}>Pagar Pro</Link>}
          </article>
        </div>
      </div>

      <div className="planCompareCard">
        <header><div><span>NIVAL RESEÑAS</span><h3>Convierte una buena experiencia en una reseña.</h3></div><b>Pago único</b></header>
        <div className="planCompareColumns">
          <article>
            <div className="planHead"><span>PRUEBA 15 DÍAS</span><strong>$0</strong></div>
            <ul>
              <li><Check/> Enlace directo a Google</li>
              <li><Check/> Destino editable</li>
              <li><Check/> QR y enlace durante 15 días</li>
              <li><Cross/> Tarjeta NFC física durante la prueba</li>
              <li><Check/> Acceso durante 15 días; después requiere Pro</li>
            </ul>
            <Link href={reviewsFreeUrl}>Empezar prueba</Link>
          </article>
          <article className="pro">
            <div className="planHead"><span>PRO</span><strong>{mxn(NIVAL_REVIEWS_PRO_PRICE_CENTS)}</strong><small>una sola vez</small></div>
            <ul>
              <li><Check/> Enlace directo a Google</li>
              <li><Check/> Destino editable</li>
              <li><Check/> QR fijo listo para imprimir</li>
              <li><Check/> Nival Card física con NFC incluida</li>
              <li><Check/> Acercan el celular y llegan directo a dejar su reseña</li>
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
              <li><Check/> Tarjeta digital básica</li>
              <li><Check/> 1 recompensa activa</li>
              <li><Cross/> Google Wallet</li>
              <li><Cross/> Promociones y análisis de actividad</li>
            </ul>
            <Link href={pointsFreeUrl}>Iniciar con Free</Link>
          </article>
          <article className="pro">
            <div className="planHead"><span>PRO</span><strong>{mxn(NIVAL_POINTS_FOUNDER_PRICE_CENTS)}</strong><small>al mes · 7 días de prueba Pro</small></div>
            <ul>
              <li><Check/> Todo lo de Free</li>
              <li><Check/> Clientes sin límite del plan Free</li>
              <li><Check/> Google Wallet</li>
              <li><Check/> Promociones y seguimiento</li>
              <li><Check/> Detecta clientes frecuentes, inactivos y oportunidades</li>
              <li><Check/> Crea y mide campañas con actividad real</li>
            </ul>
            <div style={{display:'grid',gap:'14px',marginTop:'18px'}}>
              {canBuyDirect
                ? <form action={startNivalPointsSubscription}><CheckoutSubmitButton className="landingPlanPayButton" pendingLabel="Abriendo Mercado Pago…">Probar Pro</CheckoutSubmitButton></form>
                : <Link href={pointsProUrl}>Probar Pro</Link>}
              <Link className="planPreviewLink" href="/demo/puntos-pro">Ver demo Pro sin cuenta</Link>
            </div>
          </article>
        </div>
      </div>

      <div className="planCompareCard">
        <header><div><span>NIVAL WIFI</span><h3>Comparte un enlace para acceder al WiFi de invitados.</h3></div><b>Pago único</b></header>
        <div className="planCompareColumns">
          <article>
            <div className="planHead"><span>PRUEBA 15 DÍAS</span><strong>$0</strong></div>
            <ul>
              <li><Check/> Enlace de acceso a tu WiFi</li>
              <li><Check/> Enlace de WiFi editable</li>
              <li><Check/> QR y enlace durante 15 días</li>
              <li><Cross/> Tarjeta NFC física durante la prueba</li>
              <li><Check/> Acceso durante 15 días; después requiere Pro</li>
            </ul>
            <Link href={wifiFreeUrl}>Empezar prueba</Link>
          </article>
          <article className="pro">
            <div className="planHead"><span>PRO</span><strong>{mxn(NIVAL_WIFI_PRO_PRICE_CENTS)}</strong><small>una sola vez</small></div>
            <ul>
              <li><Check/> Enlace de acceso editable</li>
              <li><Check/> QR fijo listo para imprimir</li>
              <li><Check/> Nival Card física con NFC incluida</li>
              <li><Check/> El cliente acerca el celular y abre el acceso a tu red</li>
              <li><Check/> Cambias el enlace sin reemplazar la tarjeta</li>
            </ul>
            <Link href={wifiProUrl}>Conseguir Nival WiFi Pro</Link>
          </article>
        </div>
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
