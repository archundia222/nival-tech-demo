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
          <h1 className="heroReveal heroReveal2">Haz más fácil cobrar, lograr que tus clientes vuelvan y saber qué hacer para crecer.</h1>
          <p className="landingHeroLead heroReveal heroReveal3">Nival reúne cobros, clientes frecuentes y recomendaciones en un flujo simple: comparte cómo pagarte, da una razón para volver y usa la actividad real para decidir qué hacer después.</p>
          <div className="landingPriceLine heroReveal heroReveal4">
            <strong>Empieza gratis</strong>
            <span>usa el producto primero; paga cuando necesites más</span>
          </div>
          <div className="landingHeroActions heroReveal heroReveal5">
            <Link className="landingPrimary" href={signupUrl}>Empezar gratis</Link>
            <a className="landingSecondary" href="#demostracion">Probar Nival Pay</a>
            <a className="landingTextCta" href={salesWhatsappHref} target={salesPhone ? "_blank" : undefined} rel={salesPhone ? "noreferrer" : undefined}>Quiero que me orienten →</a>
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

      <section className="landingSalesAssurance scrollReveal" aria-label="Qué necesitas para usar Nival">
        <div><strong>Sin descargar una app</strong><span>El cliente abre Nival desde QR, enlace, NFC o Wallet.</span></div>
        <div><strong>Puedes empezar gratis</strong><span>Prueba el flujo con clientes reales antes de ampliar.</span></div>
        <div><strong>Hecho para celular</strong><span>La experiencia pública está pensada para resolverse en segundos.</span></div>
      </section>

      <section className="nivalEcosystem scrollReveal" id="productos">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">UN SISTEMA, TRES TRABAJOS</p>
          <h2>Empieza por el problema que más te cuesta hoy.</h2>
          <p>La entrada gratuita reduce el riesgo. El negocio paga después de comprobar valor real y puede ampliar a Growth cuando la actividad ya permite tomar mejores decisiones.</p>
        </div>
        <div className="nivalProductCards">
          <article>
            <span>COBRAR</span>
            <h3>Nival Pay</h3>
            <p>Empieza con una página de cobro, QR, enlace, tu marca y estadísticas básicas. Mantén el mismo QR si después activas NFC y más herramientas.</p>
            <div><strong>Gratis digital</strong><small>Pro fundador: {mxn(NIVAL_PAY_FOUNDER_PRICE_CENTS)} pago único</small></div>
            <Link href={signupUrl}>Crear mi Nival Pay gratis →</Link>
          </article>
          <article>
            <span>HACER QUE VUELVAN</span>
            <h3>Nival Puntos</h3>
            <p>El cliente escanea, se registra y lleva su tarjeta digital en el celular. Cada visita suma hasta desbloquear la recompensa que tú defines.</p>
            <div><strong>{NIVAL_TRIAL_DAYS} días Pro</strong><small>Fundador: {mxn(NIVAL_POINTS_FOUNDER_PRICE_CENTS)}/mes</small></div>
            <Link href="/auth?mode=signup&next=%2Fdashboard%2Fpoints">Crear mi programa gratis →</Link>
          </article>
          <article className="featured">
            <span>CRECER</span>
            <h3>Nival Growth</h3>
            <p>Combina Nival Puntos + Intelligence para detectar clientes frecuentes, personas que se están alejando y oportunidades de campaña sin volver a capturar una base.</p>
            <div><strong>{mxn(NIVAL_GROWTH_PRICE_CENTS)}/mes</strong><small>Puntos + Intelligence</small></div>
            <Link href="/products#growth">Conocer Nival Growth →</Link>
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
          <h2 id="planes-title">Empieza simple. Amplía cuando tenga sentido.</h2>
          <p>Empieza gratis o con precio fundador y amplía solo cuando la herramienta ya esté generando valor para tu negocio.</p>
        </div>
        <div className="landingBusinessPlanGrid">
          <article><span>NIVAL PAY</span><strong>{mxn(NIVAL_PAY_FOUNDER_PRICE_CENTS)}</strong><small>pago único · fundador</small><p>Digital gratis para siempre. Pro agrega NFC física y 3 apartados.</p><em>Regular previsto: {mxn(NIVAL_PAY_REGULAR_PRICE_CENTS)}</em></article>
          <article className="featured"><span>NIVAL PUNTOS PRO</span><strong>{mxn(NIVAL_POINTS_FOUNDER_PRICE_CENTS)}</strong><small>al mes · fundador</small><p>{NIVAL_TRIAL_DAYS} días de herramientas Pro. Después puedes seguir Free hasta {NIVAL_POINTS_FREE_CUSTOMER_LIMIT} clientes.</p><em>Regular previsto: {mxn(NIVAL_POINTS_REGULAR_PRICE_CENTS)}/mes</em></article>
          <article><span>NIVAL GROWTH</span><strong>{mxn(NIVAL_GROWTH_PRICE_CENTS)}</strong><small>al mes</small><p>Puntos Pro + Intelligence para recuperar, segmentar, lanzar campañas y medir resultados.</p><em>La expansión natural cuando Puntos ya genera actividad.</em></article>
        </div>
        <Link className="landingPrimary" href="/products">Comparar planes →</Link>
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

      <section className="landingFaq scrollReveal">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">PREGUNTAS FRECUENTES</p>
          <h2>Antes de empezar.</h2>
        </div>
        <div className="faqList">
          <details>
            <summary>¿Qué necesita hacer mi cliente para usar Nival Puntos?</summary>
            <p>Escanea tu QR o NFC, se registra una vez y abre su tarjeta digital. Puede guardar su tarjeta en Google Wallet cuando esté disponible en su dispositivo. Después solo muestra su código para sumar visitas o canjear premios.</p>
          </details>
          <details>
            <summary>¿Tengo que registrar manualmente a todos mis clientes para Intelligence?</summary>
            <p>No. La fuente principal de Intelligence son los clientes y visitas que Nival Puntos va registrando. Así el análisis crece con el uso normal del programa.</p>
          </details>
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
        <p className="landingEyebrow">EMPIEZA POR UN PROBLEMA</p>
        <h2>No necesitas comprar todo.<br />Empieza por lo que tu negocio necesita hoy.</h2>
        <p>Pay si quieres cobrar más fácil. Puntos si quieres que regresen. Growth cuando Puntos ya esté generando actividad que puedas convertir en decisiones y campañas.</p>
        <div className="landingHeroActions">
          <Link className="landingPrimary" href={signupUrl}>Crear mi cuenta gratis</Link>
          <a className="landingSecondary" href={salesWhatsappHref} target={salesPhone ? "_blank" : undefined} rel={salesPhone ? "noreferrer" : undefined}>Hablar con Nival</a>
        </div>
      </section>

      <a className="landingMobileContact" href={salesWhatsappHref} target={salesPhone ? "_blank" : undefined} rel={salesPhone ? "noreferrer" : undefined}>¿Tienes dudas? Escríbenos →</a>

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
