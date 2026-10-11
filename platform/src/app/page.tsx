import Link from "next/link";

const plans = [
  { name: "Puntos", price: 299, id: "puntos", intro: "Lealtad que vuelve.", items: ["Tarjeta NFC", "Clientes ilimitados", "Hasta 10 promociones simultáneas", "Hasta 10 sucursales", "Soporte prioritario", "Estadísticas de impacto y lealtad", "Ticket, nombre y teléfono del cliente"] },
  { name: "Esencial", price: 399, id: "esencial", intro: "Puntos y reputación.", items: ["Todo lo de Puntos", "30 respuestas a reseñas por periodo", "Estadísticas avanzadas de reseñas", "Impacto y resumen de reseñas", "Estado de la ficha de Google"] },
  { name: "Plus", price: 549, id: "plus", intro: "Una visión completa de tu zona.", items: ["Todo lo de Esencial", "100 respuestas a reseñas por periodo", "Comparación con negocios parecidos de tu zona", "Calificación y número de reseñas"] },
];

export default function Home() {
  return <main className="site"><header className="siteHeader"><Link href="/" className="wordmark">nival<span>.</span></Link><nav><a href="#planes">Planes</a><a href="#incluido">Incluido</a><Link className="login" href="/auth">Iniciar sesión</Link></nav></header>
    <section className="hero"><span className="kicker">Lealtad local, hecha simple</span><h1>Haz que cada visita<br/><em>cuente de nuevo.</em></h1><p>Puntos, reseñas y claridad para crecer con tus clientes.</p><a className="button primary" href="#planes">Ver planes <span>↘</span></a></section>
    <section id="planes" className="plans"><div className="sectionHeading"><div><span className="kicker">Planes mensuales</span><h2>Elige cómo crecer</h2></div><p>Cada periodo dura 30 días.<br/>Sin costos ocultos.</p></div><div className="planGrid">{plans.map((plan, i) => <article className={i === 1 ? "planCard featured" : "planCard"} key={plan.id}>{i === 1 && <span className="popular">Más elegido</span>}<h3>{plan.name}</h3><p className="planIntro">{plan.intro}</p><p className="price"><sup>$</sup>{plan.price}<small> MXN / mes</small></p><a className={i === 1 ? "button primary" : "button outline"} href={"/auth?mode=signup&next=%2Fplanes%3Fplan%3D"+plan.id}>Elegir {plan.name}</a><ul>{plan.items.map(item => <li key={item}><span>✓</span>{item}</li>)}</ul></article>)}</div></section>
    <section id="incluido" className="included"><div><span className="kicker">Siempre incluido</span><h2>Todo listo para conectar.</h2><p>Nival Pay y Nival Reseñas vienen sin costo adicional con cualquiera de los tres planes.</p></div><div className="addonGrid"><article><span className="addonMark">N</span><div><h3>Nival Pay</h3><p>Hasta 10 tarjetas NFC con QR para facilitar los pagos.</p><b>Incluido</b></div></article><article><span className="addonMark">N</span><div><h3>Nival Reseñas</h3><p>Hasta 10 tarjetas NFC con QR para recibir reseñas de Google.</p><b>Incluido</b></div></article></div></section>
    <section className="report"><div className="reportIcon">PDF</div><div><span className="kicker">Cada 30 días</span><h2>El impacto, en un informe claro.</h2><p>Al cierre de cada periodo recibes un PDF con los resultados clave incluidos en tu plan: puntos; puntos y reseñas; o puntos, reseñas y comparación de zona.</p></div></section>
    <footer><Link href="/" className="wordmark">nival<span>.</span></Link><p>Lealtad que se nota.</p><Link href="/auth">Acceso para negocios →</Link></footer>
  </main>;
}
