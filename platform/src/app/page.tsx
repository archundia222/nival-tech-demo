import Image from "next/image";
import Link from "next/link";
import { LandingReveal } from "./landing-reveal";
import { LandingExperience } from "./landing-experience";
import styles from "./landing-premium.module.css";

const signupUrl = "/auth?mode=signup&next=%2Fdashboard%2Fpay";
const pointsUrl = "/auth?mode=signup&next=%2Fdashboard%2Fpoints";
const intelligenceUrl = "/auth?mode=signup&next=%2Fdashboard%2Fintelligence";
const payProUrl = "/auth?mode=signup&next=%2Fcheckout";

const productSummary = [
  {
    number: "01",
    label: "COBRAR",
    title: "Nival Pay",
    text: "Presenta tus datos de cobro en una página clara, compártela por QR, enlace o NFC y actualízala sin volver a imprimir nada.",
    price: "Gratis para empezar",
    detail: "Pro · $199 MXN pago único",
    href: signupUrl,
  },
  {
    number: "02",
    label: "HACER QUE VUELVAN",
    title: "Nival Puntos",
    text: "Haz visible el progreso del cliente con visitas, puntos y recompensas. Empieza con capacidad limitada y amplía cuando ya lo estés usando.",
    price: "Gratis hasta 30 clientes",
    detail: "Pro · $199 MXN / mes",
    href: pointsUrl,
  },
  {
    number: "03",
    label: "DECIDIR QUÉ HACER",
    title: "Nival Intelligence",
    text: "Organiza señales de actividad, recurrencia y riesgo para convertir datos del negocio en una siguiente acción que puedas ejecutar y medir.",
    price: "Gratis para explorar",
    detail: "Pro desde $399 MXN / mes",
    href: intelligenceUrl,
  },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const params = await searchParams;
  const source = params.from === "nival-pay" || params.from === "nival-puntos" || params.from === "perfil-negocio" ? params.from : null;
  const sourceContext = source === "nival-pay"
    ? { eyebrow: "VIENES DESDE UNA NIVAL PAY", title: "Eso que acabas de usar también puede vivir en tu negocio.", text: "Empieza con página, QR y enlace. Si después quieres NFC física y más herramientas, amplías sin cambiar el acceso que ya compartiste.", href: signupUrl, cta: "Crear la mía" }
    : source === "nival-puntos"
      ? { eyebrow: "VIENES DESDE NIVAL PUNTOS", title: "Tu negocio también puede convertir visitas en una experiencia que se entiende.", text: "Crea el programa, pruébalo con clientes reales y decide si necesitas más capacidad después.", href: pointsUrl, cta: "Crear mi programa" }
      : source === "perfil-negocio"
        ? { eyebrow: "VIENES DESDE UNA PÁGINA NIVAL", title: "Cobro, lealtad y enlaces pueden sentirse como una sola experiencia.", text: "Nival reúne herramientas simples para negocios locales sin obligarte a cambiar toda tu operación.", href: "#productos", cta: "Ver el sistema" }
        : null;

  return (
    <main className={styles.page} id="inicio">
      <LandingReveal />

      <nav className={styles.nav} aria-label="Navegación principal">
        <Link className={styles.brand} href="#inicio" aria-label="Nival Tech, inicio">
          <Image src="/wallet/nival-logo.svg" alt="" width={34} height={34} priority />
          <span>Nival Tech</span>
        </Link>
        <div className={styles.navLinks}>
          <a href="#productos">Productos</a>
          <a href="#sistema">Cómo funciona</a>
          <a href="#planes">Planes</a>
          <a href="#confianza">Confianza</a>
        </div>
        <div className={styles.navActions}>
          <Link className={styles.loginLink} href="/auth">Mi cuenta</Link>
          <Link className={styles.navCta} href={signupUrl}>Empezar gratis</Link>
        </div>
      </nav>

      {sourceContext && (
        <section className={styles.sourceArrival} aria-label="Contexto de llegada">
          <div>
            <span>{sourceContext.eyebrow}</span>
            <strong>{sourceContext.title}</strong>
            <p>{sourceContext.text}</p>
          </div>
          <a href={sourceContext.href}>{sourceContext.cta}<b aria-hidden="true">↗</b></a>
        </section>
      )}

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrowRow}>
            <span className={styles.liveDot} />
            <p>TECNOLOGÍA PARA NEGOCIOS LOCALES</p>
          </div>
          <h1>
            Tu negocio no necesita
            <em> más software.</em>
            <span>Necesita menos fricción.</span>
          </h1>
          <p className={styles.heroLead}>
            Nival convierte momentos que ya ocurren todos los días —cobrar, hacer que un cliente vuelva y decidir qué hacer después— en experiencias simples para el cliente y accionables para el negocio.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href={signupUrl}>Crear mi cuenta gratis <span aria-hidden="true">↗</span></Link>
            <a className={styles.secondaryCta} href="#productos">Ver el producto <span aria-hidden="true">↓</span></a>
          </div>
          <div className={styles.heroFinePrint}>
            <span>Empieza sin tarjeta</span>
            <i />
            <span>Prueba con clientes reales</span>
            <i />
            <span>Amplía cuando tenga sentido</span>
          </div>
        </div>

        <div className={styles.heroStage} aria-label="Vista previa del ecosistema Nival">
          <div className={styles.heroGlow} />
          <div className={styles.heroDashboard}>
            <div className={styles.dashboardTop}>
              <div><span className={styles.dashboardLogo}>N</span><strong>Resumen del negocio</strong></div>
              <span className={styles.dashboardStatus}>HOY</span>
            </div>
            <div className={styles.dashboardMetrics}>
              <article><span>CLIENTES ACTIVOS</span><strong>24</strong><small>actividad registrada</small></article>
              <article><span>RECURRENCIA</span><strong>38%</strong><small>2+ visitas</small></article>
              <article><span>SEÑAL</span><strong>8</strong><small>clientes en riesgo</small></article>
            </div>
            <div className={styles.dashboardInsight}>
              <div>
                <span>PRÓXIMA ACCIÓN</span>
                <strong>Empieza por quienes ya te conocen.</strong>
                <p>Hay clientes frecuentes que redujeron su ritmo de visita.</p>
              </div>
              <b aria-hidden="true">↗</b>
            </div>
          </div>

          <div className={styles.heroPhone}>
            <div className={styles.phoneCap} />
            <span className={styles.phoneTag}>NIVAL PAY</span>
            <div className={styles.phoneAvatar}>CN</div>
            <h2>Café Nival</h2>
            <p>Datos para transferencia</p>
            <dl>
              <div><dt>Banco</dt><dd>Banco Ejemplo</dd></div>
              <div><dt>CLABE</dt><dd>012 180 015022688507</dd></div>
            </dl>
            <div className={styles.phoneButton}>Copiar CLABE</div>
          </div>

          <div className={styles.heroNfc}>
            <div><span>N</span><small>NIVAL PAY</small></div>
            <strong>Acerca tu celular<br />para pagar</strong>
            <em>NFC · QR · ENLACE</em>
          </div>

          <div className={styles.heroSignal}>
            <small>ACTIVIDAD</small>
            <strong>+6</strong>
            <span>visitas registradas</span>
          </div>
        </div>
      </section>

      <section className={styles.valueRail + " scrollReveal"} aria-label="Principios de Nival">
        <div><span>01</span><strong>Menos pasos</strong><p>El cliente entiende qué hacer sin que tú tengas que explicarlo cada vez.</p></div>
        <div><span>02</span><strong>Una sola lógica</strong><p>Pay, Puntos e Intelligence comparten la misma experiencia y el mismo negocio.</p></div>
        <div><span>03</span><strong>Datos con contexto</strong><p>Las cifras se presentan como señales operativas, no como promesas de resultados.</p></div>
      </section>

      <section className={styles.sectionIntro + " scrollReveal"} id="productos">
        <p className={styles.sectionEyebrow}>TRES PRODUCTOS. TRES TRABAJOS CONCRETOS.</p>
        <div>
          <h2>Empieza por el problema que más fricción te genera hoy.</h2>
          <p>No necesitas adoptar una plataforma enorme. Entra por una necesidad concreta y conecta el resto solo si aporta valor.</p>
        </div>
      </section>

      <section className={styles.productGrid + " scrollReveal"}>
        {productSummary.map((product) => (
          <article key={product.number} className={styles.productCard}>
            <div className={styles.productCardTop}>
              <span>{product.number}</span>
              <small>{product.label}</small>
            </div>
            <h3>{product.title}</h3>
            <p>{product.text}</p>
            <div className={styles.productPrice}>
              <strong>{product.price}</strong>
              <span>{product.detail}</span>
            </div>
            <Link href={product.href}>Probar {product.title} <span aria-hidden="true">↗</span></Link>
          </article>
        ))}
      </section>

      <section className={styles.experienceSection + " scrollReveal"}>
        <div className={styles.sectionIntroCompact}>
          <p className={styles.sectionEyebrow}>NO TE LO IMAGINES. MÍRALO FUNCIONAR.</p>
          <h2>La experiencia cambia según el momento, no según el menú.</h2>
          <p>Explora cómo se ve cada producto desde el lado de quien realmente lo usa.</p>
        </div>
        <LandingExperience />
      </section>

      <section className={styles.systemSection + " scrollReveal"} id="sistema">
        <div className={styles.systemCopy}>
          <p className={styles.sectionEyebrow}>EL SISTEMA NIVAL</p>
          <h2>Una interacción alimenta la siguiente.</h2>
          <p>La intención no es llenarte de paneles. Es construir un ciclo donde cada momento del negocio deje una señal útil para el siguiente.</p>
          <Link className={styles.textLink} href={intelligenceUrl}>Ver Nival Intelligence <span aria-hidden="true">↗</span></Link>
        </div>

        <div className={styles.systemFlow}>
          <article>
            <div><span>01</span><small>COBRAR</small></div>
            <strong>Nival Pay</strong>
            <p>El cliente encuentra los datos correctos y el negocio evita repetir el mismo proceso manual.</p>
          </article>
          <div className={styles.flowConnector}><span>→</span><small>actividad</small></div>
          <article>
            <div><span>02</span><small>VOLVER</small></div>
            <strong>Nival Puntos</strong>
            <p>Las visitas y recompensas crean una señal visible de recurrencia.</p>
          </article>
          <div className={styles.flowConnector}><span>→</span><small>señales</small></div>
          <article>
            <div><span>03</span><small>DECIDIR</small></div>
            <strong>Intelligence</strong>
            <p>La actividad disponible se organiza para sugerir qué conviene probar o medir después.</p>
          </article>
        </div>
      </section>

      <section className={styles.realLifeSection + " scrollReveal"}>
        <div className={styles.sectionIntroCompact}>
          <p className={styles.sectionEyebrow}>DISEÑADO PARA LA VIDA REAL</p>
          <h2>El producto aparece justo donde ya ocurre el trabajo.</h2>
        </div>
        <div className={styles.realLifeGrid}>
          <article>
            <span>EN EL MOSTRADOR</span>
            <h3>“Escanea aquí.”</h3>
            <p>El cliente abre Pay o Puntos desde QR o NFC. No necesita aprender un sistema para completar una acción simple.</p>
            <div className={styles.realLifeChipRow}><i>QR</i><i>NFC</i><i>ENLACE</i></div>
          </article>
          <article>
            <span>AL CERRAR EL DÍA</span>
            <h3>“Registra solo lo que ya sabes.”</h3>
            <p>Guarda una venta, el total del día o importa un CSV. Nival distingue datos capturados de resultados atribuidos.</p>
            <div className={styles.miniLedger}>
              <div><b>$1,840</b><small>total registrado</small></div>
              <div><b>12</b><small>operaciones</small></div>
            </div>
          </article>
          <article>
            <span>ANTES DE PROMOCIONAR</span>
            <h3>“¿A quién sí vale la pena contactar?”</h3>
            <p>Intelligence prioriza personas con señales observables y respeta el consentimiento registrado para comunicaciones comerciales.</p>
            <div className={styles.priorityStack}><i /><i /><i /><span>5 contactables</span></div>
          </article>
        </div>
      </section>

      <section className={styles.plansSection + " scrollReveal"} id="planes">
        <div className={styles.plansIntro}>
          <p className={styles.sectionEyebrow}>EMPIEZA PEQUEÑO</p>
          <h2>Paga cuando la herramienta ya tenga un lugar en tu operación.</h2>
          <p>Los planes gratis existen para que pruebes el flujo antes de ampliar capacidad o activar hardware y funciones Pro.</p>
        </div>
        <div className={styles.plansGrid}>
          <article>
            <div><span>NIVAL PAY</span><b>Pago único</b></div>
            <h3>$199 <small>MXN</small></h3>
            <p>La versión completa incluye tarjeta NFC física, página editable, QR y 3 apartados.</p>
            <ul>
              <li>Empieza gratis con página, QR y enlace</li>
              <li>Sin mensualidad para Nival Pay</li>
              <li>Apartados adicionales por $49 MXN</li>
            </ul>
            <Link href={payProUrl}>Activar Nival Pay <span aria-hidden="true">↗</span></Link>
          </article>
          <article>
            <div><span>NIVAL PUNTOS</span><b>Mensual</b></div>
            <h3>$199 <small>MXN / mes</small></h3>
            <p>Programa de lealtad con más capacidad, configuración y herramientas de operación.</p>
            <ul>
              <li>Gratis hasta 30 clientes</li>
              <li>Visitas, puntos y recompensas</li>
              <li>Tarjeta para Wallet cuando corresponda</li>
            </ul>
            <Link href={pointsUrl}>Probar Nival Puntos <span aria-hidden="true">↗</span></Link>
          </article>
          <article className={styles.planFeatured}>
            <div><span>NIVAL INTELLIGENCE</span><b>Mensual</b></div>
            <h3>Desde $399 <small>MXN / mes</small></h3>
            <p>Señales, audiencias y acciones recomendadas a partir de la actividad disponible del negocio.</p>
            <ul>
              <li>Versión gratis para explorar la oportunidad principal</li>
              <li>Pro desbloquea personas, campañas y seguimiento</li>
              <li>Bundle con Puntos Pro: $449 MXN / mes</li>
            </ul>
            <Link href={intelligenceUrl}>Probar Intelligence <span aria-hidden="true">↗</span></Link>
          </article>
        </div>
        <p className={styles.planFootnote}>Las suscripciones recurrentes solo se habilitan cuando el flujo de aviso previo y cancelación cumple los controles legales implementados por Nival.</p>
      </section>

      <section className={styles.trustSection + " scrollReveal"} id="confianza">
        <div className={styles.trustHeader}>
          <div>
            <p className={styles.sectionEyebrow}>DISEÑADO CON CONTROL</p>
            <h2>Una interfaz elegante también tiene que explicar qué pasa por detrás.</h2>
          </div>
          <p>Nival separa experiencia pública, administración y procesamiento de pagos; documenta los datos que usa y limita afirmaciones a lo que el producto puede respaldar.</p>
        </div>
        <div className={styles.trustGrid}>
          <article><span>01</span><strong>Privacidad visible</strong><p>Avisos y consentimientos aparecen donde se recaban o publican datos.</p></article>
          <article><span>02</span><strong>Pagos por terceros</strong><p>Mercado Pago procesa las operaciones habilitadas; Nival concilia el estado para activar productos.</p></article>
          <article><span>03</span><strong>Roles y espacios</strong><p>La información operativa se organiza por negocio y por los permisos definidos para su equipo.</p></article>
          <article><span>04</span><strong>Accesibilidad base</strong><p>Foco visible, navegación por teclado, etiquetas claras, contraste revisado y movimiento reducido.</p></article>
        </div>
      </section>

      <section className={styles.finalCta + " scrollReveal"}>
        <div>
          <p className={styles.sectionEyebrow}>NIVAL TECH</p>
          <h2>Haz que lo cotidiano se sienta mejor diseñado.</h2>
          <p>Empieza con una sola herramienta. Si encaja en tu negocio, conecta la siguiente.</p>
        </div>
        <Link className={styles.finalButton} href={signupUrl}>Empezar gratis <span aria-hidden="true">↗</span></Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Image src="/wallet/nival-logo.svg" alt="" width={30} height={30} />
          <div><strong>Nival Tech</strong><span>Tecnología para negocios locales.</span></div>
        </div>
        <div className={styles.footerLinks}>
          <Link href="/products">Productos</Link>
          <Link href="/support">Soporte</Link>
          <Link href="/privacy">Privacidad</Link>
          <Link href="/terms">Términos</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/refunds">Reembolsos</Link>
        </div>
        <p>© 2026 Nival Tech. Los ejemplos visuales y cifras demostrativas no representan resultados garantizados.</p>
      </footer>
    </main>
  );
}
