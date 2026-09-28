'use client';
import { useState } from 'react';
const previews = {
  Pay: { title: 'Paga a Café Nival', body: 'Banco · CLABE · concepto', action: 'Copiar datos de pago' },
  Reseñas: { title: '¿Cómo fue tu experiencia?', body: 'Comparte tu opinión en Google', action: 'Abrir enlace de reseñas' },
  WiFi: { title: 'WiFi para clientes', body: 'Red: CafeNival · Contraseña: ••••••••', action: 'Copiar contraseña' },
  Puntos: { title: 'Tus puntos en Café Nival', body: '7 de 10 puntos · faltan 3 para tu premio', action: 'Ver progreso' },
} as const;
type Preview = keyof typeof previews;
export function LandingTabs() { const [active,setActive]=useState<Preview>('Pay'); const selected=previews[active]; return <div className="nv2TabDemo"><div className="nv2Tabs" role="tablist" aria-label="Vista de productos">{(Object.keys(previews) as Preview[]).map(name=><button key={name} role="tab" id={`nv2-tab-${name}`} aria-selected={active===name} aria-controls="nv2-panel" onClick={()=>setActive(name)}>{name}</button>)}</div><div className="nv2Phone" role="tabpanel" id="nv2-panel" aria-labelledby={`nv2-tab-${active}`}><span>NIVAL · DEMO</span><div className="nv2PhoneIcon">N</div><h3>{selected.title}</h3><p>{selected.body}</p><div className="nv2PhoneAction">{selected.action}</div><small>Vista de ejemplo. Ninguna acción aquí modifica datos.</small></div></div>; }
