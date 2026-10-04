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
    <section className="payLandingHero"><div className="heroCopy"><div className="heroPill"><span/> TU NEGOCIO, A UN TOQUE</div><h1>Acerca.<br/>Copia.<br/><em>Transfiere.</em></h1><p>Comparte tus datos bancarios<br/>con una tarjeta Nival Pay.</p><div className="payLandingActions"><Link className="payLandingPrimary" href="#demo">Probar la demo</Link><a className="payLandingSecondary" href={contact ?? '/support'}>Quiero mi tarjeta</a></div><div className="heroMeta"><span>$49 MXN pago único</span><i/><span>Acceso de por vida</span></div></div><TapExperience/></section>
    <div className="landingFeatureLine"><span>Sin app</span><i/><span>NFC + QR</span><i/><span>Datos editables</span><i/><span>Sin mensualidades</span></div>
    <LandingDemo/>
    <section className="simplePricing"><div><span className="sectionLabel">ASÍ DE SIMPLE</span><h2>$49 MXN.<br/>Pago único de por vida.</h2></div><div className="priceCard"><div><strong>$49</strong><span>MXN pago único<br/>acceso de por vida</span></div><p>Una vez que registramos tu pago, tienes acceso permanente a Nival Pay. Sin mensualidades, sin recargas y sin límites por aperturas.</p><a href={contact ?? '/support'}>Solicitar mi tarjeta</a></div><details className="pricingDetails"><summary>¿Qué incluye?</summary><p>Tu Nival Pay con NFC + QR y acceso a la plataforma para editar tus datos bancarios cuando quieras.</p><p>No cobramos por apertura y tu tarjeta no se suspende por número de visitas.</p></details></section>
    <a className="whatsappSticky" href={contact ?? '/support'} aria-label="Mandar mensaje por WhatsApp"><span className="whatsappStickyIcon">WA</span><span>WhatsApp</span></a>\n    <footer className="payLandingFooter"><Link className="payLandingBrand" href="/">NIVAL <small>PAY</small></Link><nav><Link href="/support">Contacto</Link><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link></nav><span>Un toque. Y listo.</span></footer>
  </main>;
}
