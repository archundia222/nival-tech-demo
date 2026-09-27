"use client";

import { useState } from "react";

export function LandingLivePreviews() {
  const [holder, setHolder] = useState("Café Nival");
  const [bank, setBank] = useState("BBVA");
  const [reward, setReward] = useState("Café gratis");
  const [goal, setGoal] = useState(10);

  return <div className="livePreviewStack">
    <section className="liveProductBlock">
      <div className="liveProductCopy">
        <span>NIVAL PAY</span>
        <h2>Deja de dictar tu CLABE.</h2>
        <p>Tu cliente abre una página clara, copia lo que necesita y paga desde su banco. Tú puedes cambiar los datos después sin cambiar el acceso.</p>
        <div className="liveControls">
          <label>Titular<input value={holder} onChange={(e)=>setHolder(e.target.value)} maxLength={50}/></label>
          <label>Banco<input value={bank} onChange={(e)=>setBank(e.target.value)} maxLength={30}/></label>
        </div>
      </div>
      <div className="miniCustomerPhone pay">
        <div className="miniPayBrand"><span>CN</span><small>Paga a</small><h3>{holder || "Tu negocio"}</h3><p>Transferencia bancaria</p></div>
        <div className="miniSteps"><b>1 · Copia</b><b>2 · Abre tu banco</b><b>3 · Pega y verifica</b></div>
        <p className="miniAlert">Confirma el beneficiario antes de transferir.</p>
        <div className="miniData"><span>Beneficiario</span><strong>{holder}</strong></div>
        <div className="miniData"><span>Banco</span><strong>{bank}</strong></div>
        <div className="miniData"><span>CLABE</span><strong>000000000000000000</strong></div>
      </div>
    </section>

    <section className="liveProductBlock reverse">
      <div className="liveProductCopy">
        <span>NIVAL PUNTOS</span>
        <h2>Haz visible la razón para regresar.</h2>
        <p>Tu cliente ve su progreso y recompensa desde el celular. Tú registras visitas y puedes usar esa actividad real para decidir qué promociones probar.</p>
        <div className="liveControls">
          <label>Recompensa<input value={reward} onChange={(e)=>setReward(e.target.value)} maxLength={60}/></label>
          <label>Meta<input type="number" min={2} max={30} value={goal} onChange={(e)=>setGoal(Math.max(2, Math.min(30, Number(e.target.value)||10)))}/></label>
        </div>
      </div>
      <div className="miniCustomerPhone points">
        <div className="miniPointsHead"><span>CN</span><div><small>CLIENTES FRECUENTES</small><h3>Café Nival</h3></div></div>
        <p>Hola, Ana · Tu saldo actual</p>
        <div className="miniBalance"><strong>{Math.max(1,goal-3)}</strong><span>de {goal} visitas</span></div>
        <div className="miniProgress"><i style={{width:`${Math.round(((goal-3)/goal)*100)}%`}}/></div>
        <div className="miniReward"><small>PRÓXIMA RECOMPENSA</small><strong>{reward}</strong><span>Te faltan 3 visitas</span></div>
      </div>
    </section>

    <section className="liveProductBlock">
      <div className="liveProductCopy">
        <span>NIVAL RESEÑAS</span>
        <h2>Pide la reseña cuando la experiencia todavía está fresca.</h2>
        <p>Tu cliente escanea o acerca su celular y llega directo al enlace de reseñas de Google de tu negocio.</p>
      </div>
      <div className="miniReviewExperience">
        <span>★★★★★</span>
        <h3>¿Cómo fue tu experiencia?</h3>
        <p>Tu opinión ayuda a este negocio.</p>
        <button type="button">Dejar reseña</button>
      </div>
    </section>
  </div>;
}
