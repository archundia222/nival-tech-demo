import Link from 'next/link';

export const metadata = { title: 'Productos | Nival Tech', description: 'Cobra, crea recurrencia y convierte actividad en acciones para tu negocio.' };

export default function Products() {
  return <main className="payWorkspace nivalProductsPage">
    <nav className="payNav"><Link href="/" className="brand">NIVAL tech</Link><Link href="/dashboard">Mi cuenta</Link></nav>
    <header className="payHeading nivalProductsHeading"><p className="eyebrow">PRODUCTOS NIVAL TECH</p><h1>Empieza por el problema que quieres resolver.</h1><p>No necesitas pagar para empezar. Prueba cada producto con un plan gratis y amplía solo cuando necesites más capacidad o herramientas.</p></header>
    <div className="payProductGrid nivalProductsGrid">
      <article className="payProduct">
        <div className="productJob">COBRAR</div>
        <h2>Nival Pay</h2>
        <p>Página de cobro editable con QR y enlace. En Pro agregas NFC física para que tu cliente abra, copie tus datos y pague sin pedirte capturas ni volver a dictar la CLABE.</p>
        <div className="productSimplePrice"><strong>Gratis</strong><span>QR + enlace · Pro $199 pago único</span></div>
        <ul><li>Gratis: página, QR, enlace y 1 apartado</li><li>Pro: tarjeta NFC física + 3 apartados</li><li>Mismo QR cuando actualizas</li></ul>
        <Link className="payButton" href="/dashboard/pay">Crear Nival Pay gratis</Link>
      </article>
      <article className="payProduct">
        <div className="productJob">HACER QUE VUELVAN</div>
        <h2>Nival Puntos</h2>
        <p>Programa digital para registrar visitas, entregar recompensas y convertir una primera compra en una razón para regresar.</p>
        <div className="productSimplePrice"><strong>Gratis</strong><span>hasta 30 clientes · Pro $199/mes</span></div>
        <ul><li>El cliente puede registrarse solo desde QR</li><li>Tarjeta digital y recompensas reales</li><li>Captura rápida de visitas y clientes</li></ul>
        <Link className="payButton" href="/dashboard/points">Crear programa gratis</Link>
      </article>
      <article className="payProduct intelligenceProductCard">
        <div className="productJob">CRECER</div>
        <h2>Nival Intelligence</h2>
        <p>Revisa el comportamiento de tus clientes y lo convierte en acciones: a quién recuperar, qué campaña probar y qué resultado observar.</p>
        <div className="productSimplePrice"><strong>Gratis</strong><span>1 oportunidad principal · Pro $399/mes</span></div>
        <ul><li>Registra una venta, el cierre del día o importa CSV</li><li>Gratis: señal y recomendación principal</li><li>Pro: personas, mensajes, campañas y resultados</li></ul>
        <Link className="payButton" href="/dashboard/intelligence">Activar Intelligence gratis</Link>
      </article>
    </div>
    <section className="productsAccessory">
      <div><span>NIVAL CARD</span><h2>Una tarjeta NFC para la acción que necesites.</h2><p>Programa una tarjeta para Nival Pay, Nival Puntos, reseñas o tu perfil digital. Elige plantilla, color y destino; el reverso personalizado cuesta $10 MXN extra.</p></div>
      <div><strong>Desde $99 MXN</strong><small>La primera tarjeta de Nival Pay Pro ya está incluida.</small><Link href="/dashboard/pay/physical">Diseñar una tarjeta →</Link></div>
    </section>
    <section className="productsBundle"><div><span>CRECE SIN CAMBIAR DE SISTEMA</span><h2>Empieza gratis. Pasa a Pro cuando ya lo uses.</h2><p>Los datos y clientes se conservan al ampliar. Si usas Puntos Pro + Intelligence Pro, el paquete cuesta $449 MXN al mes.</p></div><Link href="/dashboard">Ir a mi negocio →</Link></section>
  </main>;
}
