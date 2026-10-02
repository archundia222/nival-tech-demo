import Link from 'next/link';
import localFont from 'next/font/local';
import { PayDemo } from './pay-demo';
import { money, NIVAL_PAY_PRICE_CENTS } from '@/lib/orders';
import './pay-landing.css';

const sora=localFont({src:'../fonts/sora-latin-700.woff2',variable:'--pay-title'});
const inter=localFont({src:'../fonts/inter-latin-400.woff2',variable:'--pay-body'});

export default function Home(){
  return <main className={`payLanding ${sora.variable} ${inter.variable}`}>
    <header className="payLandingNav">
      <Link className="payLandingBrand" href="/">NIVAL <small>PAY</small></Link>
      <nav aria-label="Navegación"><Link href="#demo">Ver cómo funciona</Link><Link className="navBuy" href="/checkout">Comprar · {money(NIVAL_PAY_PRICE_CENTS)}</Link></nav>
    </header>

    <section className="payLandingHero">
      <div className="heroCopy">
        <div className="heroPill"><span/> NFC + QR</div>
        <h1>Cobra sin<br/><em>dictar nada.</em></h1>
        <p>Acercan. Copian. Transfieren.</p>
        <div className="payLandingActions">
          <Link className="payLandingPrimary" href="/checkout">Quiero mi Nival Pay <b>→</b></Link>
          <Link className="payLandingSecondary" href="#demo">Verla en acción ↓</Link>
        </div>
        <div className="heroMeta"><strong>{money(NIVAL_PAY_PRICE_CENTS)} MXN</strong><span>pago único</span><i/> <span>tarjeta NFC incluida</span></div>
      </div>
      <div className="heroVisual" aria-label="Vista previa de Nival Pay">
        <div className="tapHalo halo3"/><div className="tapHalo halo2"/><div className="tapHalo halo1"/>
        <div className="nfcCard"><div className="cardTop"><b>NIVAL</b><span>PAY</span></div><div className="nfcMark">)))</div><small>ACERCA TU CELULAR</small></div>
        <div className="phoneMock"><div className="phoneIsland"/><PayDemo/></div>
        <div className="floatingTag tagOne">✓ CLABE copiada</div>
        <div className="floatingTag tagTwo">Sin app</div>
      </div>
    </section>

    <section className="visualFlow" id="demo">
      <div className="sectionHead"><span>3 segundos para entenderlo</span><h2>Así se siente.</h2></div>
      <div className="flowRail">
        <article><div className="flowIcon">⌁</div><b>01</b><h3>Acerca</h3><p>El celular toca la tarjeta.</p></article>
        <div className="flowArrow">→</div>
        <article><div className="flowIcon">▣</div><b>02</b><h3>Abre</h3><p>Tus datos aparecen al instante.</p></article>
        <div className="flowArrow">→</div>
        <article><div className="flowIcon">✓</div><b>03</b><h3>Copia</h3><p>CLABE lista para transferir.</p></article>
      </div>
    </section>

    <section className="productStage">
      <div className="productCopy"><span>Tu Nival Pay</span><h2>Tu banco.<br/>Tu nombre.<br/>Tu concepto.</h2><p>Cámbialos cuando quieras. La tarjeta y el QR siguen siendo los mismos.</p><Link href="/demo">Explorar demo →</Link></div>
      <div className="productDemo"><PayDemo/></div>
    </section>

    <section className="benefitStrip" aria-label="Beneficios"><div><strong>01</strong><span>Sin app</span></div><div><strong>02</strong><span>Editable</span></div><div><strong>03</strong><span>NFC + QR</span></div><div><strong>04</strong><span>Pago único</span></div></section>

    <section className="finalCta"><div className="miniCard">NIVAL <span>PAY</span><i>)))</i></div><h2>Un toque.<br/>Y listo.</h2><p>{money(NIVAL_PAY_PRICE_CENTS)} MXN · tarjeta incluida</p><Link className="payLandingPrimary" href="/checkout">Obtener la mía <b>→</b></Link></section>

    <footer className="payLandingFooter"><Link className="payLandingBrand" href="/">NIVAL <small>PAY</small></Link><nav><Link href="/support">Contacto</Link><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link></nav></footer>
  </main>;
}