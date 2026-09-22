import Link from 'next/link';

export const metadata = { title: 'Productos | Nival Tech', description: 'Herramientas digitales para cobros, lealtad y decisiones de negocios locales.' };

export default function Products() {
  return <main className="payWorkspace">
    <nav className="payNav"><Link href="/" className="brand">NIVAL tech</Link><Link href="/dashboard">Mi cuenta</Link></nav>
    <header className="payHeading"><p className="eyebrow">PRODUCTOS NIVAL TECH</p><h1>Empieza por cobrar mejor.</h1><p>Una cuenta para administrar las herramientas de tu negocio, sin mezclar lo que ya puedes contratar con lo que todavía está en desarrollo.</p></header>
    <div className="payProductGrid">
      <article className="payProduct"><p className="eyebrow">DISPONIBLE</p><h2>Nival Pay</h2><p>Tarjeta NFC, página con datos bancarios, QR y tres apartados configurables por $199 MXN en un solo pago.</p><Link className="payButton" href="/dashboard/pay">Administrar Nival Pay</Link></article>
      <article className="payProduct"><p className="eyebrow">EN DESARROLLO</p><h2>Nival Puntos</h2><p>Registro de clientes, visitas, puntos y recompensas para negocios que viven de la recurrencia.</p><Link className="payButton" href="/dashboard/points">Conocer Nival Puntos</Link></article>
      <article className="payProduct"><p className="eyebrow">EN DESARROLLO</p><h2>Nival Intelligence</h2><p>Segmentos, clientes en riesgo, recomendaciones e importación de datos para convertir actividad en decisiones.</p><Link className="payButton" href="/dashboard/intelligence">Conocer Intelligence</Link></article>
    </div>
    <p className="payHelp">Nival Pay es el producto disponible actualmente. Puntos e Intelligence se muestran para pruebas y desarrollo, pero todavía no forman parte de la oferta comercial.</p>
  </main>;
}
