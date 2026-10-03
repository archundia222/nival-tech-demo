'use client';
import { useState } from 'react';
import { CustomerShare } from '@/app/customer-share';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import type { ManagedCard } from '@/lib/managed-business';
import { dateLabel } from '@/app/managed-shared';
import { money } from '@/lib/orders';

export function BusinessLogout() {
  const router = useRouter();
  return <button className="managedTextButton" onClick={async () => { const r = await fetch('/api/business/logout', { method: 'POST' }); if (r.ok) { router.replace('/negocio'); router.refresh(); } }}>Cerrar sesión</button>;
}
function CardEditor({ card, siteUrl }: { card: ManagedCard; siteUrl: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = `${siteUrl}/tap/${card.public_token}`;
  const period = card.current_period;
  return <article className="managedCard"><header><div><span className="managedEyebrow">{card.managed_ready ? 'LISTA PARA COMPARTIR' : 'PENDIENTE DE CONFIGURAR'}</span><h3>{card.display_name}</h3></div><div className="managedCardCount"><strong>{period?.views ?? 0}</strong><span>aperturas de esta tarjeta</span><span>{card.included_views_remaining ?? 0} aperturas incluidas restantes</span></div></header>
    {period && <div className="managedMetrics"><article><span>Con cobro</span><strong>{period.billable_views ?? 0}</strong><small>{money(period.rate_cents)} por apertura</small></article><article><span>Acumulado</span><strong>{money(Number(period.amount_cents))}</strong><small>Solo esta Nival Pay</small></article><article><span>Corte de esta tarjeta</span><strong className="managedDate">{dateLabel(period.ends_at)}</strong><small>Independiente de tus otras tarjetas</small></article></div>}
    <form className="managedForm managedBankForm" onSubmit={async e => {
      e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); setBusy(true); setMessage('');
      try {
        const response = await fetch(`/api/business/cards/${card.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
        const result = await response.json(); setError(!response.ok); setMessage(response.ok ? 'Datos guardados. Tu tarjeta conserva el mismo enlace.' : result.error);
        if (response.ok) router.refresh();
      } catch { setError(true); setMessage('No pudimos conectar. Intenta nuevamente.'); }
      finally { setBusy(false); }
    }}><label>Nombre de la tarjeta<input name="displayName" required minLength={2} maxLength={80} defaultValue={card.display_name} /></label><label>Beneficiario<input name="holder" required minLength={2} maxLength={120} defaultValue={card.account_holder} autoComplete="off" /></label><label>Banco<input name="bank" required minLength={2} maxLength={80} defaultValue={card.bank_name} /></label><label>CLABE interbancaria<input name="clabe" required inputMode="numeric" pattern="[0-9]{18}" maxLength={18} defaultValue={card.clabe} autoComplete="off" /></label><label>Concepto (opcional)<input name="concept" maxLength={120} defaultValue={card.concept ?? ''} /></label><div className="managedSave"><button disabled={busy}>{busy ? 'Guardando…' : 'Guardar datos'}</button>{message && <p role="status" className={error ? 'managedError' : 'managedSuccess'}>{message}</p>}</div></form>
    {card.managed_ready && card.active && <CustomerShare cardId={card.id} />}
    <details className="managedShare"><summary>Enlace y QR de esta tarjeta</summary><div><QRCodeSVG value={url} size={150} /><section><p>Este es el enlace que se graba en tu tarjeta NFC.</p><code>{url}</code><button className="managedOutline" onClick={async () => { try { await navigator.clipboard.writeText(url); setError(false); setMessage('Enlace copiado correctamente.'); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setError(true); setMessage('Selecciona el enlace para copiarlo.'); } }}>{copied ? '✓ Link copiado' : 'Copiar enlace NFC / QR'}</button>{card.managed_ready && <a href={`/pay/${card.public_token}`} target="_blank" rel="noreferrer">Ver página de mi tarjeta</a>}</section></div></details>
    {!!card.billing_history?.length && <details className="managedHistory"><summary>Historial de esta tarjeta ({card.billing_history.length})</summary>{card.billing_history.map(p => <article key={p.id}><div><strong>{dateLabel(p.starts_at)} — {dateLabel(p.ends_at)}</strong><span>{p.views} aperturas · {money(Number(p.amount_cents))}</span>{p.payment_reference && <small>Referencia: {p.payment_reference}</small>}</div></article>)}</details>}
  </article>;
}
export function BusinessCards({ cards, siteUrl }: { cards: ManagedCard[]; siteUrl: string }) {
  if (!cards.length) return <div className="managedEmpty">No tienes tarjetas asignadas. Contacta a Nival para solicitar una.</div>;
  return <div className="managedCards">{cards.map(card => <CardEditor key={card.id} card={card} siteUrl={siteUrl} />)}</div>;
}
