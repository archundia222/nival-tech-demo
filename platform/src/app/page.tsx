import Image from "next/image";
import Link from "next/link";
import { PayDemo } from "./pay-demo";
import { LandingReveal } from "./landing-reveal";

const signupUrl = "/auth?mode=signup&next=%2Fdashboard%2Fpay";
const payProUrl = "/auth?mode=signup&next=%2Fcheckout";

export default async function Home({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const params = await searchParams;
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
          <a href="#precio">Nival Pay</a>
        </div>
        <Link className="landingLogin" href="/auth">Mi cuenta</Link>
      </nav>

      {sourceContext && <section className="sourceArrival" aria-label="Conoce Nival Tech">
        <div><span>{sourceContext.eyebrow}</span><strong>{sourceContext.title}</strong><p>{sourceContext.text}</p></div>
        <a href={sourceContext.href}>{sourceContext.cta} <b>→</b></a>
      </section>}

      <section className="landingHero">
        <div className="landingHeroCopy">
          <p className="landingKicker heroReveal heroReveal1"><span /> Tecnología para negocios locales</p>
          <h1 className="heroReveal heroReveal2">Cobra mejor. Haz que vuelvan. Crece con lo que ya sabes de tus clientes.</h1>
          <p className="landingHeroLead heroReveal heroReveal3">Nival Pay facilita el cobro. Nival Puntos crea recurrencia. Nival Intelligence convierte la actividad del negocio en acciones concretas.</p>
          <div className="landingPriceLine heroReveal heroReveal4">
            <strong>Empieza gratis</strong>
            <span>usa el producto primero; paga cuando necesites más</span>
          </div>
          <div className="landingHeroActions heroReveal heroReveal5">
            <Link className="landingPrimary" href={signupUrl}>Empezar gratis</Link>
            <a className="landingSecondary" href="#productos">Ver productos</a>
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

      <section className="landingProof scrollReveal" aria-label="Beneficios principales">
        <p><strong>Cobrar</strong><span>sin fricción con Nival Pay</span></p>
        <p><strong>Hacer que vuelvan</strong><span>con Nival Puntos</span></p>
        <p><strong>Saber qué hacer</strong><span>con Nival Intelligence</span></p>
      </section>

      <section className="nivalEcosystem scrollReveal" id="productos">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">UN SISTEMA, TRES TRABAJOS</p>
          <h2>Empieza por el problema que más te cuesta hoy.</h2>
          <p>No necesitas comprar para empezar. Usa la versión gratis, comprueba el valor y amplía solo cuando el negocio lo necesite.</p>
        </div>
        <div className="nivalProductCards">
          <article>
            <span>COBRAR</span>
            <h3>Nival Pay</h3>
            <p>Empieza con una página de cobro, QR, enlace, tu marca y estadísticas básicas. Mantén el mismo QR si después activas NFC y más herramientas.</p>
            <div><strong>Gratis</strong><small>Completo: $199 MXN pago único</small></div>
            <Link href={signupUrl}>Crear mi Nival Pay gratis →</Link>
          </article>
          <article>
            <span>HACER QUE VUELVAN</span>
            <h3>Nival Puntos</h3>
            <p>Crea un programa real, registra visitas y entrega recompensas. El plan gratis llega hasta 30 clientes para que puedas comprobar si lo usan.</p>
            <div><strong>Gratis</strong><small>Pro: $199 MXN al mes</small></div>
            <Link href="/auth?mode=signup&next=%2Fdashboard%2Fpoints">Crear mi programa gratis →</Link>
          </article>
          <article className="featured">
            <span>CRECER</span>
            <h3>Nival Intelligence</h3>
            <p>Gratis te muestra la oportunidad principal. Pro desbloquea personas concretas, mensajes, campañas, medición y la siguiente acción.</p>
            <div><strong>Gratis</strong><small>Pro: $399 MXN · $449 con Puntos Pro</small></div>
            <Link href="/auth?mode=signup&next=%2Fdashboard%2Fintelligence">Activar Intelligence gratis →</Link>
          </article>
        </div>
      </section>

      <section className="nivalLoopSection scrollReveal" aria-labelledby="nival-loop-title">
        <div className="nivalLoopIntro"><p className="landingEyebrow">CUANDO LOS CONECTAS</p><h2 id="nival-loop-title">Cada interacción puede ayudarte con la siguiente.</h2><p>Nival no busca llenarte de módulos. La idea es que cobrar, generar recurrencia y decidir qué hacer después formen un mismo ciclo.</p></div>
        <div className="nivalLoopFlow">
          <article><span>01 · NIVAL PAY</span><strong>El cliente paga fácil.</strong><p>NFC, QR o enlace abren la información correcta sin volver a preguntarte cómo transferir.</p></article>
          <i aria-hidden="true">→</i>
          <article><span>02 · NIVAL PUNTOS</span><strong>Le das una razón para volver.</strong><p>La siguiente visita deja de depender solo de que el cliente se acuerde de ti.</p></article>
          <i aria-hidden="true">→</i>
          <article><span>03 · NIVAL INTELLIGENCE</span><strong>Nival te dice qué hacer después.</strong><p>Detecta riesgo, recurrencia y campañas para convertir actividad en acciones concretas.</p></article>
        </div>
        <small>Los tres pueden empezar gratis. Pro aparece cuando ya necesitas más capacidad, herramientas o automatización.</small>
      </section>

      <section className="landingSection landingProblem scrollReveal" id="como-funciona">
        <div className="landingSectionHeading">
          <p className="landingEyebrow">LO SIMPLE FUNCIONA</p>
          <h2>Del “te dicto mi CLABE” a cobrar con un toque.</h2>
        </div>
        <div className="stepsGrid">
          <article>
            <span>01</span>
            <h3>Crea tu Nival Pay gratis</h3>
            <p>Agrega negocio, banco, titular y CLABE. Obtienes una página, enlace y QR permanente.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Úsala con clientes reales</h3>
            <p>Comparte el enlace o imprime el QR. Puedes ver aperturas y copias de CLABE antes de pagar nada.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Amplía cuando tenga sentido</h3>
            <p>Activa Nival Pay completo para recibir la tarjeta NFC física, 3 apartados y las herramientas adicionales sin cambiar tu QR.</p>
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

      <section className="landingSection landingIncludes scrollReveal">
        <div className="landingSectionHeading">
          <p className="landingEyebrow">TODO LO NECESARIO</p>
          <h2>Una sola tarjeta.<br />Una página que sí puedes actualizar.</h2>
        </div>
        <div className="includesList">
          <div><span>01</span><p><strong>Tarjeta NFC física</strong> programada y lista para usar.</p></div>
          <div><span>02</span><p><strong>Página de pago personalizada</strong> con tu identidad y datos bancarios.</p></div>
          <div><span>03</span><p><strong>Código QR descargable</strong> para mostrador, menú o redes.</p></div>
          <div><span>04</span><p><strong>Enlace permanente</strong> que no cambia aunque actualices tus datos.</p></div>
        </div>
      </section>

      <section className="landingPriceSection scrollReveal" id="precio">
        <div className="pricePitch">
          <p className="landingEyebrow">NIVAL PAY COMPLETO</p>
          <h2>Más fácil de pagar.<br />Más fácil de vender.</h2>
          <p>Empieza gratis con QR y enlace. Cuando quieras llevar Nival Pay físicamente a tu negocio, activa la versión completa.</p>
        </div>
        <article className="priceCard">
          <p>NIVAL PAY</p>
          <div className="priceAmount"><span>$</span><strong>199</strong><small>MXN</small></div>
          <p className="priceFrequency">Pago único. Sin mensualidad.</p>
          <ul>
            <li>1 tarjeta NFC personalizada</li>
            <li>Página de pago configurada</li>
            <li>Código QR del negocio</li>
            <li>3 apartados incluidos; adicionales por $49 MXN</li>
            <li>Datos editables sin cambiar la tarjeta</li>
          </ul>
          <Link className="landingPrimary dark" href={payProUrl}>Activar Nival Pay completo</Link>
          <small>Tu página, enlace y QR pueden empezar gratis. Al activar, conservas el mismo QR y agregas la tarjeta NFC física.</small>
        </article>
      </section>

      <section className="payExpansion scrollReveal" aria-labelledby="crece-con-pay">
        <div className="payExpansionCopy">
          <p className="landingEyebrow">CRECE CUANDO LO NECESITES</p>
          <h2 id="crece-con-pay">Un Nival Pay. Más puntos para cobrar.</h2>
          <p>Empieza con tu página, QR y tarjeta. Incluye 3 apartados para organizar tus cobros. Si necesitas más, agrega apartados adicionales por $49 MXN cada uno.</p>
        </div>
        <div className="payExpansionOptions">
          <article><span>APARTADO ADICIONAL</span><strong>$49 MXN</strong><p>Después de tus 3 apartados incluidos, agrega un enlace o bloque adicional a tu página de cobro.</p></article>
          <article><span>TARJETA NFC ADICIONAL</span><strong>$99 MXN</strong><p>Una tarjeta física extra vinculada al punto de cobro que elijas.</p></article>
        </div>
      </section>

      <section className="intelligenceTeaser intelligenceSecondary scrollReveal" id="intelligence">
        <div>
          <p className="landingEyebrow">NIVAL INTELLIGENCE</p>
          <h2>No te entrega datos para que tú averigües qué hacer.</h2>
          <p>Revisa recurrencia, riesgo, campañas y resultados para proponerte una acción concreta: a quién contactar, qué mensaje usar y qué observar después.</p>
          <div className="landingHeroActions"><Link className="landingPrimary" href="/auth?mode=signup&next=%2Fdashboard%2Fintelligence">Conocer Intelligence</Link></div>
        </div>
      </section>

      <section className="landingFaq scrollReveal">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">PREGUNTAS FRECUENTES</p>
          <h2>Antes de empezar.</h2>
        </div>
        <div className="faqList">
          <details>
            <summary>¿Necesito descargar una aplicación?</summary>
            <p>No. La página se abre en el navegador del celular al acercarlo a la tarjeta NFC o escanear el QR.</p>
          </details>
          <details>
            <summary>¿La tarjeta guarda mis datos bancarios?</summary>
            <p>No. La tarjeta solo contiene una liga. Tus datos viven en tu página y puedes actualizarlos sin reprogramar la tarjeta.</p>
          </details>
          <details>
            <summary>¿Nival Tech procesa el dinero?</summary>
            <p>No. Nival Pay muestra tus datos para que el cliente haga la transferencia directamente desde su banco.</p>
          </details>
          <details>
            <summary>¿Puedo cambiar mi CLABE después?</summary>
            <p>Sí. El enlace de tu tarjeta y QR permanece igual aunque actualices el banco, titular o CLABE.</p>
          </details>
        </div>
      </section>

      <section className="landingFinalCta scrollReveal">
        <p className="landingEyebrow">NIVAL PAY</p>
        <h2>Tu negocio ya acepta transferencias.<br />Ahora hazlo más fácil.</h2>
        <Link className="landingPrimary" href={signupUrl}>Quiero mi Nival Pay — $199</Link>
      </section>

      <footer className="landingFooter">
        <Link className="landingBrand" href="#inicio">
          <Image src="/wallet/nival-logo.svg" alt="" width={34} height={34} />
          <span>Nival Tech</span>
        </Link>
        <p>Cobra, fideliza y crece con herramientas hechas para negocios locales.</p>
        <div><Link href="/support">Soporte</Link><Link href="/privacy">Privacidad</Link><Link href="/auth">Mi cuenta</Link></div>
      </footer>
    </main>
  );
}
