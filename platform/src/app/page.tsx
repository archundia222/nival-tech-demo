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
          <a href="#empieza-gratis">Empieza gratis</a>
          <a href="#empresas">Para equipos</a>
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
          <h1 className="heroReveal heroReveal2">Haz más fácil cobrar, lograr que tus clientes vuelvan y saber qué hacer para crecer.</h1>
          <p className="landingHeroLead heroReveal heroReveal3">Nival convierte tres problemas cotidianos de un negocio en acciones simples: comparte cómo pagarte, crea una razón para regresar y recibe recomendaciones concretas basadas en la actividad real de tus clientes.</p>
          <div className="landingPriceLine heroReveal heroReveal4">
            <strong>Empieza gratis</strong>
            <span>usa el producto primero; paga cuando necesites más</span>
          </div>
          <div className="landingHeroActions heroReveal heroReveal5">
            <Link className="landingPrimary" href={signupUrl}>Empezar gratis</Link>
            <a className="landingSecondary" href="#vida-real">Ver cómo ayuda</a>
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
        <p><strong>Cobrar</strong><span>sin dictar tu CLABE cada vez</span></p>
        <p><strong>Hacer que vuelvan</strong><span>sin depender de que se acuerden</span></p>
        <p><strong>Saber qué hacer</strong><span>sin perderte entre tablas</span></p>
      </section>

      <section className="landingPainSection scrollReveal">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">PROBLEMAS REALES, NO MÁS SOFTWARE POR TENER SOFTWARE</p>
          <h2>Tu negocio ya tiene clientes. Nival te ayuda a aprovechar mejor cada interacción.</h2>
          <p>Empieza por una sola necesidad. No tienes que cambiar cómo opera tu negocio ni aprender un sistema complicado.</p>
        </div>
        <div className="landingPainGrid">
          <article><span>01</span><h3>“¿Me mandas tu CLABE?”</h3><p>Deja de buscar capturas o dictar números. Tu cliente abre una página clara desde QR, enlace o NFC.</p><b>Nival Pay lo resuelve →</b></article>
          <article><span>02</span><h3>“Vino una vez y no volvió.”</h3><p>Registra visitas y recompensa la recurrencia para que regresar tenga una razón visible para el cliente.</p><b>Nival Puntos lo resuelve →</b></article>
          <article><span>03</span><h3>“Tengo datos, ¿y ahora qué hago?”</h3><p>Nival detecta oportunidades y las convierte en una acción: a quién contactar, qué hacer y qué medir después.</p><b>Nival Intelligence lo resuelve →</b></article>
        </div>
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

      <section className="landingRealLife scrollReveal" id="vida-real">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">ASÍ SE VE EN UN NEGOCIO REAL</p>
          <h2>Menos pasos para tu cliente. Menos cosas que recordar para ti.</h2>
          <p>Nival está pensado para entrar en momentos que ya ocurren todos los días, no para inventarte trabajo nuevo.</p>
        </div>
        <div className="realLifeTimeline">
          <article><div><span>1</span><small>AL COBRAR</small></div><section><h3>“Escanea aquí.”</h3><p>El cliente abre Nival Pay, verifica los datos y copia la CLABE. Tú no interrumpes lo que estás haciendo para buscar datos bancarios.</p><em>QR · enlace · NFC</em></section></article>
          <article><div><span>2</span><small>DESPUÉS</small></div><section><h3>“Tu visita ya cuenta.”</h3><p>Con Nival Puntos, el cliente ve su avance y tiene una razón concreta para regresar al negocio.</p><em>visitas · puntos · recompensas</em></section></article>
          <article><div><span>3</span><small>PARA CRECER</small></div><section><h3>“Hay 8 clientes que conviene recuperar.”</h3><p>Intelligence transforma actividad en una recomendación y, en Pro, te ayuda a ejecutarla y observar quién regresó.</p><em>detectar · actuar · medir</em></section></article>
        </div>
      </section>

      <section className="landingFreeSection scrollReveal" id="empieza-gratis">
        <div className="landingFreeIntro">
          <p className="landingEyebrow">PRIMERO ÚSALO</p>
          <h2>Empieza gratis. Paga cuando Nival ya te esté resolviendo algo.</h2>
          <p>No queremos que compres una promesa. Los planes gratis sirven para poner Nival frente a clientes reales y descubrir si encaja en tu negocio.</p>
          <Link className="landingPrimary" href={signupUrl}>Crear mi cuenta gratis</Link>
        </div>
        <div className="landingFreePlans">
          <article><span>NIVAL PAY GRATIS</span><strong>Empieza a cobrar mejor</strong><p>Página de cobro, QR, enlace, tu marca, 1 apartado y estadísticas básicas. No caduca.</p><small>Pro agrega NFC física, 3 apartados y más herramientas.</small></article>
          <article><span>NIVAL PUNTOS GRATIS</span><strong>Comprueba si regresan</strong><p>Programa real de visitas, puntos y recompensas para hasta 30 clientes.</p><small>Pro aumenta capacidad y desbloquea resultados y configuración.</small></article>
          <article><span>NIVAL INTELLIGENCE GRATIS</span><strong>Descubre una oportunidad</strong><p>Nival usa la actividad disponible para mostrarte la señal principal y una recomendación.</p><small>Pro revela personas, mensajes, campañas y seguimiento.</small></article>
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
          <h2>No abras otra gráfica preguntándote “¿y esto para qué me sirve?”.</h2>
          <p>Intelligence busca responder una pregunta mucho más útil: <strong>¿qué conviene hacer ahora?</strong> Detecta clientes que podrías perder, clientes que vale la pena cuidar y oportunidades para provocar una siguiente visita.</p>
          <div className="intelligenceExample"><span>NIVAL ENCONTRÓ ESTO</span><strong>8 clientes que antes regresaban podrían estar alejándose.</strong><p>Recomendación: empieza por quienes ya te conocen antes de lanzar una promoción general.</p></div>
          <div className="landingHeroActions"><Link className="landingPrimary" href="/auth?mode=signup&next=%2Fdashboard%2Fintelligence">Probar Intelligence gratis</Link></div>
        </div>
      </section>

      <section className="landingTrust scrollReveal" aria-labelledby="trust-title">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">CONTROL Y CONFIANZA</p>
          <h2 id="trust-title">Lo simple para el cliente no tiene que ser improvisado por detrás.</h2>
          <p>Nival separa la experiencia pública de la administración del negocio y aplica controles distintos según quién usa cada herramienta.</p>
        </div>
        <div className="landingTrustGrid">
          <article><span>01</span><strong>Espacios de trabajo separados</strong><p>Cada negocio mantiene su configuración, clientes y productos dentro de su propio contexto operativo.</p></article>
          <article><span>02</span><strong>Roles para el equipo</strong><p>Propietarios, managers y staff pueden tener responsabilidades distintas dentro de la operación.</p></article>
          <article><span>03</span><strong>Consentimiento para marketing</strong><p>Las acciones comerciales de Intelligence respetan el consentimiento registrado antes de incluir a una persona en una audiencia.</p></article>
          <article><span>04</span><strong>Sin secretos bancarios</strong><p>Nival Pay muestra la información que el negocio decide compartir; no necesita NIP, CVV ni contraseñas bancarias.</p></article>
        </div>
      </section>

      <section className="enterpriseReady scrollReveal" id="empresas">
        <div className="enterpriseReadyIntro">
          <p className="landingEyebrow">DE UN NEGOCIO A MUCHAS UBICACIONES</p>
          <h2>Nival nace simple, pero la arquitectura del producto debe poder crecer con la operación.</h2>
          <p>Para equipos con múltiples sucursales, el valor cambia: ya no basta con una herramienta bonita. Se necesita control por ubicación, permisos, consistencia de marca, trazabilidad y una vista consolidada de lo que está funcionando.</p>
        </div>
        <div className="enterpriseReadyGrid">
          <article><span>OPERACIÓN</span><strong>Una experiencia consistente en cada ubicación</strong><p>Perfiles, QR, programas y configuraciones pensados para administrarse por negocio y evolucionar hacia estructuras multi-sucursal.</p></article>
          <article><span>CONTROL</span><strong>Roles y acceso por responsabilidad</strong><p>Propietarios, managers y staff con permisos separados para reducir errores y mantener control operativo.</p></article>
          <article><span>DATOS</span><strong>Decisiones que bajan hasta la acción</strong><p>Intelligence está diseñado para convertir comportamiento en prioridades concretas, no para entregar otra colección de dashboards.</p></article>
          <article><span>IMPLEMENTACIÓN</span><strong>Empieza con un piloto medible</strong><p>Una implementación grande debería comenzar con ubicaciones seleccionadas, objetivos claros y criterios de éxito antes de escalar.</p></article>
        </div>
        <div className="enterprisePilot">
          <div><span>PARA EQUIPOS Y CADENAS</span><strong>¿Quieres evaluar Nival en varias ubicaciones?</strong><p>Podemos plantear un piloto alrededor de una necesidad concreta y medir adopción, recurrencia y operación antes de una expansión.</p></div>
          <Link href="/support">Hablar sobre un piloto →</Link>
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
        <h2>No necesitas decidir hoy si Nival vale la pena.<br />Úsalo y deja que el producto te lo demuestre.</h2>
        <p>Empieza con Nival Pay, Puntos o Intelligence. Los tres tienen una forma de empezar gratis.</p>
        <Link className="landingPrimary" href={signupUrl}>Empezar gratis</Link>
      </section>

      <footer className="landingFooter">
        <Link className="landingBrand" href="#inicio">
          <Image src="/wallet/nival-logo.svg" alt="" width={34} height={34} />
          <span>Nival Tech</span>
        </Link>
        <p>Cobra, fideliza y crece con herramientas hechas para negocios locales.</p>
        <div><Link href="/support">Soporte</Link><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link><Link href="/auth">Mi cuenta</Link></div>
      </footer>
    </main>
  );
}
