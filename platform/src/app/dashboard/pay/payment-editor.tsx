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
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const image = preview || (removeImage ? businessLogo : profile?.image_url || businessLogo);
  const token = state.token || profile?.public_token;
  return <>
    <form action={action} className="visualPayEditor">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="paymentUrl" value={paymentUrl} />
      <input type="hidden" name="active" value={active ? "on" : ""} />
      <input type="hidden" name="removeImage" value={removeImage ? "on" : ""} />
      <div className="visualPayToolbar"><div><p className="eyebrow">EDITA DIRECTAMENTE</p><h2>Tu página Nival Pay</h2><p className="visualEditHint">Haz clic sobre el nombre, banco, CLABE, concepto o logo para editarlos.</p></div><button className="payButton" disabled={pending}>{pending ? 'Guardando…' : 'Guardar cambios'}</button></div>
      <div className="nivalClientPreview editableClientPreview">
        <div className="nivalClientBrand"><span>N</span><b>Nival Pay</b><small>Datos verificados</small></div>
        <div className="nivalClientProfile">
          <label className="editableLogo" title="Cambiar foto o logo">
            {image ? <Image src={image} width={104} height={104} unoptimized alt={`Imagen de ${businessName}`} /> : <div className="nivalClientMonogram">{businessName.slice(0,2).toUpperCase()}</div>}
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const selected=e.target.files?.[0];setPreview(selected?URL.createObjectURL(selected):null);setRemoveImage(false)}} />
            <span>Cambiar logo</span>
          </label>
          <p>Realiza tu transferencia a</p>
          <input className="inlinePayInput holderInput" aria-label="Titular de la cuenta" name="accountHolder" value={holder} onChange={e=>setHolder(e.target.value)} required minLength={2} maxLength={120} />
        </div>
        <div className="nivalClientDetails editableDetails">
          <label><span>Banco</span><input className="inlinePayInput" name="bankName" value={bank} onChange={e=>setBank(e.target.value)} required minLength={2} maxLength={80} /></label>
          <label><span>CLABE interbancaria</span><input className="inlinePayInput" name="clabe" value={clabe} onChange={e=>setClabe(e.target.value)} required inputMode="numeric" pattern="[0-9 ]{18,23}" maxLength={23} /></label>
          <label><span>Concepto <small>Opcional</small></span><input className="inlinePayInput" name="concept" value={concept} onChange={e=>setConcept(e.target.value)} maxLength={120} placeholder="Agregar concepto" /></label>
        </div>
        <div className="nivalClientCopy">Copiar CLABE</div>
      </div>
      <details className="payAdvancedSettings"><summary>Opciones de la página</summary><div>
        <label>Enlace de pago opcional<input value={paymentUrl} onChange={e=>setPaymentUrl(e.target.value)} type="url" placeholder="https://..." /></label>
        <label className="checkLabel"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} /> Página pública disponible</label>
        {profile?.image_url && <button type="button" className="textButton" onClick={()=>{setRemoveImage(true);setPreview(null)}}>Usar logo del negocio</button>}
      </div></details>
      {state.error && <p role="alert" className="payError">{state.error}</p>}
      {state.saved && <p role="status" className="paySuccess">Cambios guardados. Tu QR y enlace siguen siendo los mismos.</p>}
    </form>
    {token && <section className="payExtraLinks"><div><p className="eyebrow">MÁS PUNTOS DE COBRO</p><h2>Agrega hasta 5 apartados más</h2><p>Tu Nival Pay incluye este link principal. Puedes agregar hasta 5 apartados adicionales, cada uno con su propia página, enlace y QR, por <strong>$10 MXN</strong> cada uno.</p></div><div className="extraLinkOffer"><span>Hasta 5 adicionales</span><strong>$10 <small>MXN / apartado</small></strong><p>Al agregar uno, también podrás elegir una tarjeta NFC física para ese apartado por +$99 MXN.</p></div></section>}
    {token && <section className="payShare"><h2>Comparte tu página</h2><PaymentProfileQr businessName={businessName} url={`${siteUrl}/pay/${token}`} views={Number(profile?.view_count ?? 0)} /></section>}
  </>;
}