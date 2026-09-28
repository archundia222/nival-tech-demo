'use client';
import { useEffect, useState } from 'react';
const previews = {
  Pay: { icon: '↗', benefit: 'Comparte tus datos de transferencia', title: 'Paga a tu negocio', body: 'CLABE de ejemplo: 000000000000000000', action: 'Copiar CLABE' },
  Reseñas: { icon: '☆', benefit: 'Enlace directo a tus reseñas', title: '¿Cómo fue tu visita?', body: 'Conecta el enlace de Google de tu negocio', action: 'Ir a Google' },
  WiFi: { icon: '⌁', benefit: 'Red y contraseña a la mano', title: 'WiFi para tus clientes', body: 'Red de ejemplo: TuNegocio · Clave: ejemplo1234', action: 'Copiar contraseña' },
} as const;
type Preview = keyof typeof previews;
export function LandingTabs() {
  const [active,setActive]=useState<Preview>('Pay');
  useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const names=Object.keys(previews) as Preview[];const timer=window.setInterval(()=>setActive(current=>names[(names.indexOf(current)+1)%names.length]),4500);return()=>window.clearInterval(timer)},[]);
  const selected=previews[active];
  return <div className="nv2TabDemo"><div className="nv2Tabs" role="tablist" aria-label="Vista de Cards">{(Object.keys(previews) as Preview[]).map(name=><button key={name} role="tab" id={`nv2-tab-${name}`} aria-selected={active===name} aria-controls="nv2-panel" onClick={()=>setActive(name)}><span aria-hidden="true">{previews[name].icon}</span><b>{name}</b><small>{previews[name].benefit}</small></button>)}</div><div className="nv2Phone" role="tabpanel" id="nv2-panel" aria-labelledby={`nv2-tab-${active}`}><span>TOKE · EJEMPLO</span><div className="nv2PhoneIcon">T</div><h3>{selected.title}</h3><p>{selected.body}</p><div className="nv2PhoneAction">{selected.action}</div><small>Datos ilustrativos. La demo no modifica tu cuenta.</small></div></div>;
}
