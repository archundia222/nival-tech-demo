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
    <div className="payEditorGrid">
      <form action={action} className="payForm">
        <input type="hidden" name="businessId" value={businessId} />
        <h2>Configura tu página</h2>
        <label>Titular de la cuenta<input name="accountHolder" value={holder} onChange={e => setHolder(e.target.value)} required minLength={2} maxLength={120} autoComplete="name" /></label>
        <label>Banco<input name="bankName" value={bank} onChange={e => setBank(e.target.value)} required minLength={2} maxLength={80} placeholder="Nombre del banco" /></label>
        <label>CLABE interbancaria<input name="clabe" value={clabe} onChange={e => setClabe(e.target.value)} required inputMode="numeric" pattern="[0-9 ]{18,23}" maxLength={23} placeholder="18 dígitos" /><small>Comprueba que corresponda al titular y al banco.</small></label>
        <label>Concepto de transferencia <span className="payOptional">Opcional</span><input name="concept" value={concept} onChange={e => setConcept(e.target.value)} maxLength={120} placeholder="Ej. Pago de consumo" /><small>Tu cliente podrá copiarlo junto con los datos bancarios.</small></label>
        <label>Enlace de pago <span className="payOptional">Opcional</span><input name="paymentUrl" value={paymentUrl} onChange={e => setPaymentUrl(e.target.value)} type="url" maxLength={2048} placeholder="https://..." /></label>
        <label>Foto o logo <span className="payOptional">Opcional</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const selected = e.target.files?.[0]; setPreview(selected ? URL.createObjectURL(selected) : null); setRemoveImage(false); }} /><small>JPG, PNG o WebP. Máximo 2 MB. La imagen será pública.</small></label>
        {profile?.image_url && <label className="checkLabel"><input type="checkbox" name="removeImage" checked={removeImage} onChange={e => { setRemoveImage(e.target.checked); setPreview(null); const input = e.currentTarget.form?.elements.namedItem("image"); if (input instanceof HTMLInputElement) input.value = ""; }} /> Usar el logo del negocio en lugar de esta foto</label>}
        <label className="checkLabel"><input name="active" type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Página pública disponible</label>
        <p className="payHelp">Al publicarla, cualquier persona con el enlace podrá consultar estos datos.</p>
        {state.error && <p role="alert" className="payError">{state.error}</p>}
        {state.saved && <p role="status" className="paySuccess">Cambios guardados. Tu enlace y QR siguen siendo los mismos.</p>}
        <button className="payButton" disabled={pending}>{pending ? 'Guardando…' : profile || state.token ? 'Guardar cambios' : 'Crear mi página'}</button>
      </form>
      <aside className="payPreview nivalPayPreview"><p className="eyebrow">ASÍ LO VE TU CLIENTE</p>
        <div className="nivalClientPreview">
          <div className="nivalClientBrand"><span>N</span><b>Nival Pay</b><small>Datos verificados</small></div>
          <div className="nivalClientProfile">
            {image ? <Image src={image} width={104} height={104} unoptimized alt={`Imagen de ${businessName}`} /> : <div className="nivalClientMonogram">{businessName.slice(0,2).toUpperCase()}</div>}
            <p>Realiza tu transferencia a</p><h2>{holder || 'Nombre del titular'}</h2>
          </div>
          <dl className="nivalClientDetails"><div><dt>Banco</dt><dd>{bank || 'Tu banco'}</dd></div><div><dt>CLABE interbancaria</dt><dd>{clabe || '18 dígitos completos'}</dd></div>{concept && <div><dt>Concepto</dt><dd>{concept}</dd></div>}</dl>
          <div className="nivalClientCopy">Copiar CLABE</div>
        </div>
        <p className="payHelp">Vista previa fiel a la página que abre tu QR o tarjeta NFC.</p>
      </aside>    </div>
    {token && <section className="payShare"><h2>Comparte tu página</h2><PaymentProfileQr businessName={businessName} url={`${siteUrl}/pay/${token}`} views={Number(profile?.view_count ?? 0)} /></section>}
  </>;
}
