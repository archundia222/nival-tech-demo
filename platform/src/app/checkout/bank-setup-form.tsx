'use client';

import { useActionState, useState } from 'react';
import { completeCheckoutBankProfile, type CheckoutBankState } from './actions';

const banks = [
  'BBVA', 'Banamex', 'Santander', 'Banorte', 'HSBC', 'Scotiabank',
  'Banco Azteca', 'Inbursa', 'BanBajío', 'Nu', 'Mercado Pago', 'Otro',
];

export function BankSetupForm({ businessName, siteUrl }: { businessName: string; siteUrl: string }) {
  const [state, action, pending] = useActionState<CheckoutBankState, FormData>(completeCheckoutBankProfile, {});
  const [clabe, setClabe] = useState('');
  const [copied, setCopied] = useState(false);
  const publicUrl = state.token ? `${siteUrl}/pay/${state.token}` : '';

  if (state.saved && publicUrl) {
    return <section className="checkoutFinal" aria-live="polite">
      <span className="checkoutFinalCheck" aria-hidden="true">✓</span>
      <p className="checkoutKicker">CONFIGURACIÓN COMPLETA</p>
      <h1>Tu tarjeta ya está activa</h1>
      <p>La página de cobro de {businessName} está lista para compartir.</p>
      <div className="checkoutPublicLink">
        <span>Tu página</span>
        <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a>
        <button type="button" onClick={async () => {
          await navigator.clipboard.writeText(publicUrl);
          setCopied(true);
        }}>{copied ? 'Enlace copiado' : 'Copiar enlace'}</button>
      </div>
      <a className="checkoutQuietLink" href="/dashboard/pay">Abrir configuración</a>
    </section>;
  }

  return <section className="checkoutSetup">
    <div className="checkoutStep"><span>2</span><div><b>Pago confirmado</b><p>Agrega la cuenta donde recibirás transferencias.</p></div></div>
    <form action={action} className="checkoutBankForm">
      <label className="checkoutFieldWide">Titular de la cuenta
        <input name="accountHolder" required minLength={2} maxLength={120} autoComplete="name" placeholder="Nombre completo" />
      </label>
      <label>Banco
        <select name="bankName" required defaultValue="">
          <option value="" disabled>Selecciona tu banco</option>
          {banks.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
        </select>
      </label>
      <label>CLABE interbancaria
        <input name="clabe" required inputMode="numeric" autoComplete="off" maxLength={18} minLength={18}
          value={clabe} onChange={(event) => setClabe(event.target.value.replace(/\D/g, '').slice(0, 18))}
          placeholder="18 dígitos" />
        <small>{clabe.length}/18 dígitos</small>
      </label>
      {state.error && <p className="checkoutFormError" role="alert">{state.error}</p>}
      <button className="checkoutPrimaryButton checkoutFieldWide" disabled={pending || clabe.length !== 18}>
        {pending ? 'Guardando…' : 'Continuar'}
      </button>
      <p className="checkoutPrivacy checkoutFieldWide">Solo mostraremos estos datos en tu página de cobro. Nunca solicitaremos NIP, CVV ni contraseñas.</p>
    </form>
  </section>;
}

export function ActiveCard({ businessName, url }: { businessName: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return <section className="checkoutFinal">
    <span className="checkoutFinalCheck" aria-hidden="true">✓</span>
    <p className="checkoutKicker">NIVAL PAY ACTIVO</p>
    <h1>Tu tarjeta ya está activa</h1>
    <p>La página de cobro de {businessName} está lista para compartir.</p>
    <div className="checkoutPublicLink"><span>Tu página</span><a href={url} target="_blank" rel="noreferrer">{url}</a>
      <button type="button" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); }}>{copied ? 'Enlace copiado' : 'Copiar enlace'}</button>
    </div>
    <a className="checkoutQuietLink" href="/dashboard/pay">Administrar Nival Pay</a>
  </section>;
}
