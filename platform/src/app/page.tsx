import Image from "next/image";
import Link from "next/link";
import { PayDemo } from "./pay-demo";
import { LandingReveal } from "./landing-reveal";
import { createAdminClient } from "@/lib/supabase/admin";
import { NIVAL_GROWTH_PRICE_CENTS, NIVAL_PAY_FOUNDER_PRICE_CENTS, NIVAL_PAY_REGULAR_PRICE_CENTS, NIVAL_POINTS_FOUNDER_PRICE_CENTS, NIVAL_POINTS_FREE_CUSTOMER_LIMIT, NIVAL_POINTS_REGULAR_PRICE_CENTS, NIVAL_TRIAL_DAYS, mxn } from "@/lib/commercial";

const signupUrl = "/auth?mode=signup&next=%2Fdashboard%2Fpay";
const payProUrl = "/auth?mode=signup&next=%2Fcheckout";

export default async function Home({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const params = await searchParams;
  const { data: legal } = await createAdminClient().from('site_legal_settings').select('phone').eq('id', 'default').maybeSingle();
  const rawSalesPhone = String(legal?.phone ?? '').replace(/\D/g, '');
  const salesPhone = rawSalesPhone.length === 10 ? `52${rawSalesPhone}` : rawSalesPhone;
  const salesMessage = 'Hola, vi Nival Tech y quiero saber qué solución conviene para mi negocio. Mi negocio es: ';
  const salesWhatsappHref = salesPhone ? `https://wa.me/${salesPhone}?text=${encodeURIComponent(salesMessage)}` : '/support';
  const source = params.from === 'nival-pay' || params.from === 'nival-puntos' || params.from === 'perfil-negocio' ? params.from : null;
  const sourceContext = source === 'nival-pay'
    ? { eyebrow: 'LLEGASTE DESDE UNA NIVAL PAY', title: '¿Te gustó lo fácil que fue encontrar los datos para pagar?', text: 'Tu negocio puede empezar con una Nival Pay gratis: página, QR y enlace. Si después necesitas NFC y más herramientas, puedes ampliar sin cambiar tu QR.', href: '/auth?mode=signup&next=%2Fdashboard%2Fpay', cta: 'Crear la mía gratis' }
    : source === 'nival-puntos'
      ? { eyebrow: 'LLEGASTE DESDE NIVAL PUNTOS', title: '¿Quieres un programa de clientes frecuentes como el que acabas de ver?', text: 'Puedes empezar gratis con clientes reales, puntos y recompensas. Paga cuando necesites más capacidad y herramientas.', href: '/auth?mode=signup&next=%2Fdashboard%2Fpoints', cta: 'Crear mi programa gratis' }
      : source === 'perfil-negocio'
        ? { eyebrow: 'LLEGASTE DESDE UNA PÁGINA NIVAL', title: 'Tu negocio también puede tener un acceso simple para cobro, puntos, contacto y enlaces.', text: 'Nival reúne herramientas pensadas para negocios locales sin obligarte a cambiar cómo trabajas.', href: '#productos', cta: 'Ver soluciones' }
        : null;
  return (
    <main className="landing" id="inicio">
      <LandingReveal />
      <nav className="landingNav" aria-label="Navegación principal">
        <Link className="landingBrand" href="#inicio" aria-label="Nival Tech, inicio">
          <Image src="/wallet/nival-logo.svg" alt="" width={38} height={38} priority />
          <span>Nival Tech</span>
        </Link>
        <div className="landingNavLinks">
          <a href="#productos">Productos</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#precio">Precios</a>
          <a href="#empieza-gratis">Empieza gratis</a>
        </div>
        <div className="landingNavCtas">
          <a className="landingTalk" href={salesWhatsappHref} target={salesPhone ? "_blank" : undefined} rel={salesPhone ? "noreferrer" : undefined}>Hablar con Nival</a>
          <Link className="landingLogin" href="/auth">Mi cuenta</Link>
        </div>
      </nav>

      {sourceContext && <section className="sourceArrival" aria-label="Conoce Nival Tech">
        <div><span>{sourceContext.eyebrow}</span><strong>{sourceContext.title}</strong><p>{sourceContext.text}</p></div>
        <a href={sourceContext.href}>{sourceContext.cta} <b>→</b></a>
      </section>}

      <section className="landingHero">
        <div className="landingHeroCopy">
          <p className="landingKicker heroReveal heroReveal1"><span /> Tecnología para negocios locales</p>
          <h1 className="heroReveal heroReveal2">
            <span>Haz más fácil cobrar,</span>
            <span>lograr que tus clientes vuelvan</span>
            <span>y saber qué hacer para crecer.</span>
          </h1>
          <p className="landingHeroLead heroReveal heroReveal3">Cobros, lealtad e inteligencia para negocios locales, sin obligarte a cambiar la forma en que ya trabajas.</p>
          <div className="landingHeroActions heroReveal heroReveal4">
            <Link className="landingPrimary" href={signupUrl}>Empezar gratis <b>→</b></Link>
            <a className="landingSecondary" href="#demostracion">Ver cómo funciona</a>
          </div>
          <div className="landingHeroPromise heroReveal heroReveal5">
            <span><b>Pay</b> gratis digital</span>
            <span><b>Puntos</b> {NIVAL_TRIAL_DAYS} días Pro</span>
            <span><b>Growth</b> cuando ya tengas actividad</span>
          </div>
        </div>

        <div className="landingProductVisual heroVisualReveal" aria-label="Vista previa de Nival Pay">
          <div className="nfcCardMockup">
            <div className="nfcCardTop">
              <span className="nfcMonogram">N</span>
              <span className="nfcSignal" aria-hidden="true">)))</span>
            </div>
            <div>
              <small>NIVAL PAY</small>
              <strong>Acerca tu celular<br />para pagar</strong>
            </div>
          </div>
          <div className="phoneMockup">
            <div className="phoneSpeaker" />
            <div className="phoneScreen">
              <div className="demoAvatar">CN</div>
              <small>DATOS PARA TRANSFERENCIA</small>
              <h2>Café Nival</h2>
              <div className="phoneField"><span>Titular</span><b>Café Nival Demo</b></div>
              <div className="phoneField"><span>Banco</span><b>Banco Ejemplo</b></div>
              <div className="phoneField"><span>CLABE</span><b>012 180 015022688507</b></div>
              <div className="phoneField"><span>Concepto</span><b>Pago de consumo</b></div>
              <div className="phoneCopy">Copiar CLABE</div>
            </div>
          </div>
          <p className="landingVisualNote">No guardamos NIP, CVV ni contraseñas.</p>
        </div>
      </section>

      <section className="landingSalesAssurance scrollReveal" aria-label="Lo esencial de Nival">
        <div><strong>Abre. Toca. Listo.</strong><span>QR, enlace y NFC sin instalar una app.</span></div>
        <div><strong>Empieza sin riesgo</strong><span>Prueba Pay gratis y Puntos Pro antes de decidir.</span></div>
        <div><strong>Diseñado para celular</strong><span>La experiencia pública está pensada para resolverse en segundos.</span></div>
      </section>

      <section className="nivalEcosystem scrollReveal" id="productos">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">UN SISTEMA, TRES TRABAJOS</p>
          <h2>Tres productos. Una sola lógica.</h2>
          <p>Resuelve primero lo urgente y amplía después. No necesitas comprar todo para empezar.</p>
        </div>
        <div className="nivalProductCards">
          <article>
            <span>01 · COBRAR</span>
            <h3>Nival Pay</h3>
            <p>Una página clara con tus datos de pago, QR y enlace. Activa NFC cuando quieras llevarla al mostrador.</p>
            <ul className="landingProductMiniList"><li>QR y enlace permanentes</li><li>Datos editables</li><li>Sin app para tu cliente</li></ul>
            <div><strong>Gratis digital</strong><small>Pro fundador: {mxn(NIVAL_PAY_FOUNDER_PRICE_CENTS)} pago único</small></div>
            <Link href={signupUrl}>Crear Nival Pay gratis <b>→</b></Link>
          </article>
          <article>
            <span>02 · HACER QUE VUELVAN</span>
            <h3>Nival Puntos</h3>
            <p>Convierte visitas en progreso visible. Tu cliente suma, ve su recompensa y tiene una razón concreta para regresar.</p>
            <ul className="landingProductMiniList"><li>Clientes y visitas</li><li>Tarjeta digital</li><li>Recompensas configurables</li></ul>
            <div><strong>{NIVAL_TRIAL_DAYS} días Pro</strong><small>Después puedes seguir Free</small></div>
            <Link href="/auth?mode=signup&next=%2Fdashboard%2Fpoints">Crear mi programa <b>→</b></Link>
          </article>
          <article className="featured">
            <span>03 · CRECER</span>
            <h3>Nival Growth</h3>
            <p>Usa lo que pasa en Puntos para detectar a quién recuperar, qué clientes cuidar y qué acción conviene probar.</p>
            <ul className="landingProductMiniList"><li>Puntos Pro incluido</li><li>Intelligence</li><li>Campañas y medición</li></ul>
            <div><strong>{mxn(NIVAL_GROWTH_PRICE_CENTS)}/mes</strong><small>Puntos Pro + Intelligence</small></div>
            <Link href="/products#growth">Conocer Growth <b>→</b></Link>
          </article>
        </div>
      </section>

      <section className="landingCustomService scrollReveal">
        <div>
          <p className="landingEyebrow">SERVICIO A LA MEDIDA</p>
          <h2>¿También necesitas una página web para tu negocio?</h2>
          <p>También podemos diseñar y publicar una página web profesional adaptada a tu marca y al objetivo real del negocio. Se cotiza aparte según el alcance.</p>
        </div>
        <div className="landingCustomServiceActions">
          <span>Landing · catálogo · WhatsApp · formularios · reservas · integraciones</span>
          <a href={salesWhatsappHref} target={salesPhone ? "_blank" : undefined} rel={salesPhone ? "noreferrer" : undefined}>Cotizar por WhatsApp →</a>
        </div>
      </section>

      <section className="landingSection landingProblem scrollReveal" id="como-funciona">
        <div className="landingSectionHeading">
          <p className="landingEyebrow">ASÍ DE SIMPLE</p>
          <h2>Tu cliente entiende qué hacer sin preguntarte.</h2>
        </div>
        <div className="stepsGrid">
          <article>
            <span>01</span>
            <h3>Configura una vez</h3>
            <p>Agrega tu negocio y datos. Nival genera tu página, enlace y QR permanente.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Compártelo donde ya cobras</h3>
            <p>Usa el QR, enlace o NFC. El cliente abre la experiencia en su propio celular.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Amplía solo si te sirve</h3>
            <p>Conserva el mismo QR y activa NFC, más apartados o Puntos cuando tu operación lo necesite.</p>
          </article>
        </div>
      </section>

      <section className="landingDemoSection scrollReveal" id="demostracion">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">PRUÉBALO</p>
          <h2>Así lo verá tu cliente.</h2>
          <p>Los siguientes datos son ficticios. Toca cualquier campo para probar la experiencia.</p>
        </div>
        <PayDemo />
      </section>

      <section className="landingPointsShowcase scrollReveal" aria-labelledby="points-demo-title">
        <div className="landingPointsCopy">
          <p className="landingEyebrow">NIVAL PUNTOS EN LA VIDA REAL</p>
          <h2 id="points-demo-title">“A las 10 visitas, tu recompensa está lista.”</h2>
          <p>El cliente se registra una sola vez. Después ve su avance desde el celular, muestra su código al visitar y recibe la recompensa cuando llega a la meta.</p>
          <div className="landingPointsFlow">
            <span><b>1</b> Escanea tu QR</span>
            <span><b>2</b> Crea su tarjeta</span>
            <span><b>3</b> Suma visitas</span>
            <span><b>4</b> Canjea el premio</span>
          </div>
          <Link className="landingPrimary" href="/auth?mode=signup&next=%2Fdashboard%2Fpoints">Crear mi programa gratis</Link>
        </div>
        <div className="landingPointsPhone" aria-label="Ejemplo de tarjeta digital de Nival Puntos">
          <div className="landingPointsCard">
            <div className="landingPointsBrand"><span>CN</span><div><small>PROGRAMA DE CLIENTES FRECUENTES</small><strong>Café Nival</strong></div></div>
            <div className="landingPointsBalance"><strong>7</strong><span>de 10 visitas</span></div>
            <div className="landingPointsBar"><i /></div>
            <div className="landingPointsReward"><small>PRÓXIMA RECOMPENSA</small><strong>Café de la casa gratis</strong><span>Te faltan 3 visitas</span></div>
            <div className="landingPointsButtons"><b>＋ Sumar visita</b><b>★ Mis premios</b></div>
          </div>
          <span className="landingWalletBadge">Tarjeta digital · QR · Google Wallet en Android</span>
        </div>
      </section>

      <section className="landingBusinessPlans scrollReveal" id="precio" aria-labelledby="planes-title">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">PRECIOS PENSADOS PARA CRECER</p>
          <h2 id="planes-title">Precios claros. Sin obligarte a comprar de más.</h2>
          <p>Empieza gratis donde tiene sentido y paga solo cuando necesitas la siguiente capa.</p>
        </div>
        <div className="landingBusinessPlanGrid">
          <article><span>NIVAL PAY</span><strong>{mxn(NIVAL_PAY_FOUNDER_PRICE_CENTS)}</strong><small>pago único · fundador</small><p>Digital gratis para siempre. Pro agrega NFC física y 3 apartados.</p><em>Regular previsto: {mxn(NIVAL_PAY_REGULAR_PRICE_CENTS)}</em><Link className="landingPlanAction" href={signupUrl}>Empezar con Pay →</Link></article>
          <article className="featured"><span>NIVAL PUNTOS PRO</span><strong>{mxn(NIVAL_POINTS_FOUNDER_PRICE_CENTS)}</strong><small>al mes · fundador</small><p>{NIVAL_TRIAL_DAYS} días de herramientas Pro. Después puedes seguir Free hasta {NIVAL_POINTS_FREE_CUSTOMER_LIMIT} clientes.</p><em>Regular previsto: {mxn(NIVAL_POINTS_REGULAR_PRICE_CENTS)}/mes</em><Link className="landingPlanAction" href="/auth?mode=signup&next=%2Fdashboard%2Fpoints">Probar Puntos →</Link></article>
          <article><span>NIVAL GROWTH</span><strong>{mxn(NIVAL_GROWTH_PRICE_CENTS)}</strong><small>al mes</small><p>Puntos Pro + Intelligence para recuperar, segmentar, lanzar campañas y medir resultados.</p><em>La expansión natural cuando Puntos ya genera actividad.</em><Link className="landingPlanAction" href="/products#growth">Ver Growth →</Link></article>
        </div>
        <Link className="landingCompareLink" href="/products">Ver comparación completa de planes →</Link>
      </section>

      <section className="landingTrust scrollReveal" aria-labelledby="trust-title">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">CONTROL Y CONFIANZA</p>
          <h2 id="trust-title">Simple por fuera. Serio por dentro.</h2>
          <p>La experiencia del cliente es sencilla, mientras tu negocio mantiene control sobre acceso, datos y configuración.</p>
        </div>
        <div className="landingTrustGrid">
          <article><span>01</span><strong>Espacios de trabajo separados</strong><p>Cada negocio mantiene su configuración, clientes y productos dentro de su propio contexto operativo.</p></article>
          <article><span>02</span><strong>Roles para el equipo</strong><p>Propietarios, managers y staff pueden tener responsabilidades distintas dentro de la operación.</p></article>
          <article><span>03</span><strong>Consentimiento para marketing</strong><p>Las acciones comerciales de Intelligence respetan el consentimiento registrado antes de incluir a una persona en una audiencia.</p></article>
          <article><span>04</span><strong>Sin secretos bancarios</strong><p>Nival Pay muestra la información que el negocio decide compartir; no necesita NIP, CVV ni contraseñas bancarias.</p></article>
        </div>
      </section>

      <section className="landingFaq scrollReveal">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">PREGUNTAS FRECUENTES</p>
          <h2>Antes de empezar.</h2>
        </div>
        <div className="faqList">
          <details>
            <summary>¿Mi cliente necesita instalar algo?</summary>
            <p>No. Nival abre en el navegador desde QR, enlace o NFC. En Puntos, también puede guardar su tarjeta digital en Google Wallet cuando esté disponible en su dispositivo.</p>
          </details>
          <details>
            <summary>¿Nival Pay procesa mi dinero?</summary>
            <p>No. Nival Pay muestra los datos que tú decides compartir para que el cliente transfiera directamente desde su banco.</p>
          </details>
          <details>
            <summary>¿Puedo cambiar mis datos después?</summary>
            <p>Sí. Puedes actualizar banco, titular, CLABE y contenido sin cambiar el enlace, QR o tarjeta ya programada.</p>
          </details>
          <details>
            <summary>¿Qué diferencia hay entre Puntos y Growth?</summary>
            <p>Puntos registra clientes, visitas y recompensas. Growth incluye Puntos Pro + Intelligence para detectar oportunidades y ayudarte a actuar sobre esa actividad.</p>
          </details>
        </div>
      </section>

      <section className="landingFinalCta scrollReveal" id="empieza-gratis">
        <p className="landingEyebrow">EMPIEZA POR UN PROBLEMA</p>
        <h2>No necesitas comprar todo.<br />Empieza por lo que tu negocio necesita hoy.</h2>
        <p>Pay si quieres cobrar más fácil. Puntos si quieres que regresen. Growth cuando Puntos ya esté generando actividad que puedas convertir en decisiones y campañas.</p>
        <div className="landingHeroActions">
          <Link className="landingPrimary" href={signupUrl}>Crear mi cuenta gratis</Link>
          <a className="landingSecondary" href={salesWhatsappHref} target={salesPhone ? "_blank" : undefined} rel={salesPhone ? "noreferrer" : undefined}>Hablar con Nival</a>
        </div>
      </section>

      <Link className="landingMobileContact" href={signupUrl}>Empezar gratis →</Link>

      <footer className="landingFooter">
        <Link className="landingBrand" href="#inicio">
          <Image src="/wallet/nival-logo.svg" alt="" width={34} height={34} />
          <span>Nival Tech</span>
        </Link>
        <p>Cobra, fideliza y crece con herramientas hechas para negocios locales.</p>
        <div><Link href="/support">Soporte</Link><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link><Link href="/cookies">Cookies</Link><Link href="/refunds">Reembolsos</Link><Link href="/auth">Mi cuenta</Link></div>
      </footer>
    </main>
  );
}
