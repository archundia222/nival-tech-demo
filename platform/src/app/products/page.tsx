import Image from "next/image";
import Link from "next/link";
import styles from "./products-premium.module.css";

export const metadata = {
  title: "Productos | Nival Tech",
  description: "Nival Pay, Nival Puntos e Intelligence para negocios locales.",
};

const products = [
  {
    job: "COBRAR",
    name: "Nival Pay",
    price: "$199",
    cadence: "MXN · pago único",
    intro: "Comparte tus datos de cobro con una experiencia clara y editable desde QR, enlace o NFC.",
    features: ["Empieza gratis con página, QR y enlace", "Pro incluye tarjeta NFC física", "3 apartados incluidos en Pro"],
    href: "/auth?mode=signup&next=%2Fdashboard%2Fpay",
    cta: "Crear Nival Pay",
  },
  {
    job: "HACER QUE VUELVAN",
    name: "Nival Puntos",
    price: "$199",
    cadence: "MXN · al mes",
    intro: "Registra visitas, muestra progreso y entrega recompensas sin meter fricción extra en la operación.",
    features: ["Gratis hasta 30 clientes", "Registro del cliente por QR", "Visitas, puntos y recompensas"],
    href: "/auth?mode=signup&next=%2Fdashboard%2Fpoints",
    cta: "Crear programa",
  },
  {
    job: "DECIDIR QUÉ HACER",
    name: "Nival Intelligence",
    price: "Desde $399",
    cadence: "MXN · al mes",
    intro: "Convierte señales de actividad y recurrencia en una siguiente acción que puedas probar y medir.",
    features: ["Versión gratis para explorar", "Audiencias y campañas en Pro", "Bundle con Puntos Pro: $449/mes"],
    href: "/auth?mode=signup&next=%2Fdashboard%2Fintelligence",
    cta: "Probar Intelligence",
  },
];

export default function Products() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link className={styles.brand} href="/">
          <Image src="/wallet/nival-logo.svg" alt="" width={34} height={34} />
          <span>Nival Tech</span>
        </Link>
        <div>
          <Link href="/">Inicio</Link>
          <Link className={styles.navCta} href="/auth">Mi cuenta</Link>
        </div>
      </nav>

      <header className={styles.hero}>
        <p>PRODUCTOS NIVAL TECH</p>
        <h1>Empieza por el trabajo que quieres hacer mejor.</h1>
        <div>
          <p>No necesitas adoptar todo el sistema de golpe. Cada producto resuelve una tarea concreta y puede conectarse con los demás cuando tenga sentido.</p>
          <Link href="/auth?mode=signup&next=%2Fdashboard%2Fpay">Empezar gratis <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className={styles.grid} aria-label="Productos Nival">
        {products.map((product, index) => (
          <article key={product.name} className={index === 2 ? styles.featured : undefined}>
            <div className={styles.cardTop}><span>0{index + 1}</span><small>{product.job}</small></div>
            <h2>{product.name}</h2>
            <p>{product.intro}</p>
            <div className={styles.price}><strong>{product.price}</strong><span>{product.cadence}</span></div>
            <ul>{product.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <Link href={product.href}>{product.cta}<span aria-hidden="true">↗</span></Link>
          </article>
        ))}
      </section>

      <section className={styles.cardSection}>
        <div>
          <p>NIVAL CARD</p>
          <h2>Una tarjeta física. La acción que tú elijas.</h2>
          <span>Programa una tarjeta para Pay, Puntos, reseñas o tu perfil digital. Elige destino, plantilla y personalización sin convertir la tarjeta en otro sistema distinto.</span>
        </div>
        <div className={styles.cardMock}>
          <div><b>N</b><small>NIVAL CARD</small></div>
          <strong>Acerca tu celular<br />o escanea el QR</strong>
          <em>NFC · QR · TU MARCA</em>
        </div>
        <aside>
          <strong>Desde $99 MXN</strong>
          <span>La primera tarjeta de Nival Pay Pro ya está incluida.</span>
          <Link href="/dashboard/pay/physical">Diseñar tarjeta <b aria-hidden="true">↗</b></Link>
        </aside>
      </section>

      <section className={styles.bundle}>
        <div>
          <p>UN MISMO NEGOCIO</p>
          <h2>Conecta productos sin volver a empezar desde cero.</h2>
          <span>Cuando amplías, el objetivo es conservar la operación, los accesos y la información que ya estás usando.</span>
        </div>
        <Link href="/auth?mode=signup&next=%2Fdashboard">Crear mi cuenta <span aria-hidden="true">↗</span></Link>
      </section>

      <footer className={styles.footer}>
        <div><Image src="/wallet/nival-logo.svg" alt="" width={28} height={28} /><strong>Nival Tech</strong></div>
        <div><Link href="/privacy">Privacidad</Link><Link href="/terms">Términos</Link><Link href="/support">Soporte</Link></div>
      </footer>
    </main>
  );
}
