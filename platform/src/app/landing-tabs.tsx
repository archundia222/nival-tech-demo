'use client';
import { useEffect, useState } from 'react';
const previews = {
  Pay: { icon: '↗', benefit: 'Cobra sin dictar datos', title: 'Paga a Café Nival', body: 'CLABE de ejemplo: 000000000000000000', action: 'Copiar CLABE' },
  Reseñas: { icon: '☆', benefit: 'Comparte tu enlace de Google', title: '¿Cómo fue tu visita?', body: 'Abre el enlace de reseñas de Google', action: 'Dejar reseña' },
  WiFi: { icon: '⌁', benefit: 'Comparte la red y la contraseña', title: 'WiFi de Café Nival', body: 'Red: CafeNival · Clave de ejemplo: cafe1234', action: 'Copiar contraseña' },
  Puntos: { icon: '◉', benefit: 'Que tus clientes vuelvan', title: 'Tus puntos en Café Nival', body: '7 de 10 puntos · faltan 3 para tu premio', action: 'Ver progreso' },
} as const;
type Preview = keyof typeof previews;
export function LandingTabs() {
  const [active,setActive]=useState<Preview>('Pay');
  useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const names=Object.keys(previews) as Preview[];const timer=window.setInterval(()=>setActive(current=>names[(names.indexOf(current)+1)%names.length]),4500);return()=>window.clearInterval(timer)},[]);
  const selected=previews[active];
  return <div className="nv2TabDemo"><div className="nv2Tabs" role="tablist" aria-label="Vista de productos">{(Object.keys(previews) as Preview[]).map(name=><button key={name} role="tab" id={`nv2-tab-${name}`} aria-selected={active===name} aria-controls="nv2-panel" onClick={()=>setActive(name)}><span aria-hidden="true">{previews[name].icon}</span><b>{name}</b><small>{previews[name].benefit}</small></button>)}</div><div className="nv2Phone" role="tabpanel" id="nv2-panel" aria-labelledby={`nv2-tab-${active}`}><span>NIVAL CARD · EJEMPLO</span><div className="nv2PhoneIcon">N</div><h3>{selected.title}</h3><p>{selected.body}</p><div className="nv2PhoneAction">{selected.action}</div><small>Datos ilustrativos. La demo no modifica tu cuenta.</small></div></div>;
}
