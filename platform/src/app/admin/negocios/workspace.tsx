'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ManagedBusiness } from '@/lib/managed-business';
import { PeriodSummary, PeriodHistory } from '@/app/managed-shared';

export function ManagedAdminWorkspace({ businesses, siteUrl, activeBusinessIds }: { businesses: ManagedBusiness[]; siteUrl: string; activeBusinessIds: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [issuedCode, setIssuedCode] = useState<{ code: string; name: string } | null>(null);
  const [query, setQuery] = useState('');
  async function command(payload: Record<string, unknown>, businessName?: string) {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/businesses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json(); setError(!response.ok);
      if (!response.ok) { setMessage(result.error); return; }
      if (result.code) setIssuedCode({ code: result.code, name: businessName ?? String(payload.name) });
      setMessage(payload.action === 'settle' ? 'Pago registrado. Comenzó un nuevo periodo de 30 días.' : 'Cambio guardado.');
      router.refresh();
    } catch { setError(true); setMessage('No pudimos conectar. Actualiza el panel para revisar si el cambio se guardó antes de intentar nuevamente.'); }
    finally { setBusy(false); }
  }
  const cards = businesses.flatMap(b => b.cards).filter(c => !c.managed_removed_at);
  const active = businesses.filter(b => activeBusinessIds.includes(b.id));
  return <>
    <div className="managedMetrics"><article><span>Negocios registrados</span><strong>{businesses.length}</strong></article><article><span>Tarjetas asignadas</span><strong>{cards.length}</strong></article><article><span>Negocios activos</span><strong>{active.length}</strong></article></div>
    {message && <p role="status" className={error ? 'managedError managedNotice' : 'managedSuccess managedNotice'}>{message}</p>}
    {issuedCode && <section className="managedCodeBox" role="status"><div><span className="managedEyebrow">CÓDIGO PRIVADO · {issuedCode.name}</span><h2>Entrégalo únicamente al negocio</h2><code>{issuedCode.code}</code><p>Entrará en {siteUrl}/negocio. Este código se muestra una sola vez; puedes generar uno nuevo si lo pierde.</p></div><div><button disabled={busy} onClick={async () => { try { await navigator.clipboard.writeText(issuedCode.code); setMessage('Código copiado.'); setError(false); } catch { setMessage('Selecciona el código para copiarlo.'); setError(true); } }}>Copiar código</button><button className="managedOutline" onClick={() => setIssuedCode(null)}>Ya lo guardé</button></div></section>}
    <details className="managedCreate" open={!businesses.length}><summary>Dar de alta un negocio</summary><form className="managedForm managedCreateForm" onSubmit={e => {
      e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); void command({ ...values, action: 'create' });
    }}><label>Nombre del negocio<input name="name" required minLength={2} maxLength={120} /></label><label>Teléfono de contacto<input name="phone" type="tel" maxLength={30} /></label><label>Tarjetas que entregas<input name="quantity" type="number" min={1} max={100} defaultValue={1} required /></label><label>MXN por apertura<input name="rate" type="number" min={0} max={1000} step="0.01" defaultValue={1} required /></label><button disabled={busy}>{busy ? 'Guardando…' : 'Registrar y generar código'}</button><p>El negocio configura sus datos bancarios. Su primer periodo de 30 días comienza al registrarlo.</p></form></details>
    <section className="managedSectionHead"><h2>Negocios</h2><label className="managedSearch">Buscar<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre del negocio" /></label></section>
    <div className="managedBusinessList">{businesses.filter(b => b.name.toLowerCase().includes(query.toLowerCase())).map(b => {
      const period = b.periods.find(p => !p.paid_at);
      const enabled = activeBusinessIds.includes(b.id);
      return <article className="managedBusiness" key={b.id}><header><div><h2>{b.name}</h2><p>{b.phone || 'Sin teléfono'} · {b.cards.filter(c => !c.managed_removed_at).length} tarjetas</p></div><span className={`managedStatus ${enabled ? '' : 'paused'}`}>{enabled ? 'Activo' : 'Suspendido'}</span></header>
        <PeriodSummary period={period} />
        <details className="managedBusinessDetails"><summary>Tarjetas y administración</summary><div className="managedAdminCards">{b.cards.map(c => <div className={`managedAdminCard ${c.managed_removed_at ? 'removed' : ''}`} key={c.id}><section><strong>{c.display_name}</strong><span>{c.managed_removed_at ? 'Retirada' : c.managed_ready ? 'Configurada' : 'Pendiente de datos bancarios'}</span><small>{c.period_views} aperturas este periodo · {c.view_count} acumuladas</small><code>{siteUrl}/tap/{c.public_token}</code>{c.managed_ready && !c.managed_removed_at && <a href={`/pay/${c.public_token}`} target="_blank" rel="noreferrer">Ver página</a>}</section><button className="managedOutline" disabled={busy} onClick={() => void command({ action: c.managed_removed_at ? 'restore' : 'remove', businessId: b.id, profileId: c.id })}>{c.managed_removed_at ? 'Restaurar tarjeta' : 'Retirar tarjeta'}</button></div>)}</div>
          <div className="managedAdminOperations"><form className="managedForm" onSubmit={e => { e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); void command({ ...values, action: 'add', businessId: b.id }); }}><label>Agregar tarjetas<input name="quantity" type="number" min={1} max={100} defaultValue={1} required /></label><button disabled={busy}>Agregar</button></form><div className="managedOperationButtons"><button className="managedOutline" disabled={busy} onClick={() => void command({ action: b.suspended ? 'resume' : 'suspend', businessId: b.id })}>{b.suspended ? 'Reactivar periodo vigente' : 'Suspender servicio'}</button><details><summary>Reemplazar código de acceso</summary><p>El código anterior dejará de funcionar y se cerrarán las sesiones del negocio.</p><button className="managedOutline" disabled={busy} onClick={() => void command({ action: 'rotate', businessId: b.id }, b.name)}>Generar nuevo código</button></details></div></div>
        </details>
        {period && <details className="managedSettle"><summary>Registrar pago recibido y activar 30 días</summary><p>Confirma aquí únicamente después de recibir el pago. Se cierra el periodo actual y se conservan las aperturas por tarjeta.</p><form className="managedForm managedSettleForm" onSubmit={e => { e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); void command({ ...values, action: 'settle', businessId: b.id, periodId: period.id }); }}><label>Referencia o nota (opcional)<input name="reference" maxLength={200} placeholder="Efectivo / transferencia / referencia" /></label><label>MXN por apertura del nuevo periodo<input name="rate" type="number" min={0} max={1000} step="0.01" required defaultValue={period.rate_cents / 100} /></label><button disabled={busy}>Pago recibido · activar 30 días</button></form></details>}
        <PeriodHistory business={b} />
      </article>;
    })}</div>
    {!businesses.length && <p className="managedEmpty">Registra tu primer negocio para generar su código y asignar sus tarjetas.</p>}
  </>;
}
