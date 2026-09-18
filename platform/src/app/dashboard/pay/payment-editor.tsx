'use client';
import { useActionState, useEffect, useState } from 'react';
import Image from 'next/image';
import { savePaymentProfile, type PaymentFormState } from './actions';
import { PaymentProfileQr } from '../payment-profile-qr';

type Profile = { account_holder: string; bank_name: string; clabe: string; concept: string | null; payment_url: string | null; image_url: string | null; public_token: string; active: boolean; view_count: number; clabe_copy_count?: number };
export function PaymentEditor({ businessId, businessName, businessLogo, profile, siteUrl }: {
  businessId: string; businessName: string; businessLogo: string | null; profile: Profile | null; siteUrl: string;
}) {
  const [state, action, pending] = useActionState<PaymentFormState, FormData>(savePaymentProfile, {});
  const [holder, setHolder] = useState(profile?.account_holder ?? '');
  const [bank, setBank] = useState(profile?.bank_name ?? '');
  const [clabe, setClabe] = useState(profile?.clabe ?? '');
  const [concept, setConcept] = useState(profile?.concept ?? '');
  const [paymentUrl, setPaymentUrl] = useState(profile?.payment_url ?? '');
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [active, setActive] = useState(profile?.active ?? true);
  const [sections, setSections] = useState<Array<{ id: string; title: string; content: string; public: boolean }>>([]);
  const addSection = () => {
    setSections(current => [...current, { id: crypto.randomUUID(), title: '', content: '', public: true }]);
  };
  const updateSection = (id: string, patch: Partial<{ title: string; content: string; public: boolean }>) => {
    setSections(current => current.map(section => section.id === id ? { ...section, ...patch } : section));
  };
  const editSectionField = (id: string, field: 'title' | 'content', currentValue: string) => {
    const label = field === 'title' ? 'Nombre del apartado' : 'Link o información del apartado';
    const nextValue = window.prompt(label, currentValue);
    if (nextValue !== null) updateSection(id, { [field]: nextValue });
  };
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const image = preview || (removeImage ? businessLogo : profile?.image_url || businessLogo);
  const token = state.token || profile?.public_token;
  return <>
    <form action={action} className="visualPayEditor">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="paymentUrl" value={paymentUrl} />
      <input type="hidden" name="active" value={active ? "on" : ""} />
      <input type="hidden" name="removeImage" value={removeImage ? "on" : ""} />
      <div className="visualPayToolbar"><div><p className="eyebrow">EDITA DIRECTAMENTE</p><h2>Tu página Nival Pay</h2></div></div>
      <div className="nivalClientPreview editableClientPreview" style={{position:"relative"}}>
        <button type="button" className={active ? "visibilityToggle public" : "visibilityToggle hidden"} onClick={()=>setActive(v=>!v)} aria-pressed={active} title="Cambiar visibilidad de la página" style={{position:"absolute",top:"1rem",right:"1rem",zIndex:5,minWidth:"auto",padding:"0.5rem 0.8rem",fontSize:"0.78rem",lineHeight:1}}>{active ? "Visible · cambiar" : "Oculta · cambiar"}</button>
        <div className="nivalClientBrand"><span>N</span><b>Nival Pay</b><small>Datos verificados</small></div>
        <div className="nivalClientProfile">
          <label className="editableLogo" title="Cambiar foto o logo">
            {image ? <Image src={image} width={104} height={104} unoptimized alt={`Imagen de ${businessName}`} /> : <div className="nivalClientMonogram">{businessName.slice(0,2).toUpperCase()}</div>}
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const selected=e.target.files?.[0];setPreview(selected?URL.createObjectURL(selected):null);setRemoveImage(false)}} />
            <span>Cambiar logo</span>
          </label>
          <p>Realiza tu transferencia a · <b className="fieldEditHint">Editar</b></p>
          <input className="inlinePayInput holderInput" aria-label="Titular de la cuenta" name="accountHolder" value={holder} onChange={e=>setHolder(e.target.value)} required minLength={2} maxLength={120} />
        </div>
        <div className="nivalClientDetails editableDetails">
          <label><span>Banco · <b className="fieldEditHint">Editar</b></span><input className="inlinePayInput" name="bankName" value={bank} onChange={e=>setBank(e.target.value)} required minLength={2} maxLength={80} /></label>
          <label><span>CLABE interbancaria · <b className="fieldEditHint">Editar</b></span><input className="inlinePayInput" name="clabe" value={clabe} onChange={e=>setClabe(e.target.value)} required inputMode="numeric" pattern="[0-9 ]{18,23}" maxLength={23} /></label>
          <label><span>Concepto <small>Opcional</small> · <b className="fieldEditHint">Editar</b></span><input className="inlinePayInput" name="concept" value={concept} onChange={e=>setConcept(e.target.value)} maxLength={120} placeholder="Agregar concepto" /></label>
          {sections.map((section, index) => <div className="customPaySection" key={section.id} style={{position:"relative",paddingTop:"3.2rem"}}>
            <button type="button" className={section.public ? "visibilityToggle public" : "visibilityToggle hidden"} onClick={()=>updateSection(section.id,{public:!section.public})} aria-pressed={section.public} title="Cambiar visibilidad" style={{position:"absolute",top:"0.75rem",right:"0.75rem",minWidth:"auto",padding:"0.45rem 0.75rem",fontSize:"0.78rem",lineHeight:1}}>{section.public ? "Pública" : "Oculta"}</button>
            <label><span>Apartado {index + 1} · <button type="button" className="fieldEditHint editHintButton" onClick={()=>editSectionField(section.id,"title",section.title)}>Editar</button></span><input className="inlinePayInput" value={section.title} onChange={e=>updateSection(section.id,{title:e.target.value})} maxLength={80} placeholder="Título del apartado" /></label>
            <label><span>Link o información · <button type="button" className="fieldEditHint editHintButton" onClick={()=>editSectionField(section.id,"content",section.content)}>Editar</button></span><input className="inlinePayInput" value={section.content} onChange={e=>updateSection(section.id,{content:e.target.value})} maxLength={200} placeholder="https://... o escribe información" /></label>
          </div>)}
        </div>
        <div className="inlinePageControls">
          <label className="inlineOptionalLink"><span>Enlace de pago <small>Opcional</small> · <b className="fieldEditHint">Editar</b></span><input value={paymentUrl} onChange={e=>setPaymentUrl(e.target.value)} type="url" placeholder="https://..." /></label>
        </div>
        <div className="inlineApartados">
          <p className="apartadoIntro">Puedes agregar <strong>hasta 5 apartados gratis</strong>. Cada uno puede tener información propia dentro de esta misma página.</p>
          <button type="button" className="apartadoRowAdd" onClick={addSection} disabled={sections.length >= 5}><span><b>+</b></span><div><strong>{sections.length >= 5 ? "5 apartados incluidos" : "Agregar apartado"}</strong><small>{sections.length >= 5 ? "Los siguientes apartados tendrán un costo de $10 MXN" : `Se añadirá debajo de Concepto · ${sections.length}/5 usados`}</small></div></button>
          <p className="apartadoFootnote">Los primeros 5 apartados están incluidos. A partir del sexto, cada apartado adicional cuesta $10 MXN.</p>
        </div>
        <button className="paySavePrimary" disabled={pending} type="submit">{pending ? 'Guardando cambios…' : 'Guardar cambios'}</button>
      </div>

      {state.error && <p role="alert" className="payError">{state.error}</p>}
      {state.saved && <p role="status" className="paySuccess">Cambios guardados. Tu QR y enlace siguen siendo los mismos.</p>}
    </form>
    {token && <section className="payShare"><h2>Comparte tu página</h2><PaymentProfileQr businessName={businessName} url={`${siteUrl}/pay/${token}`} views={Number(profile?.view_count ?? 0)} /></section>}
  </>;
}