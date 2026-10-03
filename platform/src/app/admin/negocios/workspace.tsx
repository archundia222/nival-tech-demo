'use client';
import { useState } from 'react';
import { CustomerShare } from '@/app/customer-share';
import { useRouter } from 'next/navigation';
import type { ManagedBusiness } from '@/lib/managed-business';

export function ManagedAdminWorkspace({ businesses, siteUrl, activeBusinessIds }: { businesses: ManagedBusiness[]; siteUrl: string; activeBusinessIds: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [issuedCode, setIssuedCode] = useState<{ code: string; name: string } | null>(null);
  const [query, setQuery] = useState('');
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
  async function command(payload: Record<string, unknown>, businessName?: string) {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/businesses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json(); setError(!response.ok);
      if (!response.ok) { setMessage(result.error); return; }
      if (result.code) setIssuedCode({ code: result.code, name: businessName ?? String(payload.name) });
      setMessage('Cambio guardado.');
      router.refresh();
    } catch { setError(true); setMessage('No pudimos conectar. Actualiza el panel para revisar si el cambio se guardó antes de intentar nuevamente.'); }
    finally { setBusy(false); }
  }
  const cards = businesses.flatMap(b => b.cards).filter(c => !c.managed_removed_at);
  const active = businesses.filter(b => activeBusinessIds.includes(b.id));
  return <>
    <div className="managedMetrics"><article><span>Negocios registrados</span><strong>{businesses.length}</strong></article><article><span>Nival Pay asignados</span><strong>{cards.length}</strong></article><article><span>Negocios activos</span><strong>{active.length}</strong></article></div>
    {message && <p role="status" className={error ? 'managedError managedNotice' : 'managedSuccess managedNotice'}>{message}</p>}
    {issuedCode && <section className="managedCodeBox" role="status"><div><span className="managedEyebrow">CÓDIGO PRIVADO · {issuedCode.name}</span><h2>Entrégalo únicamente al negocio</h2><code>{issuedCode.code}</code><p>Entrará en {siteUrl}/negocio. Guarda el código. Puedes reemplazarlo si el negocio lo pierde.</p></div><div><button disabled={busy} onClick={async () => { try { await navigator.clipboard.writeText(issuedCode.code); setMessage('Código copiado.'); setError(false); } catch { setMessage('Selecciona el código para copiarlo.'); setError(true); } }}>Copiar código</button><button className="managedOutline" onClick={() => setIssuedCode(null)}>Ya lo guardé</button></div></section>}
    <details className="managedCreate" open={!businesses.length}><summary>Agregar negocio</summary><form className="managedForm managedCreateForm" onSubmit={e => {
      e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); if (!window.confirm('Confirma que recibiste $99 MXN. El acceso será de por vida.')) return; void command({ ...values, action: 'create' });
    }}><label>Nombre del negocio<input name="name" placeholder="Ej. Barbería Central" autoComplete="organization" required minLength={2} maxLength={120} /></label><label>Número de contacto<input name="phone" type="tel" inputMode="tel" placeholder="Ej. 55 1234 5678" autoComplete="tel" required minLength={8} maxLength={30} /></label><label>Cantidad de Nival Pay<input name="quantity" type="number" inputMode="numeric" min={1} max={100} step={1} defaultValue={1} required /></label><button disabled={busy}>{busy ? 'Guardando…' : 'Confirmar $99 y activar'}</button><p>$99 MXN, pago único. El negocio conserva acceso de por vida; no hay mensualidades, recargas ni cobro por aperturas.</p></form></details>
    <section className="managedSectionHead"><h2>Negocios</h2><label className="managedSearch">Buscar<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre del negocio" /></label></section>
    <div className="managedBusinessList">{businesses.filter(b => b.name.toLowerCase().includes(query.toLowerCase())).map(b => {
      const enabled = activeBusinessIds.includes(b.id);
      return <article className="managedBusiness" key={b.id}><header><div><h2>{b.name}</h2><p>{b.phone || 'Sin teléfono'} · {b.cards.filter(c => !c.managed_removed_at).length} Nival Pay</p></div><span className={`managedStatus ${enabled ? '' : 'paused'}`}>{enabled ? 'Activo de por vida' : 'Suspendido manualmente'}</span></header>
        <div className="managedAccessCode"><span>Código único de acceso</span>{b.access_code ? <div className="managedAccessCodeRow"><code>{visibleCodes[b.id] ? b.access_code : '••••-••••-••••-••••-••••-••••-••••-••••'}</code><button type="button" className="managedOutline" onClick={() => setVisibleCodes(current => ({ ...current, [b.id]: !current[b.id] }))}>{visibleCodes[b.id] ? 'Ocultar' : 'Ver'}</button><button type="button" className="managedOutline" onClick={async () => { await navigator.clipboard.writeText(b.access_code!); setMessage('Código copiado.'); }}>Copiar</button></div> : null}</div>
        <details className="managedBusinessDetails"><summary>Nival Pay y administración</summary><div className="managedAdminCards">{b.cards.map(c => <div className={`managedAdminCard ${c.managed_removed_at ? 'removed' : ''}`} key={c.id}><section><strong>{c.display_name}</strong><span>{c.managed_removed_at ? 'Retirado' : c.managed_ready ? 'Configurado' : 'Pendiente de datos bancarios'}</span><small>{c.view_count} aperturas acumuladas · acceso sin límite</small><code>{siteUrl}/tap/{c.public_token}</code>{c.managed_ready && !c.managed_removed_at && <a href={`/pay/${c.public_token}`} target="_blank" rel="noreferrer">Ver página</a>}{enabled && c.managed_ready && c.active && !c.managed_removed_at && <CustomerShare cardId={c.id} />}</section><button className="managedOutline" disabled={busy} onClick={() => void command({ action: c.managed_removed_at ? 'restore' : 'remove', businessId: b.id, profileId: c.id })}>{c.managed_removed_at ? 'Restaurar' : 'Retirar'}</button></div>)}</div>
          <div className="managedAdminOperations"><form className="managedForm" onSubmit={e => { e.preventDefault(); const values=Object.fromEntries(new FormData(e.currentTarget)); if (!window.confirm('Confirma que este Nival Pay ya está pagado.')) return; void command({ ...values, action:'add', businessId:b.id, cardPaymentConfirmed:true }); }}><label>Agregar Nival Pay<input name="quantity" type="number" min={1} max={100} defaultValue={1} required /></label><p>Sin recargas ni saldo de aperturas.</p><button disabled={busy}>Agregar</button></form><div className="managedOperationButtons"><details><summary>Opciones administrativas</summary><p>La suspensión es únicamente manual; el sistema no debe suspender por número de aperturas.</p><button className="managedOutline" disabled={busy} onClick={() => void command({ action: b.suspended ? 'resume' : 'suspend', businessId: b.id })}>{b.suspended ? 'Reactivar' : 'Suspender manualmente'}</button></details></div></div>
        </details>
      </article>;
    })}</div>
    {!businesses.length && <p className="managedEmpty">Agrega tu primer negocio. El sistema genera su código de acceso.</p>}
  </>;
}
