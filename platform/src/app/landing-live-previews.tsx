"use client";

import { useEffect, useState } from "react";

function useAutoSaveSignal(values: unknown[]) {
  const [status, setStatus] = useState<"saved"|"saving">("saved");
  useEffect(() => {
    const start = window.setTimeout(() => setStatus("saving"), 0);
    const timer = window.setTimeout(() => setStatus("saved"), 700);
    return () => { window.clearTimeout(start); window.clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, values);
  return status;
}

function VideoPlaceholder({label}:{label:string}) {
  return <div className="landingVideoPlaceholder">
    <div className="landingVideoIcon">▶</div>
    <div><b>Video: cómo funciona {label}</b><span>Aquí irá el video de YouTube cuando esté listo.</span></div>
  </div>;
}

export function LandingLivePreviews() {
  const [holder,setHolder]=useState("Café Nival");
  const [bank,setBank]=useState("BBVA");
  const [clabe,setClabe]=useState("000000000000000000");
  const [concept,setConcept]=useState("Pago de consumo");
  const paySave=useAutoSaveSignal([holder,bank,clabe,concept]);

  const [points,setPoints]=useState(7);
  const [reward,setReward]=useState("Café gratis");
  const [redeemed,setRedeemed]=useState(false);
  const pointsReady=points>=10&&!redeemed;
  const shownPoints=redeemed?0:Math.min(points,10);

  const addPoint=()=>{ if(redeemed) setRedeemed(false); setPoints(v=>Math.min(10,v+1)); };
  const redeem=()=>{ setRedeemed(true); setPoints(0); };

  return <section className="landingProductShowcase" id="productos">
    <div className="landingSectionHeading compact">
      <p className="landingEyebrow landingEyebrowLarge">PRODUCTOS TOCARIO</p>
      <h2>Ve cómo funciona antes de contratarlo.</h2>
      <p>Cada producto enseña la experiencia real que verá tu cliente. Prueba los controles y decide qué necesitas.</p>
    </div>

    <article className="landingProductCard landingProductPay">
      <header className="landingProductCardHeader">
        <div><span>01 · TOCARIO PAY</span><h3>Haz más fácil que te paguen.</h3><p>Deja de repetir datos. Tu cliente abre, copia y paga.</p></div>
        <div className="productNfcMini"><div className="miniCardNival">N <small>NFC</small></div><div className="miniPhoneNival">▯</div><i>)))</i></div>
      </header>

      <div className="landingProductDemoGrid">
        <div className="landingPayInlineDemo">
          <div className="landingDemoTopline"><span>DEMO EDITABLE</span><b className={paySave}>{paySave==="saving"?"Guardando cambios…":"Cambios guardados ✓"}</b></div>
          <div className="landingPayCard">
            <div className="landingPayBrand"><span>NP</span><div><small>Tocario Pay</small><strong>{holder||"Tu negocio"}</strong></div></div>
            <label><span>Beneficiario</span><input value={holder} onChange={e=>setHolder(e.target.value)} /></label>
            <label><span>Banco</span><input value={bank} onChange={e=>setBank(e.target.value)} /></label>
            <label><span>CLABE</span><input inputMode="numeric" value={clabe} onChange={e=>setClabe(e.target.value.replace(/\D/g,"").slice(0,18))} /></label>
            <label><span>Concepto</span><input value={concept} onChange={e=>setConcept(e.target.value)} /></label>
            <small className="landingInlineHint">Escribe directamente aquí. Los cambios se guardan automáticamente.</small>
          </div>
        </div>
        <VideoPlaceholder label="Tocario Pay"/>
      </div>
    </article>

    <article className="landingProductCard landingProductPoints">
      <header className="landingProductCardHeader">
        <div><span>02 · TOCARIO PUNTOS</span><h3>Haz más fácil que regresen.</h3><p>Tu cliente ve su progreso y entiende cuánto le falta para su premio.</p></div>
        <div className="productPointsMini">★ <small>7 / 10</small></div>
      </header>
      <div className="landingProductDemoGrid">
        <div className="landingPointsWhiteDemo">
          <div className="landingPointsIdentity"><span>C</span><div><small>CLIENTES FRECUENTES</small><strong>Café Nival</strong></div></div>
          <div className="landingPointsHello"><span>Hola, Ana</span><small>Tu saldo actual</small></div>
          <div className="landingPointsBalance"><strong>{shownPoints}</strong><span>puntos</span></div>
          <div className="landingPointsProgress"><div><span>Progreso</span><b>{shownPoints} / 10</b></div><i><span style={{width:`${shownPoints*10}%`}}/></i></div>
          <div className={"landingPointsReward "+(pointsReady?"ready":"")+(redeemed?" redeemed":"")}>
            <small>{redeemed?"PREMIO CANJEADO":pointsReady?"PREMIO DISPONIBLE":"PRÓXIMA RECOMPENSA"}</small>
            <strong>{reward}</strong>
            {redeemed?<b>✓ Canjeado correctamente</b>:pointsReady?<button type="button" onClick={redeem}>Canjear premio</button>:<span>Te faltan {Math.max(0,10-shownPoints)} puntos</span>}
          </div>
          <div className="landingPointsControls">
            <button type="button" onClick={addPoint} disabled={pointsReady}>+ Agregar punto</button>
            <input value={reward} onChange={e=>setReward(e.target.value)} aria-label="Recompensa de ejemplo"/>
          </div>
        </div>
        <VideoPlaceholder label="Tocario Puntos"/>
      </div>
    </article>

    <article className="landingProductCard landingProductReviews">
      <header className="landingProductCardHeader">
        <div><span>03 · TOCARIO RESEÑAS</span><h3>Pide la reseña en el momento correcto.</h3><p>Un toque o un escaneo lleva al cliente directo a Google.</p></div>
        <div className="productStarsMini">★★★★★</div>
      </header>
      <div className="landingProductDemoGrid">
        <div className="landingReviewAnimated">
          <span className="landingReviewStars">★★★★★</span>
          <h4>¿Cómo fue tu experiencia?</h4>
          <p>Tu opinión ayuda a este negocio.</p>
          <button type="button">Dejar reseña en Google</button>
          <div className="reviewPulseDot one">♥</div><div className="reviewPulseDot two">★</div>
        </div>
        <VideoPlaceholder label="Tocario Reseñas"/>
      </div>
    </article>

    <article className="landingProductCard landingProductWifi">
      <header className="landingProductCardHeader">
        <div><span>04 · TOCARIO WIFI</span><h3>Haz más fácil que se conecten.</h3><p>El cliente acerca su celular o escanea el QR y abre el acceso a tu WiFi.</p></div>
        <div className="productWifiMini">⌁</div>
      </header>
      <div className="landingProductDemoGrid">
        <div className="landingWifiDemo">
          <span className="wifiIcon">⌁</span>
          <small>TOCARIO WIFI</small>
          <h4>Café Nival</h4>
          <p>WiFi para clientes</p>
          <button type="button">Conectarme</button>
          <em>Demo visual · configuración disponible próximamente</em>
        </div>
        <VideoPlaceholder label="Tocario WiFi"/>
      </div>
    </article>
  </section>;
}
