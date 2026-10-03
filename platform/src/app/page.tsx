import Link from 'next/link';
import localFont from 'next/font/local';
import { PaymentPageView } from './pay/[token]/payment-page-view';
import { nivalWhatsApp } from '@/lib/managed-business';
import { managedUsagePricing } from '@/lib/pricing';
import { money } from '@/lib/orders';
import './pay-landing.css';

const sora=localFont({src:'../fonts/sora-latin-700.woff2',variable:'--pay-title'});
const inter=localFont({src:'../fonts/inter-latin-400.woff2',variable:'--pay-body'});
export const dynamic = 'force-dynamic';

export default async function Home(){
  const contact = await nivalWhatsApp('Hola, me interesa una Nival Pay para mi negocio.');
  return <main className={`payLanding ${sora.variable} ${inter.variable}`}>
    <header className="payLandingNav">
      <Link className="payLandingBrand" href="/">NIVAL <small>PAY</small></Link>
      <nav aria-label="Navegación"><Link href="#demo">Cómo funciona</Link><Link href="/auth">Iniciar sesión</Link><Link className="navBuy" href="/registro">Crear mi perfil</Link></nav>
    </header>

    <section className="payLandingHero">
      <div className="heroCopy">
        <div className="heroPill"><span/> NFC + QR</div>
        <h1>Cobra sin<br/><em>dictar nada.</em></h1>
        <p>Tu cliente acerca el celular, ve tus datos bancarios y transfiere.</p>
        <div className="payLandingActions">
          <a className="payLandingPrimary" href={contact ?? '/support'}>Solicitar mi Nival Pay</a>
          <Link className="payLandingSecondary" href="/demo">Ver cómo se usa →</Link>
        </div>
        <div className="heroMeta"><strong>Tarjeta sin costo</strong><i/> <span>{money(managedUsagePricing.rateCents)} MXN por apertura registrada</span></div>
      </div>
      <div className="heroVisual" aria-label="Vista previa de Nival Pay">
        <div className="tapHalo halo3"/><div className="tapHalo halo2"/><div className="tapHalo halo1"/>
        <div className="nfcCard"><div className="cardTop"><b>NIVAL</b><span>PAY</span></div><div className="nfcMark">)))</div><small>ACERCA TU CELULAR</small></div>
        <div className="phoneMock"><div className="phoneIsland"/><PaymentPageView embedded preview profile={{business_name:"Nival Pay Demo",brand_color:"#18784c",account_holder:"Rodrigo Archundia",bank_name:"Banco de ejemplo",clabe:"000000000000000000",concept:"Pago de consumo",holder_visible:true,bank_visible:true,clabe_visible:true,concept_visible:true,payment_url_visible:false,custom_sections:[]}}/></div>
        <div className="floatingTag tagOne">✓ CLABE copiada</div>
        <div className="floatingTag tagTwo">Sin app</div>
      </div>
    </section>

    <section className="visualFlow" id="demo">
      <div className="sectionHead"><span>ASÍ SE USA EN LA VIDA REAL</span><h2>De la mesa a la transferencia en 3 pasos.</h2></div>
      <div className="flowRail">
        <article><div className="flowIcon">⌁</div><b>PASO 1</b><h3>Acerca Nival Pay</h3><p>Al momento de cobrar, tu cliente acerca su celular a la tarjeta NFC. No necesita descargar ninguna app.</p></article>
        <div className="flowArrow">→</div>
        <article><div className="flowIcon">▣</div><b>PASO 2</b><h3>Se abren tus datos</h3><p>El celular abre tu página Nival Pay con banco, beneficiario, CLABE y concepto de pago.</p></article>
        <div className="flowArrow">→</div>
        <article><div className="flowIcon">✓</div><b>PASO 3</b><h3>Copia y transfiere</h3><p>Tu cliente toca la CLABE para copiarla, abre su banca y completa la transferencia sin que tengas que dictar números.</p></article>
      </div>
    </section>

    <section className="productStage">
      <div className="productCopy"><span>EJEMPLO REAL</span><h2>Imagina que acabas de pedir la cuenta.</h2><p>El negocio te acerca su Nival Pay. Tú la tocas con el celular, se abre esta pantalla, copias la CLABE y haces la transferencia. Eso es todo.</p><Link href="/demo">Probar la pantalla del cliente →</Link></div>
      <div className="productDemo"><PaymentPageView embedded preview profile={{business_name:"Nival Pay Demo",brand_color:"#18784c",account_holder:"Rodrigo Archundia",bank_name:"Banco de ejemplo",clabe:"000000000000000000",concept:"Pago de consumo",holder_visible:true,bank_visible:true,clabe_visible:true,concept_visible:true,payment_url_visible:false,custom_sections:[]}}/></div>
    </section>

    <section className="benefitStrip" aria-label="Beneficios"><div><strong>01</strong><span>Sin app</span></div><div><strong>02</strong><span>Editable</span></div><div><strong>03</strong><span>NFC + QR</span></div><div><strong>04</strong><span>Pago por uso</span></div></section>

    <section className="finalCta"><div className="miniCard">NIVAL <span>PAY</span><i>)))</i></div><h2>Un toque.<br/>Y listo.</h2><p>Tarjeta sin costo · cortes cada 30 días · pago directo con Nival.</p><a className="payLandingPrimary" href={contact ?? '/support'}>Solicitar la mía</a><p>Las recargas de una misma sesión no suman otra apertura. Las aperturas desde NFC, QR o enlace no confirman una transferencia. Al vencer el periodo, el servicio se suspende hasta registrar tu pago.</p></section>

    <footer className="payLandingFooter"><Link className="payLandingBrand" href="/">NIVAL <small>PAY</small></Link><nav><Link href="/registro">Crear mi perfil</Link><Link href="/negocio">Entrar con mi código</Link><Link href="/support">Contacto</Link><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link></nav></footer>
  </main>;
}
