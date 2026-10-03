import Link from 'next/link';
import localFont from 'next/font/local';
import { TapExperience, LandingDemo, RoleIcon } from './landing-experience';
import { nivalWhatsApp } from '@/lib/managed-business';
import './pay-landing.css';

const sora=localFont({src:'../fonts/sora-latin-700.woff2',variable:'--pay-title'});
const inter=localFont({src:'../fonts/inter-latin-400.woff2',variable:'--pay-body'});
export const dynamic = 'force-dynamic';
export default async function Home(){
  const contact = await nivalWhatsApp('Hola, me interesa una Nival Pay para mi negocio.');
  return <main className={`payLanding ${sora.variable} ${inter.variable}`}><header className="payLandingNav"><Link className="payLandingBrand" href="/">NIVAL <small>PAY</small></Link><nav aria-label="Acceso a tu cuenta"><Link className="roleAccess" href="/auth"><RoleIcon/><span>Cuenta de administrador</span></Link><Link className="roleAccess roleBusiness" href="/negocio"><RoleIcon business/><span>Cuenta de negocio</span></Link></nav></header>
    <section className="payLandingHero"><div className="heroCopy"><div className="heroPill"><span/> TU NEGOCIO, A UN TOQUE</div><h1>Acerca.<br/>Copia.<br/><em>Transfiere.</em></h1><p>Comparte tus datos bancarios<br/>con una tarjeta Nival Pay.</p><div className="payLandingActions"><Link className="payLandingPrimary" href="#demo">Probar la demo</Link><a className="payLandingSecondary" href={contact ?? '/support'}>Quiero mi tarjeta</a></div><div className="heroMeta"><span>$50 MXN para empezar</span><i/><span>30 aperturas incluidas</span></div></div><TapExperience/></section>
    <div className="landingFeatureLine"><span>Sin app</span><i/><span>NFC + QR</span><i/><span>Datos editables</span><i/><span>Pago por uso</span></div>
    <LandingDemo/>
    <section className="simplePricing"><div><span className="sectionLabel">ASÍ DE SIMPLE</span><h2>Empieza con $50.<br/>Incluye 30 aperturas.</h2></div><div className="priceCard"><div><strong>$1</strong><span>MXN por apertura<br/>por cada apertura adicional</span></div><p>Después de las 30 aperturas iniciales, recarga desde la cantidad que quieras. Cada $1 MXN agrega 1 apertura y el saldo no caduca.</p><a href={contact ?? '/support'}>Solicitar mi tarjeta</a></div><details className="pricingDetails"><summary>¿Qué cuenta como apertura?</summary><p>Una nueva entrada desde NFC o QR puede sumar una apertura. Recargar o restaurar esa misma página no suma otra. Los enlaces generados para un cliente cuentan como máximo una apertura por enlace. Abrir la página directa no genera un cobro.</p><p>La apertura no confirma una transferencia. Cuando el saldo llega a 0, la tarjeta se pausa hasta recibir una recarga.</p></details></section>
    <footer className="payLandingFooter"><Link className="payLandingBrand" href="/">NIVAL <small>PAY</small></Link><nav><Link href="/support">Contacto</Link><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link></nav><span>Un toque. Y listo.</span></footer>
  </main>;
}
