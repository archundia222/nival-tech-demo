"use client";
import { useState } from "react";
import styles from "./payment-page.module.css";

const CopyIcon=()=> <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>;
async function write(value:string){
  try { await navigator.clipboard.writeText(value); }
  catch {
    const field=document.createElement("textarea");
    field.value=value; field.setAttribute("readonly","");
    field.style.position="fixed"; field.style.opacity="0";
    document.body.appendChild(field); field.select();
    document.execCommand("copy"); field.remove();
  }
}

export function CopyField({label,value,variant="detail",headingId="payment-title",trackingToken}:{label:string;value:string;variant?:"name"|"bank"|"clabe"|"detail";headingId?:string|null;trackingToken?:string}){
 const [copied,setCopied]=useState(false);
 async function copy(){try{await write(value);if(variant==="clabe"&&trackingToken){void fetch(`/api/public/pay/${trackingToken}/copy`,{method:"POST",keepalive:true}).catch(()=>undefined)}setCopied(true);setTimeout(()=>setCopied(false),1600)}catch{}}
 if(variant==="name") return <div className={styles.nameLine}><h1 id={headingId ?? undefined}>{value}</h1><button className={styles.nameCopy} type="button" onClick={copy} aria-label="Copiar nombre completo"><CopyIcon/></button>{copied&&<span className={styles.inlineCopied}>Copiado</span>}</div>;
 return <button className={styles.detailRow} type="button" onClick={copy} aria-label={`Copiar ${label}`}>
   <span><span className={styles.label}>{label}</span><span className={variant==="clabe"?styles.clabeValue:variant==="bank"?styles.bankValue:styles.value}>{value}</span></span>
   {variant==="bank"?<span className={styles.bankBadge}>{value}</span>:<span className={styles.copyIcon}><CopyIcon/></span>}
   <span className={styles.srOnly}>{copied?"Copiado":"Toca para copiar"}</span>
 </button>;
}
export function CopyPrimaryButton({value}:{value:string}){
 const [copied,setCopied]=useState(false);
 async function copy(){try{await write(value);setCopied(true);setTimeout(()=>setCopied(false),1600)}catch{}}
 return <button className={styles.primaryButton} type="button" onClick={copy}><CopyIcon/>{copied?"CLABE copiada":"Copiar CLABE"}</button>;
}