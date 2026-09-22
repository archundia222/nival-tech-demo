"use client";
import { useState } from "react";
import { RotatingPointsQr } from "./rotating-points-qr";
type Reward={id:string;description:string;earned_at:string;redeemed_at:string|null};
export function CustomerPointsActions({accountToken,rewards,pointsRemaining}:{accountToken:string;rewards:Reward[];pointsRemaining:number}){
 const [panel,setPanel]=useState<"points"|"rewards"|null>(null);
 const [selectedRewardId,setSelectedRewardId]=useState<string|null>(null);
 const available=rewards.filter(r=>!r.redeemed_at), redeemed=rewards.filter(r=>r.redeemed_at);
 const date=(v:string)=>new Intl.DateTimeFormat("es-MX",{dateStyle:"medium",timeZone:"America/Mexico_City"}).format(new Date(v));
 const toggle=(next:"points"|"rewards")=>{setPanel(panel===next?null:next);setSelectedRewardId(null)};
 return <section className="pointsCustomerActions">
  <div className="pointsCustomerQuickActions">
   <button type="button" className={panel==="points"?"active":""} onClick={()=>toggle("points")}><span>＋</span><div><strong>Sumar puntos</strong><small>{panel==="points"?"Ocultar":"Mostrar código de visita"}</small></div><b>{panel==="points"?"×":"→"}</b></button>
   <button type="button" className={(available.length?"hasReward ":"")+(panel==="rewards"?"active":"")} onClick={()=>toggle("rewards")}><span>★</span><div><strong>Mis recompensas</strong><small>{available.length?`${available.length} disponible${available.length===1?"":"s"}`:"Premios e historial"}</small></div><b>{panel==="rewards"?"×":"→"}</b></button>
  </div>
  {panel==="points"&&<div className="pointsActionPanel"><div className="pointsActionPanelIntro"><span>SUMAR PUNTOS</span><h2>Muestra este código en caja</h2><p>Sirve únicamente para registrar tu visita y sumar puntos.</p></div><RotatingPointsQr accountToken={accountToken} purpose="points"/></div>}
  {panel==="rewards"&&<div className="pointsActionPanel rewards">
   <div className="pointsRewardsHeader"><div><span>RECOMPENSAS DISPONIBLES</span><h2>{available.length?available.length===1?"1 recompensa disponible":`${available.length} recompensas disponibles`:"No tienes recompensas disponibles"}</h2><p>{available.length?"Tus premios están guardados hasta que decidas usarlos.":"Aquí aparecerán los premios que vayas desbloqueando."}</p></div><div className={"pointsRewardsCount "+(available.length?"ready":"")}><strong>{available.length}</strong><span>disponibles</span></div></div>
   {available.length>0?<div className="pointsRewardWallet">{available.map((r,i)=><article key={r.id} className="pointsRewardTicket"><div className="pointsRewardTicketIcon">★</div><div><small>RECOMPENSA {i+1}</small><strong>{r.description}</strong><span>Desbloqueada el {date(r.earned_at)}</span></div><button type="button" onClick={()=>setSelectedRewardId(r.id)}>{selectedRewardId===r.id?"SELECCIONADA":"CANJEAR"}</button></article>)}</div>:<div className="pointsRewardsEmpty"><span>☆</span><strong>Sigue sumando visitas</strong><p>Te faltan {pointsRemaining} puntos para desbloquear tu próxima recompensa.</p></div>}
   {available.length>0&&!selectedRewardId&&<p className="pointsRewardChooseHint">Elige la recompensa que quieres utilizar para generar su código de canje.</p>}
   {selectedRewardId&&<div className="pointsRedeemPanel"><div className="pointsRedeemPanelTop"><div><span>CÓDIGO DE CANJE</span><strong>{available.find(r=>r.id===selectedRewardId)?.description}</strong><small>Muéstralo solamente cuando vayas a recibir esta recompensa.</small></div><button type="button" onClick={()=>setSelectedRewardId(null)} aria-label="Cerrar código de canje">×</button></div><RotatingPointsQr accountToken={accountToken} purpose="redeem" rewardId={selectedRewardId}/></div>}
   <details className="pointsRewardHistory"><summary><span>Recompensas canjeadas</span><b>{redeemed.length}</b></summary><div>{redeemed.length?redeemed.map(r=><article key={r.id}><span className="pointsHistoryCheck">✓</span><div><strong>{r.description}</strong><small>Recompensa canjeada · {date(r.redeemed_at!)}</small></div></article>):<p>Aún no has utilizado ninguna recompensa.</p>}</div></details>
  </div>}
 </section>;
}