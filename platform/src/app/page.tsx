import Image from "next/image";
import Link from "next/link";
import { PayDemo } from "./pay-demo";
import { IntelligenceWaitlist } from "./intelligence-waitlist";

const signupUrl = "/auth?mode=signup&next=%2Fcheckout";

export default function Home() {
  return (
    <main className="landing" id="inicio">
      <nav className="landingNav" aria-label="Navegación principal">
        <Link className="landingBrand" href="#inicio" aria-label="Nival Tech, inicio">
          <Image src="/wallet/nival-logo.svg" alt="" width={38} height={38} priority />
          <span>Nival Tech</span>
        </Link>
        <div className="landingNavLinks">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#precio">Precio</a>
        </div>
        <Link className="landingLogin" href="/auth">Mi cuenta</Link>
      </nav>

      <section className="landingHero">
        <div className="landingHeroCopy">
          <p className="landingKicker heroReveal heroReveal1"><span /> Nival Pay ya está disponible</p>
          <h1 className="heroReveal heroReveal2">Cobra sin volver a dictar tu CLABE.</h1>
          <p className="landingHeroLead heroReveal heroReveal3">Acerca el celular a tu tarjeta NFC, abre tus datos de pago y copia la CLABE.</p>
          <div className="landingPriceLine heroReveal heroReveal4">
            <strong>$199 MXN</strong>
            <span>pago único · tarjeta NFC + página configurada</span>
          </div>
          <div className="landingHeroActions heroReveal heroReveal5">
            <Link className="landingPrimary" href={signupUrl}>Quiero mi Nival Pay</Link>
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

      <section className="landingProof" aria-label="Beneficios principales">
        <p><strong>Un toque</strong><span>para abrir tus datos</span></p>
        <p><strong>Un enlace</strong><span>para NFC y QR</span></p>
        <p><strong>Sin mensualidad</strong><span>pagas una sola vez</span></p>
      </section>

      <section className="landingSection landingProblem" id="como-funciona">
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

      <section className="landingDemoSection" id="demostracion">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">PRUÉBALO</p>
          <h2>Así lo verá tu cliente.</h2>
          <p>Los siguientes datos son ficticios. Toca cualquier campo para probar la experiencia.</p>
        </div>
        <PayDemo />
      </section>

      <section className="landingSection landingIncludes">
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

      <section className="landingPriceSection" id="precio">
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
            <li>Datos editables sin cambiar la tarjeta</li>
          </ul>
          <Link className="landingPrimary dark" href={signupUrl}>Empezar mi configuración</Link>
          <small>El pago y la entrega de la tarjeta se confirman después de configurar tu página.</small>
        </article>
      </section>

      <section className="intelligenceTeaser intelligenceSecondary" id="intelligence">
        <div>
          <strong className="comingSoon">PRÓXIMAMENTE</strong>
          <p className="landingEyebrow">NIVAL INTELLIGENCE</p>
          <h2>Nival Intelligence — Administra clientes, visitas y lealtad</h2>
          <p>Centraliza la relación con tus clientes y convierte visitas y lealtad en información útil para tu negocio.</p>
          <IntelligenceWaitlist />
        </div>
      </section>

      <section className="landingFaq">
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

      <section className="landingFinalCta">
        <p className="landingEyebrow">NIVAL PAY</p>
        <h2>Tu negocio ya acepta transferencias.<br />Ahora hazlo más fácil.</h2>
        <Link className="landingPrimary" href={signupUrl}>Quiero mi Nival Pay — $199</Link>
      </section>

      <footer className="landingFooter">
        <Link className="landingBrand" href="#inicio">
          <Image src="/wallet/nival-logo.svg" alt="" width={34} height={34} />
          <span>Nival Tech</span>
        </Link>
        <p>Productos digitales simples para negocios locales.</p>
        <div><Link href="/support">Soporte</Link><Link href="/privacy">Privacidad</Link><Link href="/auth">Mi cuenta</Link></div>
      </footer>
    </main>
  );
}
