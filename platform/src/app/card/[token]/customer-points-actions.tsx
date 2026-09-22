"use client";
import { useState } from "react";
import { RotatingPointsQr } from "./rotating-points-qr";
type Reward={id:string;description:string;earned_at:string;redeemed_at:string|null};
export function CustomerPointsActions({accountToken,rewards,pointsRemaining}:{accountToken:string;rewards:Reward[];pointsRemaining:number}){
 const [panel,setPanel]=useState<"points"|"rewards"|null>(null);
 const available=rewards.filter(r=>!r.redeemed_at), redeemed=rewards.filter(r=>r.redeemed_at);
 const date=(v:string)=>new Intl.DateTimeFormat("es-MX",{dateStyle:"medium",timeZone:"America/Mexico_City"}).format(new Date(v));
 return <section className="pointsCustomerActions">
  <div className="pointsCustomerQuickActions">
   <button type="button" className={panel==="points"?"active":""} onClick={()=>setPanel(panel==="points"?null:"points")}><span>＋</span><div><strong>Sumar puntos</strong><small>{panel==="points"?"Ocultar código":"Mostrar QR y código"}</small></div><b>{panel==="points"?"×":"→"}</b></button>
   <button type="button" className={(available.length?"hasReward ":"")+(panel==="rewards"?"active":"")} onClick={()=>setPanel(panel==="rewards"?null:"rewards")}><span>★</span><div><strong>Mis recompensas</strong><small>{available.length?`${available.length} lista${available.length===1?"":"s"} para canjear`:"Ver recompensas e historial"}</small></div><b>{panel==="rewards"?"×":"→"}</b></button>
  </div>
  {panel==="points"&&<div className="pointsActionPanel"><div className="pointsActionPanelIntro"><span>SUMAR PUNTOS</span><h2>Muestra este código en caja</h2><p>Este código sirve únicamente para registrar tu visita y sumar puntos.</p></div><RotatingPointsQr accountToken={accountToken} purpose="points"/></div>}
  {panel==="rewards"&&<div className="pointsActionPanel rewards"><div className="pointsActionPanelIntro"><span>MIS RECOMPENSAS</span><h2>{available.length?"Tienes un premio listo":"Aún no tienes premios disponibles"}</h2><p>{available.length?"Este código sirve únicamente para canjear. Muéstralo al personal.":`Te faltan ${pointsRemaining} puntos para tu próxima recompensa.`}</p></div>
   {available.length>0&&<div className="pointsRewardList">{available.map(r=><article key={r.id} className="pointsRewardAvailable"><div className="pointsRewardAvailableTop"><span className="pointsRewardGift">★</span><strong>{r.description}</strong></div><span>Disponible · obtenida {date(r.earned_at)}</span></article>)}</div>}
   {available.length>0&&<RotatingPointsQr accountToken={accountToken} purpose="redeem"/>}
   <details className="pointsRewardHistory"><summary>Historial de recompensas <b>{redeemed.length}</b></summary><div>{redeemed.length?redeemed.map(r=><article key={r.id}><strong>{r.description}</strong><span>Canjeada · {date(r.redeemed_at!)}</span></article>):<p>Aún no has canjeado recompensas.</p>}</div></details>
  </div>}
 </section>;
}