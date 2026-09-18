'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { savePaymentProfile, type PaymentFormState } from './actions';
import { startExtraSectionCheckout } from '@/app/checkout/actions';

type Section = { id: string; title: string; content: string; public: boolean };
type Profile = { id: string; account_holder: string; bank_name: string; clabe: string; concept: string | null; payment_url: string | null; image_url: string | null; public_token: string; active: boolean; view_count: number; clabe_copy_count?: number; holder_visible?: boolean; bank_visible?: boolean; clabe_visible?: boolean; concept_visible?: boolean; payment_url_visible?: boolean; custom_sections?: Section[]; extra_sections_purchased?: number };
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
  const [fieldVisibility, setFieldVisibility] = useState({ holder: profile?.holder_visible ?? true, bank: profile?.bank_visible ?? true, clabe: profile?.clabe_visible ?? true, concept: profile?.concept_visible ?? true, paymentUrl: profile?.payment_url_visible ?? true });
  const toggleDefaultField = (field: keyof typeof fieldVisibility, label: string) => {
    setFieldVisibility(current => {
      if (current[field] && !window.confirm(`¿En verdad quieres ocultar ${label}? Tus clientes dejarán de verlo en tu página.`)) return current;
      return { ...current, [field]: !current[field] };
    });
  };
  const [sections, setSections] = useState<Section[]>(Array.isArray(profile?.custom_sections) ? profile.custom_sections : []);
  const [newSectionId, setNewSectionId] = useState<string | null>(null);
  const newSectionInput = useRef<HTMLInputElement | null>(null);
  const addSection = () => {
    setSections(current => {
      if (current.length >= 3 + (profile?.extra_sections_purchased ?? 0)) return current;
      const id = crypto.randomUUID();
      setNewSectionId(id);
      return [...current, { id, title: '', content: '', public: true }];
    });
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
  useEffect(() => {
    if (!newSectionId || !newSectionInput.current) return;
    newSectionInput.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    newSectionInput.current.focus();
  }, [newSectionId, sections.length]);
  const image = preview || (removeImage ? businessLogo : profile?.image_url || businessLogo);
  const token = state.token || profile?.public_token;
  const freeSectionLimit = 3;
  const purchasedSectionLimit = profile?.extra_sections_purchased ?? 0;
  const totalSectionLimit = freeSectionLimit + purchasedSectionLimit;
  return <>
    <form action={action} className="visualPayEditor">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="profileId" value={profile?.id ?? ''} />
      <input type="hidden" name="paymentUrl" value={paymentUrl} />
      <input type="hidden" name="active" value={active ? "on" : ""} />
      <input type="hidden" name="fieldVisibility" value={JSON.stringify(fieldVisibility)} />
      <input type="hidden" name="customSections" value={JSON.stringify(sections)} />
      <input type="hidden" name="removeImage" value={removeImage ? "on" : ""} />
      <div className="visualPayToolbar"><div><p className="eyebrow">EDITA DIRECTAMENTE</p><h2>Tu página Nival Pay</h2></div></div>
      <div className="nivalClientPreview editableClientPreview" style={{position:"relative"}}>
        <div className="nivalClientBrand"><span>N</span><b>Nival Pay</b><small>Datos verificados</small></div>
        <div className="nivalClientProfile" style={{position:"relative"}}><button type="button" className={fieldVisibility.holder ? "visibilityToggle public" : "visibilityToggle hidden"} onClick={()=>toggleDefaultField("holder","el titular")} style={{position:"absolute",right:".65rem",top:".5rem",minWidth:"auto",padding:".3rem .55rem",fontSize:".65rem",zIndex:3}}>{fieldVisibility.holder ? "Visible" : "Oculto"}</button>
          <label className="editableLogo" title="Cambiar foto o logo">
            {image ? <Image src={image} width={104} height={104} unoptimized alt={`Imagen de ${businessName}`} /> : <div className="nivalClientMonogram">{businessName.slice(0,2).toUpperCase()}</div>}
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const selected=e.target.files?.[0];setPreview(selected?URL.createObjectURL(selected):null);setRemoveImage(false)}} />
            <span>Cambiar logo</span>
          </label>
          <p>Realiza tu transferencia a · <b className="fieldEditHint">Editar</b></p>
          <input className="inlinePayInput holderInput" aria-label="Titular de la cuenta" name="accountHolder" value={holder} onChange={e=>setHolder(e.target.value)} required minLength={2} maxLength={120} />
        </div>
        <div className="nivalClientDetails editableDetails">
          <label style={{position:"relative"}}><button type="button" className={fieldVisibility.bank ? "visibilityToggle public" : "visibilityToggle hidden"} onClick={()=>toggleDefaultField("bank","Banco")} style={{position:"absolute",right:".65rem",top:".5rem",minWidth:"auto",padding:".3rem .55rem",fontSize:".65rem",zIndex:3}}>{fieldVisibility.bank ? "Visible" : "Oculto"}</button><span>Banco · <b className="fieldEditHint">Editar</b></span><input className="inlinePayInput" name="bankName" value={bank} onChange={e=>setBank(e.target.value)} required minLength={2} maxLength={80} /></label>
          <label style={{position:"relative"}}><button type="button" className={fieldVisibility.clabe ? "visibilityToggle public" : "visibilityToggle hidden"} onClick={()=>toggleDefaultField("clabe","la CLABE")} style={{position:"absolute",right:".65rem",top:".5rem",minWidth:"auto",padding:".3rem .55rem",fontSize:".65rem",zIndex:3}}>{fieldVisibility.clabe ? "Visible" : "Oculto"}</button><span>CLABE interbancaria · <b className="fieldEditHint">Editar</b></span><input className="inlinePayInput" name="clabe" value={clabe} onChange={e=>setClabe(e.target.value)} required inputMode="numeric" pattern="[0-9 ]{18,23}" maxLength={23} /></label>
          <label style={{position:"relative"}}><button type="button" className={fieldVisibility.concept ? "visibilityToggle public" : "visibilityToggle hidden"} onClick={()=>toggleDefaultField("concept","Concepto")} style={{position:"absolute",right:".65rem",top:".5rem",minWidth:"auto",padding:".3rem .55rem",fontSize:".65rem",zIndex:3}}>{fieldVisibility.concept ? "Visible" : "Oculto"}</button><span>Concepto <small>Opcional</small> · <b className="fieldEditHint">Editar</b></span><input className="inlinePayInput" name="concept" value={concept} onChange={e=>setConcept(e.target.value)} maxLength={120} placeholder="Agregar concepto" /></label>
          <label className="inlineOptionalLink" style={{position:"relative"}}><button type="button" className={fieldVisibility.paymentUrl ? "visibilityToggle public" : "visibilityToggle hidden"} onClick={()=>toggleDefaultField("paymentUrl","el Enlace de pago")} style={{position:"absolute",right:".65rem",top:".5rem",minWidth:"auto",padding:".3rem .55rem",fontSize:".65rem",zIndex:3}}>{fieldVisibility.paymentUrl ? "Visible" : "Oculto"}</button><span>Enlace de pago <small>Opcional</small> · <b className="fieldEditHint">Editar</b></span><input value={paymentUrl} onChange={e=>setPaymentUrl(e.target.value)} type="url" placeholder="https://..." /></label>
{sections.map((section, index) => <div className="customPaySection" key={section.id} style={{position:"relative",paddingTop:"3.2rem"}}>
            <button type="button" className={section.public ? "visibilityToggle public" : "visibilityToggle hidden"} onClick={()=>updateSection(section.id,{public:!section.public})} aria-pressed={section.public} title="Cambiar visibilidad" style={{position:"absolute",top:"0.75rem",right:"0.75rem",minWidth:"auto",padding:"0.45rem 0.75rem",fontSize:"0.78rem",lineHeight:1}}>{section.public ? "Visible" : "Oculto"}</button>
            <label><span>Apartado {index + 1} · <button type="button" className="fieldEditHint editHintButton" onClick={()=>editSectionField(section.id,"title",section.title)}>Editar</button></span><input ref={section.id === newSectionId ? newSectionInput : undefined} className="inlinePayInput" value={section.title} onChange={e=>updateSection(section.id,{title:e.target.value})} maxLength={80} placeholder="Título del apartado" /></label>
            <label><span>Link o información · <button type="button" className="fieldEditHint editHintButton" onClick={()=>editSectionField(section.id,"content",section.content)}>Editar</button></span><input className="inlinePayInput" value={section.content} onChange={e=>updateSection(section.id,{content:e.target.value})} maxLength={200} placeholder="https://... o escribe información" /></label>
          </div>)}
        </div>
        <div className="inlineApartados">
          <p className="apartadoIntro">Puedes agregar <strong>hasta 3 apartados gratis</strong>. Cada uno puede tener información propia dentro de esta misma página.</p>
          {sections.length < totalSectionLimit ? <button type="button" className="apartadoRowAdd" onClick={addSection}><span><b>+</b></span><div><strong>Agregar apartado</strong><small>{sections.length < freeSectionLimit ? `Te quedan ${freeSectionLimit-sections.length} gratis` : `${totalSectionLimit-sections.length} apartado comprado disponible`}</small></div></button> : <button type="submit" className="apartadoRowAdd apartadoRowLocked" formAction={startExtraSectionCheckout}><input type="hidden" name="profileId" value={profile?.id ?? ""} /><span><b>🔒</b></span><div><strong>Agregar apartado · $10 MXN</strong><small>Ya usaste tus 3 apartados gratis. Compra uno adicional para desbloquearlo.</small></div></button>}
          <p className="apartadoFootnote">Los primeros 3 apartados están incluidos. Después, cada apartado adicional cuesta $10 MXN.</p>
        </div>
        <button className="paySavePrimary" disabled={pending} type="submit">{pending ? 'Guardando cambios…' : 'Guardar cambios'}</button>
      </div>

      {state.error && <p role="alert" className="payError">{state.error}</p>}
      {state.saved && <p role="status" className="paySuccess">Cambios guardados. Tu QR y enlace siguen siendo los mismos.</p>}
    </form>
  </>;
}
