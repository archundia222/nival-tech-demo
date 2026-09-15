import Link from 'next/link';
export default function Products() {
  return <main className="payWorkspace">
    <nav className="payNav"><Link href="/" className="brand">NIVAL tech</Link><Link href="/dashboard">Mi cuenta</Link></nav>
    <header className="payHeading"><p className="eyebrow">PRODUCTOS Y SERVICIOS</p><h1>Elige cómo conectar tu negocio.</h1><p>Tus tarjetas y herramientas digitales, desde una misma cuenta.</p></header>
    <div className="payProductGrid">
      <article className="payProduct"><p className="eyebrow">NIVAL CARD</p><h2>Nival Pay</h2><p>Una página con tu banco, CLABE, titular, imagen y enlace de pago. Lista para compartir con NFC y QR.</p><Link className="payButton" href="/dashboard/pay">Configurar Nival Pay</Link></article>
      <article className="payProduct"><p className="eyebrow">NIVAL CARD</p><h2>Reseñas y enlaces</h2><p>Dirige a tus clientes a Google, tu página web u otro enlace desde una tarjeta NFC.</p><Link className="payButton" href="/dashboard#nival-card">Configurar un enlace</Link></article>
      <article className="payProduct"><p className="eyebrow">NIVAL INTELLIGENCE</p><h2>Conoce a tus clientes</h2><p>Administra clientes, visitas, puntos y recomendaciones desde el panel de tu negocio.</p><Link className="payButton" href="/dashboard">Abrir Intelligence</Link></article>
    </div>
    <p className="payHelp">Configurar una página no realiza ningún cargo. La contratación y el cobro automático aún no están habilitados.</p>
  </main>;
}
