'use client';
import { useState } from 'react';
import { CustomerShare } from '@/app/customer-share';
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
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
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
    {issuedCode && <section className="managedCodeBox" role="status"><div><span className="managedEyebrow">CÓDIGO PRIVADO · {issuedCode.name}</span><h2>Entrégalo únicamente al negocio</h2><code>{issuedCode.code}</code><p>Entrará en {siteUrl}/negocio. Guarda el código. Puedes reemplazarlo si el negocio lo pierde.</p></div><div><button disabled={busy} onClick={async () => { try { await navigator.clipboard.writeText(issuedCode.code); setMessage('Código copiado.'); setError(false); } catch { setMessage('Selecciona el código para copiarlo.'); setError(true); } }}>Copiar código</button><button className="managedOutline" onClick={() => setIssuedCode(null)}>Ya lo guardé</button></div></section>}
    <details className="managedCreate" open={!businesses.length}><summary>Agregar negocio</summary><form className="managedForm managedCreateForm" onSubmit={e => {
      e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); void command({ ...values, action: 'create' });
    }}><label>Nombre del negocio<input name="name" placeholder="Ej. Barbería Central" autoComplete="organization" required minLength={2} maxLength={120} /></label><label>Número de contacto<input name="phone" type="tel" inputMode="tel" placeholder="Ej. 55 1234 5678" autoComplete="tel" required minLength={8} maxLength={30} /></label><label>Cantidad de tarjetas<input name="quantity" type="number" inputMode="numeric" min={1} max={100} step={1} defaultValue={1} required /></label><label>MXN por apertura<input name="rate" type="number" inputMode="decimal" min={0} max={1000} step="0.01" defaultValue={1} required /></label><button disabled={busy}>{busy ? 'Guardando…' : 'Crear negocio y código'}</button><p>El negocio configura sus datos bancarios. Cada tarjeta cuesta $20 e incluye sus primeras 5 aperturas. Su primer periodo de 30 días comienza al registrarlo.</p></form></details>
    <section className="managedSectionHead"><h2>Negocios</h2><label className="managedSearch">Buscar<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre del negocio" /></label></section>
    <div className="managedBusinessList">{businesses.filter(b => b.name.toLowerCase().includes(query.toLowerCase())).map(b => {
      const period = b.periods.find(p => !p.paid_at);
      const enabled = activeBusinessIds.includes(b.id);
      return <article className="managedBusiness" key={b.id}><header><div><h2>{b.name}</h2><p>{b.phone || 'Sin teléfono'} · {b.cards.filter(c => !c.managed_removed_at).length} tarjetas</p></div><span className={`managedStatus ${enabled ? '' : 'paused'}`}>{enabled ? 'Activo' : 'Suspendido'}</span></header>
        <div className="managedAccessCode"><span>Código único de acceso</span>{b.access_code ? <div className="managedAccessCodeRow"><code>{visibleCodes[b.id] ? b.access_code : '••••-••••-••••-••••-••••-••••-••••-••••'}</code><button type="button" className="managedOutline" aria-label={visibleCodes[b.id] ? 'Ocultar código' : 'Mostrar código'} onClick={() => setVisibleCodes(current => ({ ...current, [b.id]: !current[b.id] }))}>{visibleCodes[b.id] ? 'Ocultar' : 'Ver'}</button><button type="button" className="managedOutline" onClick={async () => { try { await navigator.clipboard.writeText(b.access_code!); setMessage('Código copiado.'); setError(false); } catch { setMessage('No se pudo copiar el código.'); setError(true); } }}>Copiar</button></div> : <div className="managedAccessCodeRow"><code>••••-••••-••••-••••-••••-••••-••••-••••</code><button type="button" className="managedOutline" disabled={busy} onClick={() => void command({ action: 'rotate', businessId: b.id }, b.name)}>Generar código visible</button></div>}</div>
        <PeriodSummary period={period} />
        <details className="managedBusinessDetails"><summary>Tarjetas y administración</summary><div className="managedAdminCards">{b.cards.map(c => <div className={`managedAdminCard ${c.managed_removed_at ? 'removed' : ''}`} key={c.id}><section><strong>{c.display_name}</strong><span>{c.managed_removed_at ? 'Retirada' : c.managed_ready ? 'Configurada' : 'Pendiente de datos bancarios'}</span><small>{c.period_views} aperturas este periodo · {c.view_count} acumuladas · {c.included_views_remaining ?? 0} incluidas restantes</small><code>{siteUrl}/tap/{c.public_token}</code>{c.managed_ready && !c.managed_removed_at && <a href={`/pay/${c.public_token}`} target="_blank" rel="noreferrer">Ver página</a>}{enabled && c.managed_ready && c.active && !c.managed_removed_at && <CustomerShare cardId={c.id} />}</section><button className="managedOutline" disabled={busy} onClick={() => void command({ action: c.managed_removed_at ? 'restore' : 'remove', businessId: b.id, profileId: c.id })}>{c.managed_removed_at ? 'Restaurar tarjeta' : 'Retirar tarjeta'}</button></div>)}</div>
          <div className="managedAdminOperations"><form className="managedForm" onSubmit={e => { e.preventDefault(); const form=e.currentTarget; const values=Object.fromEntries(new FormData(form)); const quantity=Number(values.quantity); if (!window.confirm(`Confirma que ya recibiste ${quantity*20} MXN por ${quantity} tarjeta(s). Cada tarjeta nueva incluye 5 aperturas iniciales.`)) return; void command({ ...values, action:'add', businessId:b.id, cardPaymentConfirmed:true }); }}><label>Agregar tarjetas ya pagadas<input name="quantity" type="number" min={1} max={100} defaultValue={1} required /></label><p>$20 MXN por tarjeta. Confirma el pago antes de darla de alta.</p><button disabled={busy}>Confirmar pago y agregar</button></form><div className="managedOperationButtons"><details><summary>Opciones administrativas</summary><p>La falta de pago no requiere suspensión manual: al vencer el periodo, las tarjetas dejan de aceptar aperturas hasta registrar el pago del corte.</p><button className="managedOutline" disabled={busy} onClick={() => void command({ action: b.suspended ? 'resume' : 'suspend', businessId: b.id })}>{b.suspended ? 'Reactivar manualmente' : 'Suspender manualmente'}</button></details><details><summary>Reemplazar código de acceso</summary><p>El código anterior dejará de funcionar y se cerrarán las sesiones del negocio.</p><button className="managedOutline" disabled={busy} onClick={() => void command({ action: 'rotate', businessId: b.id }, b.name)}>Generar nuevo código</button></details></div></div>
        </details>
        {period && <details className="managedSettle"><summary>${Date.parse(period.ends_at) <= Date.now() ? 'Corte vencido · registrar pago' : 'Próximo corte · registrar pago cuando corresponda'}</summary><p>Este pago corresponde al consumo del negocio. Al confirmarlo se cierra el corte actual y comienza un nuevo periodo de 30 días. Las 5 aperturas incluidas de cada tarjeta no se reinician.</p><form className="managedForm managedSettleForm" onSubmit={e => { e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); if (window.confirm('¿Ya recibiste este pago? Se cerrará el periodo y se activarán 30 días nuevos.')) void command({ ...values, action: 'settle', businessId: b.id, periodId: period.id }); }}><label>Referencia o nota (opcional)<input name="reference" maxLength={200} placeholder="Efectivo / transferencia / referencia" /></label><label>MXN por apertura del nuevo periodo<input name="rate" type="number" min={0} max={1000} step="0.01" required defaultValue={period.rate_cents / 100} /></label><button disabled={busy}>Pago recibido · activar 30 días</button></form></details>}
        <PeriodHistory business={b} />
      </article>;
    })}</div>
    {!businesses.length && <p className="managedEmpty">Agrega tu primer negocio. El sistema genera su código de acceso.</p>}
  </>;
}
