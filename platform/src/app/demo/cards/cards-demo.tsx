'use client';
import { useState } from 'react';
import { PaymentPageView } from '@/app/pay/[token]/payment-page-view';

type Section = 'Pay' | 'Reseñas' | 'WiFi';
export function CardsDemo() {
  const [section, setSection] = useState<Section>('Pay');
  const [name, setName] = useState('Tu negocio');
  const [notice, setNotice] = useState('');
  const profile = {
    business_name: name.trim() || 'Tu negocio', brand_color: '#18784c', account_holder: 'Titular de ejemplo', bank_name: 'Banco de ejemplo', clabe: '000000000000000000', concept: 'Consumo', holder_visible: true, bank_visible: true, clabe_visible: true, concept_visible: true, custom_sections: [],
  };
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setNotice('Copiado al portapapeles.'); } catch { setNotice('No se pudo copiar en este navegador.'); } }
  return <div className="nv3Interactive"><div className="nv3DemoControls"><label>Nombre de ejemplo<input value={name} onChange={e=>setName(e.target.value)} maxLength={35} /></label><div role="tablist" aria-label="Apartados de la tarjeta">{(['Pay','Reseñas','WiFi'] as Section[]).map(item=><button key={item} type="button" role="tab" aria-selected={section===item} onClick={()=>{setSection(item);setNotice('');}}>{item}</button>)}</div><p>En Pay puedes copiar los datos tal como se hace en la página pública. Reseñas dirige al enlace de Google configurado por el negocio. WiFi muestra la red y la contraseña para copiarlas.</p></div><div className="nv3DemoScreen" role="tabpanel"><span className="nv3DemoLabel">VISTA DEL CLIENTE · DATOS DE EJEMPLO</span>{section==='Pay'?<PaymentPageView profile={profile} embedded/>:section==='Reseñas'?<div className="nv3DemoSimple"><span className="nv3DemoSymbol">☆</span><h2>¿Cómo fue tu visita a {profile.business_name}?</h2><p>La tarjeta abre el enlace de Google que configure el negocio. Esta demo no publica una reseña ni está conectada a Google.</p><span className="nv3DemoDisabled">Abrir Google al configurar el enlace ↗</span></div>:<div className="nv3DemoSimple"><span className="nv3DemoSymbol">⌁</span><h2>WiFi de {profile.business_name}</h2><p>Acércate, abre la página y copia los datos para conectarte.</p><dl><dt>Red</dt><dd>TuNegocio-Invitados</dd><dt>Contraseña</dt><dd>ejemplo1234</dd></dl><button onClick={()=>copy('ejemplo1234')} type="button">Copiar contraseña</button><p role="status">{notice}</p></div>}</div></div>;
}
