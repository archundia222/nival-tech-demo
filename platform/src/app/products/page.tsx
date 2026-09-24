import Link from 'next/link';
import { NIVAL_GROWTH_PRICE_CENTS, NIVAL_PAY_FOUNDER_PRICE_CENTS, NIVAL_PAY_REGULAR_PRICE_CENTS, NIVAL_POINTS_FOUNDER_PRICE_CENTS, NIVAL_POINTS_FREE_CUSTOMER_LIMIT, NIVAL_POINTS_REGULAR_PRICE_CENTS, NIVAL_TRIAL_DAYS, mxn } from '@/lib/commercial';

export const metadata = {
  title: 'Planes y productos | Nival Tech',
  description: 'Empieza gratis con Nival Pay o Nival Puntos. Conoce los precios de lanzamiento y Nival Growth.',
};

export default function Products() {
  return <main className="payWorkspace nivalProductsPage">
    <nav className="payNav"><Link href="/" className="brand">NIVAL tech</Link><Link href="/dashboard">Mi cuenta</Link></nav>

    <header className="payHeading nivalProductsHeading">
      <p className="eyebrow">PLANES NIVAL TECH</p>
      <h1>Empieza sin riesgo. Paga cuando ya exista valor.</h1>
      <p>La entrada gratuita está diseñada para que pruebes Nival con clientes reales. Los precios fundador corresponden a la etapa actual de lanzamiento y validación.</p>
    </header>

    <section className="nivalPricingPrinciple">
      <div><span>01</span><strong>Prueba</strong><p>Configura Nival y úsalo antes de comprometerte.</p></div>
      <div><span>02</span><strong>Demuestra valor</strong><p>Mide uso real: aperturas, clientes, visitas y recompensas.</p></div>
      <div><span>03</span><strong>Amplía</strong><p>Pasa a Pro o Growth cuando necesites más capacidad y acciones.</p></div>
    </section>

    <div className="payProductGrid nivalProductsGrid">
      <article className="payProduct">
        <div className="productJob">COBRAR</div>
        <h2>Nival Pay</h2>
        <p>Tu página de cobro, QR y enlace permanecen gratis. El plan físico agrega NFC y más apartados sin cambiar el QR.</p>
        <div className="productSimplePrice"><strong>Gratis digital</strong><span>Pro físico: {mxn(NIVAL_PAY_FOUNDER_PRICE_CENTS)} pago único</span></div>
        <div className="founderPriceNote"><b>PRECIO FUNDADOR</b><span>Precio regular previsto después del lanzamiento: {mxn(NIVAL_PAY_REGULAR_PRICE_CENTS)}</span></div>
        <ul><li>Gratis: página, QR, enlace y 1 apartado</li><li>Pro: 1 tarjeta NFC física + 3 apartados</li><li>Apartados extra por $49 MXN</li></ul>
        <Link className="payButton" href="/auth?mode=signup&next=%2Fdashboard%2Fpay">Crear Nival Pay gratis</Link>
      </article>

      <article className="payProduct featuredPricingCard">
        <div className="productJob">FIDELIZAR</div>
        <h2>Nival Puntos</h2>
        <p>Empieza con {NIVAL_TRIAL_DAYS} días de herramientas Pro. Si no pagas, tu programa no desaparece: baja al plan Gratis y conserva hasta {NIVAL_POINTS_FREE_CUSTOMER_LIMIT} clientes.</p>
        <div className="productSimplePrice"><strong>{mxn(NIVAL_POINTS_FOUNDER_PRICE_CENTS)}/mes</strong><span>precio fundador Pro</span></div>
        <div className="founderPriceNote"><b>{NIVAL_TRIAL_DAYS} DÍAS PARA PROBAR</b><span>Precio regular previsto después del lanzamiento: {mxn(NIVAL_POINTS_REGULAR_PRICE_CENTS)}/mes</span></div>
        <ul><li>QR/NFC + tarjeta digital + Google Wallet en Android</li><li>Visitas, puntos, recompensas y configuración Pro</li><li>Después del trial: Free de hasta {NIVAL_POINTS_FREE_CUSTOMER_LIMIT} clientes si no pagas</li></ul>
        <Link className="payButton" href="/auth?mode=signup&next=%2Fdashboard%2Fpoints">Probar Nival Puntos</Link>
      </article>

      <article className="payProduct intelligenceProductCard" id="growth">
        <div className="productJob">CRECER</div>
        <h2>Nival Growth</h2>
        <p>Nival Puntos + Nival Intelligence en un solo plan. Puntos genera la actividad; Intelligence detecta a quién recuperar, qué campaña probar y qué resultado observar.</p>
        <div className="productSimplePrice"><strong>{mxn(NIVAL_GROWTH_PRICE_CENTS)}/mes</strong><span>Puntos + Intelligence</span></div>
        <div className="founderPriceNote"><b>EXPANSIÓN</b><span>Intelligence no se vende como sistema aislado: usa la actividad real de Puntos.</span></div>
        <ul><li>Todo Nival Puntos Pro</li><li>Clientes frecuentes, riesgo y oportunidades</li><li>Audiencias, mensajes, campañas y medición</li></ul>
        <Link className="payButton" href="/auth?mode=signup&next=%2Fdashboard%2Fpoints">Empezar con Puntos</Link>
      </article>
    </div>

    <section className="productsAccessory">
      <div><span>NIVAL CARD</span><h2>Hardware como extensión, no como dependencia.</h2><p>Programa una tarjeta para Pay, Puntos, reseñas o tu perfil digital. El software sigue funcionando por QR y enlace aunque todavía no tengas una tarjeta física.</p></div>
      <div><strong>Desde $99 MXN</strong><small>La primera tarjeta de Nival Pay Pro está incluida durante la oferta fundador actual.</small><Link href="/auth?mode=signup&next=%2Fdashboard%2Fpay%2Fphysical">Diseñar una tarjeta →</Link></div>
    </section>

    <section className="productsBundle">
      <div><span>MODELO PENSADO PARA CRECER</span><h2>Adquiere con Free. Monetiza con Pro. Expande con Growth.</h2><p>Así un negocio puede entrar con poco riesgo, demostrar que Nival encaja y aumentar su plan conforme obtiene más valor. Tus datos y clientes se conservan al ampliar.</p></div>
      <Link href="/auth?mode=signup&next=%2Fdashboard%2Fpoints">Empezar gratis →</Link>
    </section>
  </main>;
}
