'use client';
import { useEffect, useState } from 'react';
import { PaymentPageView } from './pay/[token]/payment-page-view';

const previews = {
  Pay: { icon: '↗', benefit: 'Comparte tus datos de transferencia', what: 'Abre la página real de Pay con los datos bancarios de tu negocio.', steps: ['Acerca el teléfono a la tarjeta.', 'Se abre Pay.', 'Copia la CLABE y paga desde tu banco.'] },
  Reseñas: { icon: '☆', benefit: 'Enlace directo a tus reseñas de Google', what: 'Lleva al cliente directamente a las Reseñas de Google de tu negocio.', steps: ['Acerca el teléfono a la tarjeta.', 'Se abren tus Reseñas de Google.', 'El cliente toca “Escribir una reseña”.'] },
  WiFi: { icon: '⌁', benefit: 'Comparte el acceso a tu WiFi', what: 'Abre el acceso de WiFi que configuraste para tus clientes.', steps: ['Acerca el teléfono a la tarjeta.', 'Se abre el acceso de tu red.', 'El teléfono continúa con la conexión.'] },
} as const;
type Preview = keyof typeof previews;

const payProfile={business_name:'Tu negocio',brand_color:'#18784c',account_holder:'Nombre de ejemplo',bank_name:'Banco de ejemplo',clabe:'000000000000000000',concept:'Consumo',holder_visible:true,bank_visible:true,clabe_visible:true,concept_visible:true,custom_sections:[]};

function GoogleReviewsMock(){
  return <div className="nv5Google"><div className="nv5GoogleTop"><b><i>G</i>oogle</b><span>⋮</span></div><div className="nv5GooglePlace"><div className="nv5GoogleLogo">T</div><div><h3>Tu negocio</h3><p>4.8 <span>★★★★★</span> (128)</p><small>Negocio local</small></div></div><div className="nv5GoogleNav"><span>Resumen</span><b>Reseñas</b><span>Información</span></div><div className="nv5GoogleRating"><strong>4.8</strong><div><span>★★★★★</span><small>128 reseñas</small></div></div><button type="button">✎ Escribir una reseña</button><div className="nv5Review"><b>Cliente de ejemplo</b><span>★★★★★</span><p>Excelente atención y servicio.</p></div></div>;
}
function WifiRealMock(){
 return <div className="wifiGuestPage nv5Wifi"><section><span>NIVAL WIFI</span><h1>Conéctate al WiFi de Tu negocio</h1><p>Abre el enlace de la red de invitados. El teléfono puede pedirte confirmar la conexión.</p><div className="nv5WifiData"><small>RED</small><b>TuNegocio</b><small>CONTRASEÑA</small><b>ejemplo1234</b></div><div className="nvPrimaryLink">Abrir acceso WiFi →</div></section></div>;
}
export function LandingTabs() {
  const [active,setActive]=useState<Preview>('Pay');
  const [chosen,setChosen]=useState(false);
  useEffect(()=>{if(chosen || window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const names=Object.keys(previews) as Preview[];const timer=window.setInterval(()=>setActive(current=>names[(names.indexOf(current)+1)%names.length]),10000);return()=>window.clearInterval(timer)},[chosen]);
  const selected=previews[active];
  return <div className="nv2TabDemo nv5TabDemo"><div className="nv5TabLeft"><p className="nv5TabHint">Toca cada opción para explorarla <span aria-hidden="true">↘</span><small>{chosen?'La vista que elegiste se queda aquí.':'Las vistas cambian solas hasta que elijas una.'}</small></p><div className="nv2Tabs" role="tablist" aria-label="Vista de Nival Tech">{(Object.keys(previews) as Preview[]).map(name=><button key={name} type="button" role="tab" id={`nv2-tab-${name}`} aria-selected={active===name} aria-controls="nv2-panel" onClick={()=>{setChosen(true);setActive(name)}}><span aria-hidden="true">{previews[name].icon}</span><b>{name==='Reseñas'?'Reseñas de Google':name}</b><small>{previews[name].benefit}</small></button>)}</div><div className="nv5InlineExplain"><span>¿QUÉ ES?</span><p>{selected.what}</p><span>CÓMO SE USA</span><ol>{selected.steps.map(step=><li key={step}>{step}</li>)}</ol></div></div><div className="nv5RealPhone" role="tabpanel" id="nv2-panel" aria-labelledby={`nv2-tab-${active}`}><div className="nv5PhoneBar"><span>9:41</span><span>●●●</span></div><div className={`nv5PhoneViewport nv5Preview${active}`}>{active==='Pay'?<PaymentPageView embedded preview profile={payProfile}/>:active==='Reseñas'?<GoogleReviewsMock/>:<WifiRealMock/>}</div></div></div>;
}
