'use client';
import { useEffect, useState } from 'react';
const examples = [
  { action: 'Pagar', title: 'Paga a Café Nival', detail: 'CLABE de ejemplo: 000000000000000000', button: 'Copiar datos' },
  { action: 'Reseña', title: '¿Cómo fue tu visita?', detail: 'Abre el enlace de Google del negocio', button: 'Dejar reseña' },
  { action: 'WiFi', title: 'WiFi de Café Nival', detail: 'Red: CafeNival · Clave de ejemplo: cafe1234', button: 'Copiar contraseña' },
];
export function LandingProductVisuals() {
  const [index,setIndex]=useState(0);
  useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=window.setInterval(()=>setIndex(i=>(i+1)%examples.length),3000);return()=>window.clearInterval(timer)},[]);
  const sample=examples[index];
  return <div className="nv2HeroDevice" aria-label="Ejemplo de una tarjeta Nival junto a un teléfono">
    <div className="nv2HeroPhone"><div className="nv2PhoneTop">9:41 <span>●●●</span></div><div className="nv2HeroScreen"><div className="nv2HeroMark">N</div><span>{sample.action.toUpperCase()} · EJEMPLO</span><strong>{sample.title}</strong><p>{sample.detail}</p><div className="nv2HeroPhoneButton">{sample.button}</div></div></div>
    <div className="nv2HeroCard"><b>N</b><div><strong>Nival Card</strong><span>Acerca · abre · comparte</span></div><i aria-hidden="true">◉</i></div>
    <div className="nv2HeroWaves" aria-hidden="true"><span/><span/><span/></div>
  </div>;
}
