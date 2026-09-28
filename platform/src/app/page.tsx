import Image from 'next/image';
import Link from 'next/link';
import { LandingProductVisuals } from './landing-product-visuals';
import { LandingTabs } from './landing-tabs';
import { pricingV2, previewMxn, previewNotice } from '@/lib/pricing';
import './v2-landing.css';

const whatsapp = 'https://wa.me/525539044788?text=' + encodeURIComponent('Hola, quiero una tarjeta Nival para mi negocio.');
const questions = [
  ['¿Mis clientes necesitan una app?', 'No. Abren el enlace o QR desde su navegador. La tarjeta NFC abre la página compatible con su teléfono.'],
  ['¿Qué pasa si su celular no tiene NFC?', 'Pueden escanear el QR de respaldo o abrir el enlace que compartas.'],
  ['¿Nival maneja mi dinero?', 'No. Nival Pay muestra tus datos de cobro; la transferencia va directamente a tu cuenta.'],
  ['¿Puedo cambiar mis datos después?', 'Sí. Puedes editar los datos de tu página desde el panel.'],
  ['¿Cómo funciona el WiFi?', 'Tu cliente ve los datos o el enlace de acceso que configures. En iPhone, acercar una tarjeta NFC no conecta por sí solo a la red.'],
];
export default function Home() {
  return <main className="nv2" id="inicio">
    <nav className="nv2Nav" aria-label="Navegación principal">
      <Link className="nv2Brand" href="#inicio"><span className="nv2Logo"><Image src="/wallet/nival-logo.svg" width={30} height={30} alt=""/></span>Nival Tech</Link>
      <div className="nv2NavLinks"><a href="#como-funciona">Cómo funciona</a><a href="#precios">Precios</a><a href="#preguntas">Preguntas</a></div>
      <div className="nv2NavActions"><Link href="/auth">Entrar</Link><a className="nv2Button" href="#precios">Quiero mi tarjeta</a></div>
    </nav>
    <section className="nv2Hero">
      <div className="nv2HeroText"><span className="nv2Eyebrow">UNA TARJETA PARA TU NEGOCIO</span><h1>Que te paguen, te dejen reseña y se conecten a tu WiFi. <em>Con un toque.</em></h1><p>Una tarjeta NFC y un QR para compartir lo que tus clientes necesitan. Sin instalar otra app.</p><div className="nv2HeroOffer">Desde <strong>{previewMxn(pricingV2.cards.essential.priceCents)}</strong> · pago único · sin mensualidad</div><a className="nv2Button nv2BigButton" href="#precios">Conocer las tarjetas <span aria-hidden="true">→</span></a><small>Oferta V2 en vista previa. La compra de estos paquetes todavía no está habilitada.</small></div>
      <div className="nv2HeroArt"><LandingProductVisuals /></div>
    </section>
    <section className="nv2Examples" aria-label="Ejemplos de uso"><span>PARA TU DÍA A DÍA</span><div className="nv2ExampleRow"><b>☕ Cafetería</b><b>✂ Barbería</b><b>✿ Estudio</b><b>🍽 Restaurante</b><b>⚑ Consultorio</b></div><p>Ejemplos ilustrativos. No representan clientes de Nival Tech.</p></section>
    <section className="nv2Section nv2Demo" id="demo"><div className="nv2SectionHead"><span className="nv2Eyebrow">MIRA EL RESULTADO</span><h2>Una tarjeta. Tres cosas que tus clientes ya te piden.</h2><p>Prueba cada vista. Puntos es un producto aparte para que tus clientes vuelvan.</p></div><LandingTabs/><Link className="nv2TextLink" href="/demo">Abrir la demo en tu celular →</Link></section>
    <section className="nv2Section nv2Before" id="como-funciona"><div className="nv2SectionHead"><span className="nv2Eyebrow">MENOS EXPLICACIONES</span><h2>Deja de buscar el papelito con la CLABE.</h2></div><div className="nv2Compare"><article><span>ANTES</span><h3>Datos sueltos por mensaje</h3><p>Dictas la CLABE, mandas la contraseña del WiFi y esperas a que encuentren tu negocio en Google.</p></article><article><span>CON NIVAL</span><h3>Un enlace que puedes compartir</h3><p>Tu cliente abre la página, copia tus datos y encuentra la acción que necesita.</p></article></div><div className="nv2Steps"><div><b>01</b><h3>Crea tu cuenta</h3><p>Configura lo que quieres compartir.</p></div><div><b>02</b><h3>Pruébalo con tu QR</h3><p>Revisa la experiencia desde tu celular.</p></div><div><b>03</b><h3>Comparte tu tarjeta</h3><p>Cuando esté lista, úsala con tus clientes.</p></div></div></section>
    <section className="nv2Section nv2Benefits"><div className="nv2SectionHead"><span className="nv2Eyebrow">NIVAL CARDS</span><h2>Lo esencial, a la mano.</h2></div><div className="nv2BenefitGrid"><article><span>01 / PAY</span><h3>Cobra sin dictar</h3><p>El cliente abre y copia tus datos bancarios.</p></article><article><span>02 / RESEÑAS</span><h3>Comparte tu enlace de Google</h3><p>Pon el acceso a tus reseñas en el momento adecuado.</p></article><article><span>03 / WIFI</span><h3>Comparte tu red</h3><p>Muestra el nombre y contraseña con controles para copiarlos.</p></article></div></section>
    <section className="nv2Section nv2Pricing" id="precios"><div className="nv2SectionHead"><span className="nv2Eyebrow">PRECIOS PROPUESTOS</span><h2>Elige lo que necesita tu negocio.</h2><p>Pago único por Cards. Puntos tiene un plan Free separado.</p></div><div className="nv2PriceGrid">{[pricingV2.cards.essential,pricingV2.cards.complete].map((plan,i)=><article key={plan.name} className={i?'featured':''}>{i===1&&<span className="nv2Badge">Paquete propuesto</span>}<h3>{plan.name}</h3><p>{plan.description}</p><div className="nv2Amount">{previewMxn(plan.priceCents)} <small>una sola vez</small></div><ul>{plan.features.map(item=><li key={item}>✓ {item}</li>)}</ul><Link className="nv2Button" href="/auth?mode=signup">Probar 15 días gratis</Link></article>)}</div><p className="nv2PriceNotice">{previewNotice} La prueba actual permite explorar los productos disponibles por separado.</p></section>
    <section className="nv2Section nv2Points"><div><span className="nv2Eyebrow">NIVAL PUNTOS</span><h2>Haz que vuelvan.</h2><p>Registra clientes y visitas, muestra su progreso y dales un motivo claro para regresar.</p><strong>Free permanente · límite actual: 10 clientes</strong><small>El límite de 25 y los precios Pro propuestos requieren cambios de producto y QA. Pro aún no está validado de extremo a extremo.</small><Link className="nv2Button" href="/auth?mode=signup&next=%2Fdashboard%2Fpoints">Empezar con Puntos Free</Link></div><div className="nv2PointsCard"><span>PROGRAMA DE EJEMPLO</span><b>☕ Café Nival</b><strong>7 / 10 puntos</strong><div><i style={{width:'70%'}}/></div><p>Te faltan 3 puntos para tu premio.</p></div></section>
    <section className="nv2Section nv2Faq" id="preguntas"><div className="nv2SectionHead"><span className="nv2Eyebrow">PREGUNTAS FRECUENTES</span><h2>Antes de empezar</h2></div>{questions.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
    <section className="nv2Final"><span>EMPIEZA CON UNA PRUEBA</span><h2>Haz más fácil cada interacción con tu negocio.</h2><p>Prueba los productos disponibles desde tu celular y decide cuáles necesitas.</p><Link className="nv2Button" href="/auth?mode=signup">Crear mi cuenta gratis</Link></section>
    <footer className="nv2Footer"><strong>Nival Tech</strong><div><Link href="/privacy">Privacidad</Link><Link href="/terms">Términos</Link><Link href="/cookies">Cookies</Link><Link href="/refunds">Reembolsos</Link><Link href="/auth">Entrar</Link></div></footer>
    <a className="nv2Whatsapp" href={whatsapp} target="_blank" rel="noreferrer" aria-label="Hablar con Nival Tech por WhatsApp">WhatsApp</a>
  </main>;
}
