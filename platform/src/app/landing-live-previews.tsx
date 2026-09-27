"use client";

import { useEffect, useMemo, useState } from "react";
import { PaymentPageView } from "./pay/[token]/payment-page-view";

function useAutoSaveSignal(values: unknown[]) {
  const [status, setStatus] = useState<"saved" | "saving">("saved");
  useEffect(() => {
    setStatus("saving");
    const timer = window.setTimeout(() => setStatus("saved"), 650);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, values);
  return status;
}

export function LandingLivePreviews() {
  const [holder, setHolder] = useState("Café Nival");
  const [bank, setBank] = useState("BBVA");
  const [points, setPoints] = useState(7);
  const [reward, setReward] = useState("Café gratis");
  const [redeemed, setRedeemed] = useState(false);
  const saveStatus = useAutoSaveSignal([holder, bank]);
  const clabe = "000000000000000000";

  const payProfile = useMemo(() => ({
    business_name: holder || "Tu negocio",
    business_slug: null,
    points_enabled: false,
    logo_url: null,
    brand_color: "#cdae67",
    account_holder: holder || "Tu negocio",
    bank_name: bank || "Tu banco",
    clabe,
    concept: "Pago de consumo",
    payment_url: null,
    holder_visible: true,
    bank_visible: true,
    clabe_visible: true,
    concept_visible: true,
    payment_url_visible: false,
    custom_sections: [],
  }), [holder, bank]);

  const pointsReady = points >= 10 && !redeemed;
  const displayedPoints = redeemed ? 0 : Math.min(points, 10);

  function addPoint() {
    if (redeemed) setRedeemed(false);
    setPoints((current) => Math.min(10, current + 1));
  }

  function redeem() {
    setRedeemed(true);
    setPoints(0);
  }

  return <div className="livePreviewStack" id="productos">
    <section className="liveProductBlock liveProductReal">
      <div className="liveProductCopy">
        <span>NIVAL PAY</span>
        <h2>Deja de dictar tu CLABE.</h2>
        <p>Así lo configura el negocio y así lo usa el cliente. Escribe para editar; toca cualquier dato dentro de Nival Pay para copiarlo.</p>
        <div className="liveControls">
          <label>Titular<input value={holder} onChange={(e)=>setHolder(e.target.value)} maxLength={50}/></label>
          <label>Banco<input value={bank} onChange={(e)=>setBank(e.target.value)} maxLength={30}/></label>
        </div>
        <div className={"landingSaveStatus " + saveStatus}>
          <i />
          {saveStatus === "saving" ? "Guardando cambios automáticamente…" : "Cambios guardados"}
        </div>
      </div>
      <div className="realProductPreview pay">
        <div className="previewInstruction"><b>PRUÉBALO</b><span>Edita arriba y toca un dato para copiarlo.</span></div>
        <PaymentPageView profile={payProfile} embedded />
      </div>
    </section>

    <section className="liveProductBlock liveProductReal reverse">
      <div className="liveProductCopy">
        <span>NIVAL PUNTOS</span>
        <h2>Haz visible la razón para regresar.</h2>
        <p>Esta es la tarjeta que verá tu cliente. Prueba el flujo: suma puntos, llega a la meta y canjea la recompensa.</p>
        <label className="pointsDemoReward">Recompensa<input value={reward} onChange={(e)=>setReward(e.target.value)} maxLength={60}/></label>
        <div className="pointsDemoActions">
          <button type="button" onClick={addPoint} disabled={pointsReady}>+ Agregar punto</button>
          {pointsReady && <button type="button" className="redeem" onClick={redeem}>Canjear premio</button>}
        </div>
        {redeemed && <div className="redeemedDemoNotice"><span>✓</span><div><b>Premio canjeado</b><small>{reward}</small></div></div>}
      </div>

      <div className="realProductPreview points nivalDashboard">
        <div className="previewInstruction"><b>ASÍ LO VE TU CLIENTE</b><span>Su progreso se actualiza conforme registras visitas.</span></div>
        <section className="pointsCustomerCard">
          <div className="pointsCustomerCardTop">
            <div className="pointsBusinessIdentity"><span>C</span><div><p className="pointsCustomerProgram">Clientes frecuentes</p><h1>Café Nival</h1></div></div>
            <span className="pointsCustomerMemberBadge">MIEMBRO</span>
          </div>
          <div className="pointsCustomerGreeting"><span>Hola, Ana</span><small>Tu saldo actual</small></div>
          <div className="pointsBalance"><strong>{displayedPoints}</strong><span>puntos</span></div>
          <div className="pointsProgressBlock">
            <div className="pointsProgressMeta"><span>Progreso</span><b>{displayedPoints} / 10</b></div>
            <div className="pointsProgress"><i style={{ width: `${displayedPoints * 10}%` }} /></div>
          </div>
          <div className="pointsReward">
            <div><span>{pointsReady ? "PREMIO DISPONIBLE" : "PRÓXIMA RECOMPENSA"}</span><strong>{reward || "Café gratis"}</strong></div>
            {pointsReady ? <b>Lista para usar</b> : <b>Te faltan {Math.max(0,10-displayedPoints)} puntos</b>}
          </div>
          {pointsReady && <div className="pointsAvailableNotice"><span>✓</span><div><strong>1 recompensa disponible</strong><small>Ya puede canjearla en caja.</small></div></div>}
        </section>
      </div>
    </section>

    <section className="liveProductBlock liveProductReal">
      <div className="liveProductCopy">
        <span>NIVAL RESEÑAS</span>
        <h2>Pide la reseña cuando la experiencia todavía está fresca.</h2>
        <p>Conectas tu enlace de Google una vez. El cliente escanea el QR o acerca su celular y llega directo a dejar su opinión.</p>
      </div>
      <div className="realProductPreview reviews">
        <div className="previewInstruction"><b>ASÍ LO VE TU CLIENTE</b><span>Un paso directo hacia tu enlace de reseñas.</span></div>
        <div className="miniReviewExperience">
          <span>★★★★★</span>
          <h3>¿Cómo fue tu experiencia?</h3>
          <p>Tu opinión ayuda a este negocio.</p>
          <button type="button">Dejar reseña</button>
        </div>
      </div>
    </section>
  </div>;
}
