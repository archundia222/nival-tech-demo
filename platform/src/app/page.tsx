import Image from "next/image";
import Link from "next/link";
import { PayDemo } from "./pay-demo";
import { IntelligenceWaitlist } from "./intelligence-waitlist";
import { LandingReveal } from "./landing-reveal";

const signupUrl = "/auth?mode=signup&next=%2Fcheckout";

export default function Home() {
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

      <section className="landingHero">
        <div className="landingHeroCopy">
          <p className="landingKicker heroReveal heroReveal1"><span /> Tecnología para negocios locales</p>
          <h1 className="heroReveal heroReveal2">Cobra mejor. Haz que vuelvan. Crece con lo que ya sabes de tus clientes.</h1>
          <p className="landingHeroLead heroReveal heroReveal3">Nival Pay facilita el cobro. Nival Puntos crea recurrencia. Nival Intelligence convierte la actividad del negocio en acciones concretas.</p>
          <div className="landingPriceLine heroReveal heroReveal4">
            <strong>Empieza desde $199 MXN</strong>
            <span>sin cambiar la forma en la que ya opera tu negocio</span>
          </div>
          <div className="landingHeroActions heroReveal heroReveal5">
            <Link className="landingPrimary" href={signupUrl}>Quiero Nival Pay</Link>
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
          <p>No necesitas comprar todo. Cada producto funciona por separado y juntos se vuelven más útiles.</p>
        </div>
        <div className="nivalProductCards">
          <article>
            <span>COBRAR</span>
            <h3>Nival Pay</h3>
            <p>Tu cliente abre una página limpia desde NFC o QR, copia tus datos y paga sin pedirte capturas ni volver a dictar la CLABE.</p>
            <div><strong>$199 MXN</strong><small>pago único</small></div>
            <Link href={signupUrl}>Crear mi Nival Pay →</Link>
          </article>
          <article>
            <span>HACER QUE VUELVAN</span>
            <h3>Nival Puntos</h3>
            <p>Registra visitas, entrega recompensas y crea una razón sencilla para que tus clientes regresen.</p>
            <div><strong>$199 MXN</strong><small>al mes</small></div>
            <Link href="/auth?mode=signup&next=%2Fdashboard%2Fpoints">Crear mi programa →</Link>
          </article>
          <article className="featured">
            <span>CRECER</span>
            <h3>Nival Intelligence</h3>
            <p>Detecta a quién recuperar, qué campaña hacer y qué funcionó. Menos tablas; más acciones concretas para el dueño.</p>
            <div><strong>$399 MXN</strong><small>al mes · $449 con Puntos</small></div>
            <Link href="/auth?mode=signup&next=%2Fdashboard%2Fintelligence">Ver Intelligence →</Link>
          </article>
        </div>
      </section>

      <section className="landingSection landingProblem scrollReveal" id="como-funciona">
        <div className="landingSectionHeading">
          <p className="landingEyebrow">LO SIMPLE FUNCIONA</p>
          <h2>Del “te dicto mi CLABE” a cobrar con un toque.</h2>
        </div>
        <div className="stepsGrid">
          <article>
            <span>01</span>
            <h3>Configura tu página</h3>
            <p>Agrega el nombre de tu negocio, banco, titular, CLABE, concepto, imagen y un enlace de pago opcional.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Recibe tu tarjeta</h3>
            <p>La entregamos programada con una liga única para tu negocio. También obtienes un código QR.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Empieza a cobrar</h3>
            <p>Tu cliente acerca su celular, verifica los datos y copia la CLABE sin errores ni capturas viejas.</p>
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
          <p className="landingEyebrow">PRECIO DE LANZAMIENTO</p>
          <h2>Más fácil de pagar.<br />Más fácil de vender.</h2>
          <p>Hecho para puestos, locales, profesionales independientes y negocios que reciben transferencias todos los días.</p>
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
          <Link className="landingPrimary dark" href={signupUrl}>Empezar mi configuración</Link>
          <small>El pago y la entrega de la tarjeta se confirman después de configurar tu página.</small>
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
