"use client";

export function LandingProductVisuals() {
  return <div className="heroNfcVisual" aria-label="Tarjeta Nival acercándose a un teléfono">
    <div className="heroNfcGlow" />
    <div className="heroPhoneMock">
      <div className="heroPhoneTop"><span>9:41</span><i /></div>
      <div className="heroPhoneScreen">
        <div className="heroPhoneLogo">CN</div>
        <span>Paga a</span>
        <strong>Café Nival</strong>
        <small>Transferencia bancaria</small>
        <div className="heroPhoneAction">Abrir Tocario Pay</div>
      </div>
    </div>
    <div className="heroNfcCard">
      <span className="heroNfcBrand">N</span>
      <div><strong>Tocario Card</strong><small>NFC</small></div>
      <b>)))</b>
    </div>
    <div className="heroNfcSignal"><i/><i/><i/></div>
    <div className="heroVisualCaption"><b>Acerca el celular</b><span>y abre Tocario Pay al instante.</span></div>
  </div>;
}
