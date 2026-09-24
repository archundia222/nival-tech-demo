import Image from "next/image";
import Link from "next/link";
import styles from "../landing-premium.module.css";

export const metadata = {
  title: "Productos | Nival Tech",
  description: "Cobra, crea recurrencia y convierte actividad en acciones para tu negocio.",
};

const products = [
  {
    number: "01",
    job: "COBRAR",
    title: "Nival Pay",
    description: "Página de cobro editable con QR y enlace. En Pro agregas NFC física para que el cliente encuentre y copie tus datos sin pedir capturas ni volver a dictar la CLABE.",
    price: "Gratis",
    detail: "Pro · $199 MXN pago único",
    bullets: ["Página, QR y enlace para empezar", "Tarjeta NFC física en Pro", "3 apartados incluidos en Pro"],
    href: "/dashboard/pay",
    cta: "Crear Nival Pay",
  },
  {
    number: "02",
    job: "HACER QUE VUELVAN",
    title: "Nival Puntos",
    description: "Programa digital para registrar visitas y recompensas, con una experiencia visible para el cliente y operación simple para el negocio.",
    price: "Gratis",
    detail: "Pro · $199 MXN / mes",
    bullets: ["Hasta 30 clientes gratis", "Registro por QR", "Visitas, puntos y recompensas"],
    href: "/dashboard/points",
    cta: "Crear programa",
  },
  {
    number: "03",
    job: "DECIDIR",
    title: "Nival Intelligence",
    description: "Convierte actividad disponible en señales y siguientes acciones: a quién recuperar, qué campaña probar y qué resultado observar después.",
    price: "Gratis",
    detail: "Pro desde $399 MXN / mes",
    bullets: ["Señal principal en la versión gratis", "Audiencias y campañas en Pro", "Seguimiento de resultados"],
    href: "/dashboard/intelligence",
    cta: "Probar Intelligence",
  },
];

export default function Products() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Navegación de productos">
        <Link className={styles.brand} href="/" aria-label="Nival Tech, inicio">
          <Image src="/wallet/nival-logo.svg" alt="" width={34} height={34} priority />
          <span>Nival Tech</span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/#productos">Productos</Link>
          <Link href="/#sistema">Cómo funciona</Link>
          <Link href="/#planes">Planes</Link>
          <Link href="/#confianza">Confianza</Link>
        </div>
        <div className={styles.navActions}>
          <Link className={styles.loginLink} href="/auth">Mi cuenta</Link>
          <Link className={styles.navCta} href="/auth?mode=signup&next=%2Fdashboard%2Fpay">Empezar gratis</Link>
        </div>
      </nav>

      <section className={styles.sectionIntro} style={{ paddingTop: 92 }}>
        <p className={styles.sectionEyebrow}>PRODUCTOS NIVAL TECH</p>
        <div>
          <h1 style={{ margin: 0, fontSize: "clamp(44px,6vw,76px)", lineHeight: .96, letterSpacing: "-.06em" }}>Empieza por el problema que quieres resolver.</h1>
          <p>No necesitas adoptar todo el sistema ni pagar antes de probar. Elige una necesidad concreta y amplía cuando la herramienta ya tenga un lugar en tu operación.</p>
        </div>
      </section>

      <section className={styles.productGrid}>
        {products.map((product) => (
          <article key={product.number} className={styles.productCard}>
            <div className={styles.productCardTop}>
              <span>{product.number}</span>
              <small>{product.job}</small>
            </div>
            <h3>{product.title}</h3>
            <p>{product.description}</p>
            <div className={styles.productPrice}>
              <strong>{product.price}</strong>
              <span>{product.detail}</span>
            </div>
            <ul style={{ display: "grid", gap: 9, margin: "0 0 24px", padding: 0, listStyle: "none" }}>
              {product.bullets.map((item) => <li key={item} style={{ color: "#9ea3ab", fontSize: 11, lineHeight: 1.45 }}>• {item}</li>)}
            </ul>
            <Link href={product.href}>{product.cta} <span aria-hidden="true">↗</span></Link>
          </article>
        ))}
      </section>

      <section className={styles.systemSection}>
        <div className={styles.systemCopy}>
          <p className={styles.sectionEyebrow}>NIVAL CARD</p>
          <h2>Una tarjeta física. Distintos destinos.</h2>
          <p>Programa una tarjeta para Nival Pay, Nival Puntos, reseñas o tu perfil digital. Elige el destino y personaliza la presentación según el producto.</p>
          <Link className={styles.textLink} href="/dashboard/pay/physical">Diseñar una tarjeta <span aria-hidden="true">↗</span></Link>
        </div>
        <div className={styles.systemFlow}>
          <article><div><span>01</span><small>PAY</small></div><strong>Cobro</strong><p>Lleva al cliente a tu página de transferencia o pago.</p></article>
          <div className={styles.flowConnector}><span>→</span><small>NFC</small></div>
          <article><div><span>02</span><small>PUNTOS</small></div><strong>Lealtad</strong><p>Abre el registro o la tarjeta del programa del negocio.</p></article>
          <div className={styles.flowConnector}><span>→</span><small>QR</small></div>
          <article><div><span>03</span><small>PERFIL</small></div><strong>Negocio</strong><p>Conecta contacto, enlaces, reseñas y otros accesos.</p></article>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.sectionEyebrow}>CRECE SIN CAMBIAR DE SISTEMA</p>
          <h2>Empieza gratis. Pasa a Pro cuando ya lo uses.</h2>
          <p>Los datos y clientes se conservan al ampliar. Si usas Puntos Pro + Intelligence Pro, el paquete cuesta $449 MXN al mes.</p>
        </div>
        <Link className={styles.finalButton} href="/dashboard">Ir a mi negocio <span aria-hidden="true">↗</span></Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Image src="/wallet/nival-logo.svg" alt="" width={30} height={30} />
          <div><strong>Nival Tech</strong><span>Tecnología para negocios locales.</span></div>
        </div>
        <div className={styles.footerLinks}>
          <Link href="/">Inicio</Link>
          <Link href="/support">Soporte</Link>
          <Link href="/privacy">Privacidad</Link>
          <Link href="/terms">Términos</Link>
        </div>
        <p>© 2026 Nival Tech. Los ejemplos visuales y cifras demostrativas no representan resultados garantizados.</p>
      </footer>
    </main>
  );
}
