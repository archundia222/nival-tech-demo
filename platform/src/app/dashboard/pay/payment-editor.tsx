'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { savePaymentProfile, type PaymentFormState } from './actions';
import { PaymentPageView } from '@/app/pay/[token]/payment-page-view';

type Section = { id: string; title: string; content: string; public: boolean };
type Profile = { id:string; display_name?:string|null; account_holder:string; bank_name:string; clabe:string; concept:string|null; payment_url:string|null; image_url:string|null; public_token:string; active:boolean; view_count:number; clabe_copy_count?:number; holder_visible?:boolean; bank_visible?:boolean; clabe_visible?:boolean; concept_visible?:boolean; payment_url_visible?:boolean; custom_sections?:Section[]; extra_sections_purchased?:number };

function VisibilityControl({ visible, onClick }: { visible:boolean; onClick:()=>void }) {
  return <button type="button" className={`nivalPayVisibility ${visible ? 'isVisible' : 'isHidden'}`} onClick={onClick} aria-pressed={visible}>{visible ? 'Visible' : 'Oculto'}</button>;
}

export function PaymentEditor({ businessId, businessName, businessLogo, businessBrandColor, profile, siteUrl, trialMode=false }: { businessId:string; businessName:string; businessLogo:string|null; businessBrandColor:string|null; profile:Profile|null; siteUrl:string; trialMode?:boolean }) {
  const [state, action, pending] = useActionState<PaymentFormState, FormData>(savePaymentProfile, {});
  const formRef=useRef<HTMLFormElement|null>(null); const imageInputRef=useRef<HTMLInputElement|null>(null); const lastSubmittedRevision=useRef(0);
  const [revision,setRevision]=useState(0); const [savedRevision,setSavedRevision]=useState(0); const markDirty=()=>setRevision(v=>v+1);
  const [displayName,setDisplayName]=useState(profile?.display_name?.trim()||'Nival Pay'); const [holder,setHolder]=useState(profile?.account_holder??''); const [bank,setBank]=useState(profile?.bank_name??''); const [clabe,setClabe]=useState(profile?.clabe??''); const [concept,setConcept]=useState(profile?.concept??''); const [paymentUrl,setPaymentUrl]=useState(profile?.payment_url??''); const [preview,setPreview]=useState<string|null>(null); const [removeImage,setRemoveImage]=useState(false); const [active,setActive]=useState(profile?.active??true);
  const [fieldVisibility,setFieldVisibility]=useState({holder:profile?.holder_visible??true,bank:profile?.bank_visible??true,clabe:profile?.clabe_visible??true,concept:profile?.concept_visible??true,paymentUrl:profile?.payment_url_visible??true});
  const toggleDefaultField=(field:keyof typeof fieldVisibility,label:string)=>{if(fieldVisibility[field]&&!window.confirm(`¿En verdad quieres ocultar ${label}? Tus clientes dejarán de verlo en tu página.`))return;markDirty();setFieldVisibility(v=>({...v,[field]:!v[field]}));};
  const [sections,setSections]=useState<Section[]>(Array.isArray(profile?.custom_sections)?profile.custom_sections:[]); const [newSectionId,setNewSectionId]=useState<string|null>(null); const newSectionInput=useRef<HTMLInputElement|null>(null);
  const addSection=()=>{const limit=trialMode?1:Number.POSITIVE_INFINITY;if(sections.length>=limit)return;markDirty();setSections(current=>{const id=crypto.randomUUID();setNewSectionId(id);return[...current,{id,title:'',content:'',public:true}]})};
  const updateSection=(id:string,patch:Partial<Section>)=>{markDirty();setSections(current=>current.map(s=>s.id===id?{...s,...patch}:s));};
  const removeSection=(id:string,title:string)=>{if(!window.confirm(`¿Eliminar ${title.trim()||'este apartado'}? Podrás usar este espacio para crear otro apartado después.`))return;markDirty();setSections(v=>v.filter(s=>s.id!==id));if(newSectionId===id)setNewSectionId(null);};
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
  useEffect(()=>{if(newSectionId&&newSectionInput.current){newSectionInput.current.scrollIntoView({behavior:'smooth',block:'center'});newSectionInput.current.focus()}},[newSectionId,sections.length]);
  useEffect(()=>{if(revision===0||pending||lastSubmittedRevision.current===revision)return;const timeout=window.setTimeout(()=>{const form=formRef.current;if(!form||!form.checkValidity())return;lastSubmittedRevision.current=revision;form.requestSubmit()},1100);return()=>window.clearTimeout(timeout)},[revision,pending]);
  useEffect(()=>{if(!state.saved)return;setSavedRevision(lastSubmittedRevision.current);if(imageInputRef.current)imageInputRef.current.value=''},[state]);
  const image=preview||(removeImage?businessLogo:profile?.image_url||businessLogo); const totalSectionLimit=trialMode?1:Number.POSITIVE_INFINITY; const hasPendingChanges=revision>savedRevision;
  const saveStatus=pending?'Guardando cambios…':state.error?'No se pudo guardar':hasPendingChanges?'Guardando cambios…':'Cambios guardados ✓';
  const change=(setter:(v:string)=>void)=>(value:string)=>{setter(value);markDirty();};

  return <form ref={formRef} action={action} className="nivalPayEditorShell" onSubmit={()=>{lastSubmittedRevision.current=revision}}>
    <input type="hidden" name="businessId" value={businessId}/><input type="hidden" name="profileId" value={profile?.id??''}/><input type="hidden" name="displayName" value={displayName}/><input type="hidden" name="paymentUrl" value={trialMode?'':paymentUrl}/><input type="hidden" name="active" value={active?'on':''}/><input type="hidden" name="fieldVisibility" value={JSON.stringify(fieldVisibility)}/><input type="hidden" name="customSections" value={JSON.stringify(sections)}/><input type="hidden" name="removeImage" value={removeImage?'on':''}/>

    <aside id="vista-nival-pay" className="nivalPayLivePreview" aria-label="Vista previa en vivo de Nival Pay">
      <div className="nivalPayPreviewLabel"><span>ESTÁS EDITANDO ESTA NIVAL PAY</span><small>Los cambios se reflejan aquí</small></div>
      <div className="nivalPayPreviewPhone">
        <PaymentPageView embedded profile={{business_name:businessName,logo_url:image,brand_color:businessBrandColor,account_holder:holder,bank_name:bank,clabe,concept,payment_url:paymentUrl,holder_visible:fieldVisibility.holder,bank_visible:fieldVisibility.bank,clabe_visible:fieldVisibility.clabe,concept_visible:fieldVisibility.concept,payment_url_visible:fieldVisibility.paymentUrl,custom_sections:sections}} editor={{holder,bank,clabe,concept,paymentUrl,trialMode,onHolder:change(setHolder),onBank:change(setBank),onClabe:change(setClabe),onConcept:change(setConcept),onPaymentUrl:change(setPaymentUrl)}}/>
      </div>
    </aside>

    <section className="nivalPayEditorPanel" aria-label="Editor de Nival Pay">
      <header className="nivalPayEditorHeader"><div><p className="eyebrow">EDITA DIRECTAMENTE</p><h2>Personaliza tu Nival Pay</h2></div><div className="nivalPaySaveCluster"><span className={`nivalPaySaveStatus ${state.error?'isError':pending?'isSaving':hasPendingChanges?'isPending':'isSaved'}`} role={state.error?'alert':'status'}>{saveStatus}</span><span className="nivalPayAutosaveHint">Guardado automático</span></div></header>
      {state.error&&<p className="nivalPaySaveError" role="alert">{state.error}</p>}
      <div className="nivalPayFieldGroup"><label className="nivalPayField"><span>✎ Nombre de la tarjeta</span><input value={displayName} onChange={e=>{setDisplayName(e.target.value);markDirty()}} minLength={2} maxLength={60} placeholder="Nival Pay"/></label><label className="nivalPayFileControl"><span>✎ Cambiar logo</span><input ref={imageInputRef} name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];setPreview(f?URL.createObjectURL(f):null);setRemoveImage(false);markDirty()}}/></label></div>
      <div className="nivalPayFormSectionTitle"><span>DATOS PARA COBRAR</span><p>Lo esencial que tu cliente necesita para hacer una transferencia sin preguntarte nada.</p></div>
      <div className="nivalPayFieldGroup">
        <div className="nivalPayFieldHeading"><span>Beneficiario</span><VisibilityControl visible={fieldVisibility.holder} onClick={()=>toggleDefaultField('holder','el titular')}/></div><input className="nivalPayTextInput" name="accountHolder" value={holder} onChange={e=>{setHolder(e.target.value);markDirty()}} required minLength={2} maxLength={120}/>
        <div className="nivalPayFieldHeading"><span>Banco</span><VisibilityControl visible={fieldVisibility.bank} onClick={()=>toggleDefaultField('bank','Banco')}/></div><input className="nivalPayTextInput" name="bankName" value={bank} onChange={e=>{setBank(e.target.value);markDirty()}} required minLength={2} maxLength={80}/>
        <div className="nivalPayFieldHeading"><span>CLABE interbancaria</span><VisibilityControl visible={fieldVisibility.clabe} onClick={()=>toggleDefaultField('clabe','la CLABE')}/></div><input className="nivalPayTextInput" name="clabe" value={clabe} onChange={e=>{setClabe(e.target.value);markDirty()}} required inputMode="numeric" pattern="[0-9 ]{18,23}" maxLength={23}/>
      </div>
      <div className="nivalPayFormSectionTitle"><span>AYUDAS OPCIONALES</span><p>{trialMode?'Durante la prueba puedes agregar un concepto. El enlace de pago se desbloquea al activar Nival Pay.':'Agrega un concepto fijo o un enlace de pago si realmente le facilita el proceso al cliente.'}</p></div>
      <div className="nivalPayFieldGroup"><div className="nivalPayFieldHeading"><span>Concepto <small>Opcional</small></span><VisibilityControl visible={fieldVisibility.concept} onClick={()=>toggleDefaultField('concept','Concepto')}/></div><input className="nivalPayTextInput" name="concept" value={concept} onChange={e=>{setConcept(e.target.value);markDirty()}} maxLength={120} placeholder="Agregar concepto"/>{!trialMode&&<><div className="nivalPayFieldHeading"><span>Enlace de pago <small>Opcional</small></span><VisibilityControl visible={fieldVisibility.paymentUrl} onClick={()=>toggleDefaultField('paymentUrl','el Enlace de pago')}/></div><input className="nivalPayTextInput" value={paymentUrl} onChange={e=>{setPaymentUrl(e.target.value);markDirty()}} type="url" placeholder="https://..."/></>}</div>
      {sections.map((section,index)=><div className="nivalPayCustomSection" key={section.id}><div className="nivalPayFieldHeading"><span>Apartado {index+1}</span><VisibilityControl visible={section.public} onClick={()=>updateSection(section.id,{public:!section.public})}/></div><label className="nivalPayField"><span>Nombre del apartado</span><input ref={section.id===newSectionId?newSectionInput:undefined} value={section.title} onChange={e=>updateSection(section.id,{title:e.target.value})} maxLength={80} placeholder="Título del apartado"/></label><label className="nivalPayField"><span>Link o información</span><input value={section.content} onChange={e=>updateSection(section.id,{content:e.target.value})} maxLength={200} placeholder="https://... o escribe información"/></label><button type="button" className="nivalPayDeleteSection" onClick={()=>removeSection(section.id,section.title)}>Eliminar apartado</button></div>)}
      <div className="nivalPaySectionsAction"><p className="apartadoIntro">{trialMode?<>Además de tus datos bancarios, puedes añadir <strong>1 apartado gratis</strong> para otro enlace o instrucción de cobro.</>:<>Añade apartados para otros enlaces o instrucciones de cobro; se mostrarán debajo de tus datos bancarios.</>}</p>{sections.length<totalSectionLimit?<button type="button" className="nvSecondaryButton nivalPaySecondaryAction" onClick={e=>{e.preventDefault();e.stopPropagation();addSection()}}>+ Añadir apartado a mi página</button>:<span className="nivalPayTrialLock">Ya usaste tu apartado gratis · Pro permite agregar más</span>}</div>
    </section>

  </form>;
}
