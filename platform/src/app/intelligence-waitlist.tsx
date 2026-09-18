"use client";
import { useActionState } from "react";
import { joinIntelligenceWaitlist, type IntelligenceWaitlistState } from "./intelligence-waitlist-actions";
export function IntelligenceWaitlist(){
 const [state,action,pending]=useActionState<IntelligenceWaitlistState,FormData>(joinIntelligenceWaitlist,{});
 return <form action={action} className="intelligenceWaitlist">
  <label htmlFor="intelligence-contact">Déjanos tu correo o teléfono y te avisamos cuando esté disponible</label>
  <div><input id="intelligence-contact" name="contact" required minLength={5} maxLength={160} placeholder="correo@ejemplo.com o 55 1234 5678" autoComplete="email"/><button disabled={pending} type="submit">{pending?"Guardando…":"Avísame"}</button></div>
  {state.success&&<p className="waitlistSuccess">Listo. Te avisaremos cuando Nival Intelligence esté disponible.</p>}
  {state.error&&<p className="waitlistError" role="alert">{state.error}</p>}
 </form>;
}