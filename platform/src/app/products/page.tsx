import Link from 'next/link';

export const metadata = { title: 'Productos | Nival Tech', description: 'Cobra, crea recurrencia y convierte actividad en acciones para tu negocio.' };

export default function Products() {
  return <main className="payWorkspace nivalProductsPage">
    <nav className="payNav"><Link href="/" className="brand">NIVAL tech</Link><Link href="/dashboard">Mi cuenta</Link></nav>
    <header className="payHeading nivalProductsHeading"><p className="eyebrow">PRODUCTOS NIVAL TECH</p><h1>Empieza por el problema que quieres resolver.</h1><p>No necesitas contratar todo. Pay te ayuda a cobrar, Puntos a hacer que vuelvan e Intelligence a decidir qué hacer para crecer.</p></header>
    <div className="payProductGrid nivalProductsGrid">
      <article className="payProduct">
        <div className="productJob">COBRAR</div>
        <h2>Nival Pay</h2>
        <p>Tarjeta NFC + QR + página de cobro editable. Tu cliente abre, copia tus datos y paga sin pedirte capturas ni volver a dictar la CLABE.</p>
        <div className="productSimplePrice"><strong>$199</strong><span>MXN · pago único</span></div>
        <ul><li>Primera tarjeta NFC incluida</li><li>3 apartados incluidos</li><li>Datos editables sin cambiar la tarjeta</li></ul>
        <Link className="payButton" href="/dashboard/pay">Crear mi Nival Pay</Link>
      </article>
      <article className="payProduct">
        <div className="productJob">HACER QUE VUELVAN</div>
        <h2>Nival Puntos</h2>
        <p>Programa digital para registrar visitas, entregar recompensas y convertir una primera compra en una razón para regresar.</p>
        <div className="productSimplePrice"><strong>$199</strong><span>MXN · al mes</span></div>
        <ul><li>Registro con QR</li><li>Tarjeta digital del cliente</li><li>Visitas, puntos y recompensas</li></ul>
        <Link className="payButton" href="/dashboard/points">Crear mi programa</Link>
      </article>
      <article className="payProduct intelligenceProductCard">
        <div className="productJob">CRECER</div>
        <h2>Nival Intelligence</h2>
        <p>Revisa el comportamiento de tus clientes y lo convierte en acciones: a quién recuperar, qué campaña probar y qué resultado observar.</p>
        <div className="productSimplePrice"><strong>$399</strong><span>MXN · al mes</span></div>
        <ul><li>Prioriza oportunidades</li><li>Campañas y mensajes sugeridos</li><li>Resultados y aprendizaje</li></ul>
        <Link className="payButton" href="/dashboard/intelligence">Ver Intelligence</Link>
      </article>
    </div>
    <section className="productsBundle"><div><span>MEJOR JUNTOS</span><h2>Puntos + Intelligence · $449 MXN/mes</h2><p>Puntos registra la recurrencia. Intelligence usa esa actividad para encontrar oportunidades y decirte qué hacer después.</p></div><Link href="/dashboard/intelligence">Conocer el paquete →</Link></section>
  </main>;
}
