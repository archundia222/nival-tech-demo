"use client";

import Link from "next/link";
import { useState } from "react";
import { PaymentPageView } from "../pay/[token]/payment-page-view";

export default function Demo(){
  const [holder,setHolder]=useState("Rodrigo Archundia");
  const [bank,setBank]=useState("Banco de ejemplo");
  const [clabe,setClabe]=useState("000000000000000000");
  const [concept,setConcept]=useState("Pago de consumo");
  const [paymentUrl,setPaymentUrl]=useState("");

  return <main style={{minHeight:"100vh",background:"#f6faf6",color:"#102a21",padding:"24px"}}>
    <div style={{maxWidth:1080,margin:"0 auto"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:24}}>
        <Link href="/" style={{color:"#18784c",fontWeight:900,textDecoration:"none"}}>← Nival Pay</Link>
        <Link href="/negocio" style={{background:"#18784c",color:"#fff",padding:"12px 18px",borderRadius:999,textDecoration:"none",fontWeight:900}}>Entrar con mi código</Link>
      </header>
      <section style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",gap:18}}>
        <div>
          <p style={{color:"#18784c",fontWeight:900,fontSize:12,letterSpacing:".12em"}}>DEMO INTERACTIVA · NO REQUIERE PAGO</p>
          <h1 style={{fontSize:"clamp(36px,6vw,64px)",lineHeight:.95,margin:"8px 0 12px"}}>Así se ve realmente Nival Pay.</h1>
          <p style={{maxWidth:680,color:"#4b6357",lineHeight:1.6}}>Edita los datos directamente en la vista. Es la misma interfaz que recibe tu cliente. Los datos son de demostración y no se guardan.</p>
        </div>
        <div style={{maxWidth:560,width:"100%",margin:"0 auto"}}>
          <PaymentPageView embedded profile={{business_name:"Nival Pay Demo",brand_color:"#18784c",account_holder:holder,bank_name:bank,clabe,concept,payment_url:paymentUrl,holder_visible:true,bank_visible:true,clabe_visible:true,concept_visible:true,payment_url_visible:true,custom_sections:[]}} editor={{holder,bank,clabe,concept,paymentUrl,demo:true,onHolder:setHolder,onBank:setBank,onClabe:setClabe,onConcept:setConcept,onPaymentUrl:setPaymentUrl}}/>
        </div>
      </section>
    </div>
  </main>;
}
