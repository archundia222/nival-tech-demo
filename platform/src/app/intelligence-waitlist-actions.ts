"use server";
import { createClient } from "@/lib/supabase/server";
import { privacyDisclosuresReady } from "@/lib/legal";
export type IntelligenceWaitlistState={success?:boolean;error?:string};
export async function joinIntelligenceWaitlist(_:IntelligenceWaitlistState,formData:FormData):Promise<IntelligenceWaitlistState>{
 if(!privacyDisclosuresReady())return{error:"El registro está temporalmente deshabilitado hasta completar el aviso de privacidad."};
 if(formData.get("privacyConsent")!=="on")return{error:"Confirma el aviso de privacidad para solicitar el aviso de lanzamiento."};
 const contact=String(formData.get("contact")??"").trim();
 if(contact.length<5||contact.length>160)return{error:"Escribe un correo o teléfono válido."};
 const supabase=await createClient();
 const {error}=await supabase.rpc("join_intelligence_waitlist",{p_contact:contact});
 if(error)return{error:"No pudimos guardar tus datos. Intenta de nuevo."};
 return{success:true};
}