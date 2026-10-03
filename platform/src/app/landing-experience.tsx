'use client';
import { useState } from 'react';
import { PaymentPageView, type PaymentPageViewProfile } from './pay/[token]/payment-page-view';

const example = { business: 'Taquería La Esquina', holder: 'Negocio de ejemplo', bank: 'Banco de ejemplo', clabe: '000000000000000000', concept: 'Pago de consumo' };
function profile(values: typeof example): PaymentPageViewProfile {
  return { business_name: values.business, account_holder: values.holder, bank_name: values.bank, clabe: values.clabe, concept: values.concept, brand_color:'#18784c', holder_visible:true, bank_visible:true, clabe_visible:true, concept_visible:true, payment_url_visible:false, custom_sections:[] };
}
export function RoleIcon({ business = false }: { business?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{business ? <><path d="M4 10v10h16V10M3 10l2-6h14l2 6M8 20v-6h5v6"/><path d="M3 10c1.5 3 4.5 3 6 0 1.5 3 4.5 3 6 0 1.5 3 4.5 3 6 0"/></> : <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>}</svg>;
}
export function TapExperience() {
  const [paused,setPaused] = useState(false);
  return <div className={`tapScene ${paused ? 'tapScenePaused' : ''}`}>
    <div className="sceneGlow" aria-hidden="true"/>
    <div className="sceneOrbit" aria-hidden="true"/>
    <div className="heroPhone" aria-label="Teléfono con la pantalla real de Nival Pay"><div className="phoneButton buttonOne"/><div className="phoneButton buttonTwo"/><div className="phoneGlass"><div className="phoneStatus"><span>9:41</span><span>▥ ◔ ▰</span></div><div className="phoneIsland"/><div className="phoneContent" inert><PaymentPageView embedded profile={profile(example)}/></div><div className="phoneHome"/></div></div>
    <div className="physicalCard" aria-label="Tarjeta NFC Nival Pay acercándose al teléfono"><div className="cardLight"/><div className="physicalCardTop"><b>NIVAL</b><span>PAY</span></div><svg className="cardNfc" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 13a10 10 0 010 14M18 8a17 17 0 010 24M24 3a24 24 0 010 34"/></svg><div className="physicalCardBottom"><span>UN TOQUE. Y LISTO.</span><span>01</span></div></div>
    <div className="tapPulse" aria-hidden="true"/><div className="tapNotification"><span>✓</span><div><strong>Nival Pay</strong><small>Datos listos para copiar</small></div></div>
    <button className="motionControl" onClick={()=>setPaused(!paused)} aria-label={paused?'Reanudar animación':'Pausar animación'}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{paused ? <path d="m8 5 11 7-11 7Z"/> : <><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></>}</svg></button>
    <span className="sceneCaption">NFC + QR · sin instalar una app</span>
  </div>;
}
export function LandingDemo() {
  const [values,setValues] = useState(example);
  const [editing,setEditing] = useState(false);
  return <section className="liveDemo" id="demo" aria-labelledby="demo-title"><div className="demoIntro"><span className="sectionLabel">PRUÉBALO AQUÍ</span><h2 id="demo-title">Tu tarjeta.<br/>Tus datos.</h2><p>Cambia un dato. Mira el resultado. Toca para copiar.</p><div className="demoMode" role="group" aria-label="Modo de la demo"><button aria-pressed={!editing} onClick={()=>setEditing(false)}>Vista del cliente</button><button aria-pressed={editing} onClick={()=>setEditing(true)}>Editar datos</button></div>
    {editing ? <div className="demoEditor"><label>Negocio<input value={values.business} maxLength={80} onChange={e=>setValues({...values,business:e.target.value})}/></label><label>Beneficiario<input value={values.holder} maxLength={120} onChange={e=>setValues({...values,holder:e.target.value})}/></label><label>Banco<input value={values.bank} maxLength={80} onChange={e=>setValues({...values,bank:e.target.value})}/></label><label>CLABE de ejemplo<input value={values.clabe} inputMode="numeric" maxLength={18} onChange={e=>setValues({...values,clabe:e.target.value.replace(/\D/g,'').slice(0,18)})}/></label><label>Concepto<input value={values.concept} maxLength={120} onChange={e=>setValues({...values,concept:e.target.value})}/></label><button className="demoReset" onClick={()=>setValues(example)}>Restablecer ejemplo</button></div> : <div className="demoSteps"><div><span>01</span><p>El negocio configura su tarjeta.</p></div><div><span>02</span><p>El cliente acerca su teléfono.</p></div><div><span>03</span><p>Copia los datos y abre su banco.</p></div></div>}
    <small className="demoDisclaimer">Demo con datos ficticios · no guarda cambios ni genera cobros.</small>
    </div><div className="demoDisplay"><div className="demoDisplayTop"><span className="demoDot"/>Vista en tiempo real<span>Toca para copiar</span></div><div className="demoPayment"><PaymentPageView embedded profile={profile(values)}/></div></div></section>;
}
