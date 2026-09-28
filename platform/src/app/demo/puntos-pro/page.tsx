import Link from "next/link";
import { NIVAL_POINTS_FOUNDER_PRICE_CENTS, mxn } from "@/lib/commercial";

export default function PointsProPublicDemoPage() {
  return <main className="pointsProPublicDemo">
    <header className="pointsProDemoHero">
      <Link href="/" className="pointsProDemoBrand"><span>N</span><b>Tocario</b></Link>
      <div>
        <p className="landingEyebrow landingEyebrowLarge">DEMO PÚBLICA · TOCARIO PUNTOS PRO</p>
        <h1>Mira lo que desbloqueas antes de pagar.</h1>
        <p>Todos los datos de esta página son ficticios. La idea es que puedas recorrer cómo se vería Pro sin tener una cuenta ni contratar nada.</p>
      </div>
    </header>

    <section className="pointsProDemoSection">
      <div className="pointsProDemoHeading"><span>01 · RESUMEN</span><h2>Te dice qué merece atención hoy.</h2><p>En lugar de revisar cliente por cliente, Pro agrupa la actividad y te lleva a una acción concreta.</p></div>
      <div className="pointsActionSegments demo">
        <article><small>CLIENTES FRECUENTES</small><strong>42</strong><p>Visitan seguido. Buen grupo para agradecer o premiar.</p><button type="button">Preparar promoción</button></article>
        <article><small>POR RECUPERAR</small><strong>18</strong><p>Llevan entre 15 y 45 días sin volver.</p><button type="button">Crear mensaje</button></article>
        <article><small>INACTIVOS</small><strong>9</strong><p>Llevan más de 45 días sin visita.</p><button type="button">Ver clientes</button></article>
        <article><small>SIN PRIMERA VISITA</small><strong>6</strong><p>Se registraron pero todavía no regresan.</p><button type="button">Revisar experiencia</button></article>
      </div>
    </section>

    <section className="pointsProDemoSection">
      <div className="pointsProDemoHeading"><span>02 · GOOGLE WALLET</span><h2>La tarjeta vive donde tu cliente ya guarda pases.</h2><p>El saldo y las visitas se actualizan cuando registras actividad. Esta vista es una simulación.</p></div>
      <div className="pointsWalletDemoCard">
        <div><span>TOCARIO PUNTOS</span><b>Café Nival</b></div>
        <strong>7</strong><small>PUNTOS</small>
        <div className="pointsWalletDemoProgress"><i style={{width:"70%"}} /></div>
        <p>3 puntos para tu próxima recompensa</p>
        <span className="pointsWalletDemoBadge">Google Wallet · Pro</span>
      </div>
    </section>

    <section className="pointsProDemoSection">
      <div className="pointsProDemoHeading"><span>03 · PROMOCIONES</span><h2>No mandes el mismo mensaje a todos.</h2><p>Pro te deja partir de actividad real y luego medir si ese grupo volvió.</p></div>
      <div className="pointsProMockup">
        <div className="pointsProMockupTop"><div><small>AUDIENCIA DE EJEMPLO</small><strong>Clientes que no han vuelto en 14 días</strong></div><span>28 clientes</span></div>
        <div className="pointsProMockupMessage"><small>MENSAJE SUGERIDO</small><p>“Hola Ana, hace rato que no te vemos. Esta semana tienes café + pan por $79. Muéstranos este mensaje al visitarnos.”</p></div>
        <div className="pointsProMockupStats"><div><small>Enviados</small><strong>28</strong></div><div><small>Regresaron</small><strong>7</strong></div><div><small>Respuesta</small><strong>25%</strong></div></div>
      </div>
    </section>

    <section className="pointsProDemoSection">
      <div className="pointsProDemoHeading"><span>04 · CONFIGURACIÓN AVANZADA</span><h2>Ajusta el programa al comportamiento de tu negocio.</h2><p>Free usa reglas simples. Pro te deja controlar la experiencia.</p></div>
      <div className="pointsProMockup settings">
        <label><span>Meta de recompensa</span><b>10 visitas</b></label>
        <label><span>Recompensa</span><b>Café gratis</b></label>
        <label><span>Máximo de puntos por día</span><b>2</b></label>
        <label><span>Tiempo mínimo entre visitas</span><b>60 min</b></label>
        <label><span>Google Wallet</span><b>Activado</b></label>
        <label><span>Pedir reseña</span><b>En visita 3</b></label>
      </div>
    </section>

    <section className="pointsProDemoSection">
      <div className="pointsProDemoHeading"><span>05 · RESULTADOS</span><h2>La campaña no termina cuando envías el mensaje.</h2><p>La parte valiosa es saber qué pasó después.</p></div>
      <div className="pointsProResultsDemo">
        <article><small>CAMPAÑA</small><strong>“Regresa esta semana”</strong></article>
        <article><small>CLIENTES CONTACTADOS</small><strong>28</strong></article>
        <article><small>CLIENTES QUE VOLVIERON</small><strong>7</strong></article>
        <article><small>RECUPERACIÓN</small><strong>25%</strong></article>
      </div>
    </section>

    <section className="pointsProDemoWhy">
      <span>¿QUÉ CAMBIA CON PRO?</span>
      <h2>Pasas de acumular puntos a saber qué hacer con la actividad.</h2>
      <div><b>Free</b><p>Programa básico, hasta 10 clientes, tarjeta digital y una recompensa activa.</p></div>
      <div><b>Pro</b><p>Google Wallet, más capacidad, configuración avanzada, segmentos, promociones y seguimiento de resultados.</p></div>
    </section>

    <aside className="pointsProPublicSticky">
      <div><small>PRECIO FUNDADOR</small><strong>{mxn(NIVAL_POINTS_FOUNDER_PRICE_CENTS)}/mes</strong></div>
      <Link href="/auth?mode=signup&next=%2Fdashboard%2Fpoints%3Fview%3Dpro">Cambiar a Pro →</Link>
    </aside>
  </main>;
}
