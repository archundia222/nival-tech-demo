'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { savePaymentProfile, type PaymentFormState } from './actions';

type Section = { id: string; title: string; content: string; public: boolean };
type Profile = {
  id: string;
  display_name?: string | null;
  account_holder: string;
  bank_name: string;
  clabe: string;
  concept: string | null;
  payment_url: string | null;
  image_url: string | null;
  public_token: string;
  active: boolean;
  view_count: number;
  clabe_copy_count?: number;
  holder_visible?: boolean;
  bank_visible?: boolean;
  clabe_visible?: boolean;
  concept_visible?: boolean;
  payment_url_visible?: boolean;
  custom_sections?: Section[];
  extra_sections_purchased?: number;
};

function VisibilityControl({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`nivalPayVisibility ${visible ? 'isVisible' : 'isHidden'}`}
      onClick={onClick}
      aria-pressed={visible}
    >
      {visible ? 'Visible' : 'Oculto'}
    </button>
  );
}

export function PaymentEditor({
  businessId,
  businessName,
  businessLogo,
  businessBrandColor,
  profile,
  siteUrl,
  trialMode = false,
}: {
  businessId: string;
  businessName: string;
  businessLogo: string | null;
  businessBrandColor: string | null;
  profile: Profile | null;
  siteUrl: string;
  trialMode?: boolean;
}) {
  const [state, action, pending] = useActionState<PaymentFormState, FormData>(savePaymentProfile, {});
  const formRef = useRef<HTMLFormElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const lastSubmittedRevision = useRef(0);
  const [revision, setRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const markDirty = () => setRevision((current) => current + 1);

  const [displayName, setDisplayName] = useState(profile?.display_name?.trim() || 'Nival Pay');
  const [holder, setHolder] = useState(profile?.account_holder ?? '');
  const [bank, setBank] = useState(profile?.bank_name ?? '');
  const [clabe, setClabe] = useState(profile?.clabe ?? '');
  const [concept, setConcept] = useState(profile?.concept ?? '');
  const [paymentUrl, setPaymentUrl] = useState(profile?.payment_url ?? '');
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [active, setActive] = useState(profile?.active ?? true);
  const [fieldVisibility, setFieldVisibility] = useState({
    holder: profile?.holder_visible ?? true,
    bank: profile?.bank_visible ?? true,
    clabe: profile?.clabe_visible ?? true,
    concept: profile?.concept_visible ?? true,
    paymentUrl: profile?.payment_url_visible ?? true,
  });

  const toggleDefaultField = (field: keyof typeof fieldVisibility, label: string) => {
    if (fieldVisibility[field] && !window.confirm(`¿En verdad quieres ocultar ${label}? Tus clientes dejarán de verlo en tu página.`)) return;
    markDirty();
    setFieldVisibility((current) => ({ ...current, [field]: !current[field] }));
  };

  const [sections, setSections] = useState<Section[]>(Array.isArray(profile?.custom_sections) ? profile.custom_sections : []);
  const [newSectionId, setNewSectionId] = useState<string | null>(null);
  const newSectionInput = useRef<HTMLInputElement | null>(null);

  const addSection = () => {
    const limit = trialMode ? 1 : Number.POSITIVE_INFINITY;
    if (sections.length >= limit) return;
    markDirty();
    setSections((current) => {
      const id = crypto.randomUUID();
      setNewSectionId(id);
      return [...current, { id, title: '', content: '', public: true }];
    });
  };

  const updateSection = (id: string, patch: Partial<{ title: string; content: string; public: boolean }>) => {
    markDirty();
    setSections((current) => current.map((section) => section.id === id ? { ...section, ...patch } : section));
  };
  const removeSection = (id: string, title: string) => {
    const label = title.trim() || 'este apartado';
    if (!window.confirm(`¿Eliminar ${label}? Podrás usar este espacio para crear otro apartado después.`)) return;
    markDirty();
    setSections((current) => current.filter((section) => section.id !== id));
    if (newSectionId === id) setNewSectionId(null);
  };

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!newSectionId || !newSectionInput.current) return;
    newSectionInput.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    newSectionInput.current.focus();
  }, [newSectionId, sections.length]);

  useEffect(() => {
    if (revision === 0 || pending || lastSubmittedRevision.current === revision) return;
    const timeout = window.setTimeout(() => {
      const form = formRef.current;
      if (!form || !form.checkValidity()) return;
      lastSubmittedRevision.current = revision;
      form.requestSubmit();
    }, 1100);
    return () => window.clearTimeout(timeout);
  }, [revision, pending]);

  useEffect(() => {
    if (!state.saved) return;
    setSavedRevision(lastSubmittedRevision.current);
    if (imageInputRef.current) imageInputRef.current.value = '';
  }, [state]);

  const image = preview || (removeImage ? businessLogo : profile?.image_url || businessLogo);
  const totalSectionLimit = trialMode ? 1 : Number.POSITIVE_INFINITY;

  const hasPendingChanges = revision > savedRevision;
  const saveStatus = pending
    ? 'Guardando cambios…'
    : state.error
      ? 'No se pudo guardar'
      : hasPendingChanges
        ? 'Guardando cambios…'
        : 'Cambios guardados ✓';

  return (
    <form
      ref={formRef}
      action={action}
      className="nivalPayEditorShell"
      onSubmit={() => {
        lastSubmittedRevision.current = revision;
      }}
    >
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="profileId" value={profile?.id ?? ''} />
      <input type="hidden" name="displayName" value={displayName} />
      <input type="hidden" name="paymentUrl" value={trialMode ? '' : paymentUrl} />
      <input type="hidden" name="active" value={active ? 'on' : ''} />
      <input type="hidden" name="fieldVisibility" value={JSON.stringify(fieldVisibility)} />
      <input type="hidden" name="customSections" value={JSON.stringify(sections)} />
      <input type="hidden" name="removeImage" value={removeImage ? 'on' : ''} />

      <section className="nivalPayEditorPanel" aria-label="Editor de Nival Pay">
        <header className="nivalPayEditorHeader">
          <div>
            <p className="eyebrow">EDITA DIRECTAMENTE</p>
            <h2>Tu página Nival Pay</h2>
          </div>
          <div className="nivalPaySaveCluster">
            {profile?.public_token && profile.active && <a className="nivalPayPublicLink" href={siteUrl + '/pay/' + profile.public_token} target="_blank" rel="noreferrer">Ver página ↗</a>}
            <span
              className={`nivalPaySaveStatus ${state.error ? 'isError' : pending ? 'isSaving' : hasPendingChanges ? 'isPending' : 'isSaved'}`}
              role={state.error ? 'alert' : 'status'}
              aria-live="polite"
            >
              {saveStatus}
            </span>
            <span className="nivalPayAutosaveHint">Guardado automático</span>
          </div>
        </header>

        {state.error && <p className="nivalPaySaveError" role="alert">{state.error}</p>}

        <div className="nivalPayFieldGroup">
          <label className="nivalPayField">
            <span>Nombre de la tarjeta</span>
            <input
              value={displayName}
              onChange={(event) => { setDisplayName(event.target.value); markDirty(); }}
              minLength={2}
              maxLength={60}
              placeholder="Nival Pay"
              aria-label="Nombre de la tarjeta"
            />
          </label>

          <label className="nivalPayFileControl">
            <span>Cambiar logo</span>
            <input
              ref={imageInputRef}
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                setPreview(selected ? URL.createObjectURL(selected) : null);
                setRemoveImage(false);
                markDirty();
              }}
            />
          </label>
        </div>

        <div className="nivalPayFormSectionTitle"><span>DATOS PARA COBRAR</span><p>Lo esencial que tu cliente necesita para hacer una transferencia sin preguntarte nada.</p></div>
        <div className="nivalPayFieldGroup">
          <div className="nivalPayFieldHeading">
            <span>Beneficiario</span>
            <VisibilityControl visible={fieldVisibility.holder} onClick={() => toggleDefaultField('holder', 'el titular')} />
          </div>
          <input
            className="nivalPayTextInput"
            aria-label="Titular de la cuenta"
            name="accountHolder"
            value={holder}
            onChange={(event) => { setHolder(event.target.value); markDirty(); }}
            required
            minLength={2}
            maxLength={120}
          />

          <div className="nivalPayFieldHeading">
            <span>Banco</span>
            <VisibilityControl visible={fieldVisibility.bank} onClick={() => toggleDefaultField('bank', 'Banco')} />
          </div>
          <input
            className="nivalPayTextInput"
            name="bankName"
            value={bank}
            onChange={(event) => { setBank(event.target.value); markDirty(); }}
            required
            minLength={2}
            maxLength={80}
          />

          <div className="nivalPayFieldHeading">
            <span>CLABE interbancaria</span>
            <VisibilityControl visible={fieldVisibility.clabe} onClick={() => toggleDefaultField('clabe', 'la CLABE')} />
          </div>
          <input
            className="nivalPayTextInput"
            name="clabe"
            value={clabe}
            onChange={(event) => { setClabe(event.target.value); markDirty(); }}
            required
            inputMode="numeric"
            pattern="[0-9 ]{18,23}"
            maxLength={23}
          />

        </div>

        <div className="nivalPayFormSectionTitle"><span>AYUDAS OPCIONALES</span><p>{trialMode ? 'Durante la prueba puedes agregar un concepto. El enlace de pago se desbloquea al activar Nival Pay.' : 'Agrega un concepto fijo o un enlace de pago si realmente le facilita el proceso al cliente.'}</p></div>
        <div className="nivalPayFieldGroup">
          <div className="nivalPayFieldHeading">
            <span>Concepto <small>Opcional</small></span>
            <VisibilityControl visible={fieldVisibility.concept} onClick={() => toggleDefaultField('concept', 'Concepto')} />
          </div>
          <input
            className="nivalPayTextInput"
            name="concept"
            value={concept}
            onChange={(event) => { setConcept(event.target.value); markDirty(); }}
            maxLength={120}
            placeholder="Agregar concepto"
          />

          {!trialMode && <>
            <div className="nivalPayFieldHeading">
              <span>Enlace de pago <small>Opcional</small></span>
              <VisibilityControl visible={fieldVisibility.paymentUrl} onClick={() => toggleDefaultField('paymentUrl', 'el Enlace de pago')} />
            </div>
            <input
              className="nivalPayTextInput"
              value={paymentUrl}
              onChange={(event) => { setPaymentUrl(event.target.value); markDirty(); }}
              type="url"
              placeholder="https://..."
            />
          </>}
        </div>

        {sections.map((section, index) => (
          <div className="nivalPayCustomSection" key={section.id}>
            <div className="nivalPayFieldHeading">
              <span>Apartado {index + 1}</span>
              <VisibilityControl visible={section.public} onClick={() => updateSection(section.id, { public: !section.public })} />
            </div>

            <label className="nivalPayField">
              <span>Nombre del apartado</span>
              <input
                ref={section.id === newSectionId ? newSectionInput : undefined}
                value={section.title}
                onChange={(event) => updateSection(section.id, { title: event.target.value })}
                maxLength={80}
                placeholder="Título del apartado"
              />
            </label>

            <label className="nivalPayField">
              <span>Link o información</span>
              <input
                value={section.content}
                onChange={(event) => updateSection(section.id, { content: event.target.value })}
                maxLength={200}
                placeholder="https://... o escribe información"
              />
            </label>
            <button
              type="button"
              className="nivalPayDeleteSection"
              onClick={() => removeSection(section.id, section.title)}
            >
              Eliminar apartado
            </button>
          </div>
        ))}

        <div className="nivalPaySectionsAction">
          <p className="apartadoIntro">{trialMode
            ? <>Nival Pay Free incluye <strong>1 punto de cobro</strong>. Con Pro puedes crear <strong>puntos de cobro ilimitados</strong>.</>
            : <>Nival Pay Pro incluye <strong>puntos de cobro ilimitados</strong>. Agrega los que necesites para tu operación.</>}</p>
          {sections.length < totalSectionLimit ? (
            <button
              type="button"
              className="nvSecondaryButton nivalPaySecondaryAction"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                addSection();
              }}
            >
              Agregar punto de cobro
            </button>
          ) : (
            <span className="nivalPayTrialLock">Activa Pro para crear más puntos de cobro</span>
          )}
          <p className="apartadoFootnote">{trialMode
            ? 'Tu QR y tu configuración se conservan cuando activas Pro.'
            : 'Cada punto de cobro se puede editar, ocultar o reutilizar cuando quieras.'}</p>
        </div>
      </section>

      <aside className="nivalPayLivePreview nivalPayInlineEditor" aria-label="Edita tu Nival Pay directamente">
        <div className="nivalPayInlineHelp"><b>Edita dentro de tu Nival Pay</b><span>Toca un dato, escribe y listo. Se guarda automáticamente.</span></div>
        <div className="nivalPayEditableCard">
          <div className="nivalPayEditableBrand">
            <div className="nivalPayEditableLogo">{image ? <img src={image} alt="" /> : <span>{businessName.slice(0,2).toUpperCase()}</span>}</div>
            <div><small>Nival Pay</small><strong>{businessName}</strong></div>
          </div>
          <div className="nivalPayEditableSteps"><span>1 Copia</span><span>2 Abre tu banco</span><span>3 Pega y verifica</span></div>
          <label className="nivalPayEditableField"><span>Beneficiario</span><input value={holder} onChange={(e)=>{setHolder(e.target.value);markDirty();}} /></label>
          <label className="nivalPayEditableField"><span>Banco</span><input value={bank} onChange={(e)=>{setBank(e.target.value);markDirty();}} /></label>
          <label className="nivalPayEditableField"><span>CLABE interbancaria</span><input inputMode="numeric" value={clabe} onChange={(e)=>{setClabe(e.target.value.replace(/[^0-9 ]/g,'').slice(0,23));markDirty();}} /></label>
          <label className="nivalPayEditableField"><span>Concepto</span><input value={concept} onChange={(e)=>{setConcept(e.target.value);markDirty();}} placeholder="Opcional" /></label>
          {!trialMode && <label className="nivalPayEditableField"><span>Enlace de pago</span><input type="url" value={paymentUrl} onChange={(e)=>{setPaymentUrl(e.target.value);markDirty();}} placeholder="https://..." /></label>}
          <div className="nivalPayEditableStatus"><i className={pending||hasPendingChanges?'saving':'saved'} />{saveStatus}</div>
        </div>
        <button
          type="button"
          className={`nivalPayPublishSticky ${active?'published':'hidden'}`}
          onClick={()=>{setActive(v=>!v);markDirty();}}
        >
          {active ? 'Ocultar mi Nival Pay' : 'Publicar mi Nival Pay'}
        </button>
      </aside>
    </form>
  );
}
