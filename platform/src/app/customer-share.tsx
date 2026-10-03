'use client';
import { useState } from 'react';

export function CustomerShare({ cardId }: { cardId: string }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <div><button className="managedOutline" disabled={busy} onClick={async () => {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/business/cards/${cardId}/share`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error); return; }
      setUrl(result.url); setMessage('Enlace listo. Crear el enlace no suma una apertura.');
    } catch { setMessage('No pudimos crear el enlace. Intenta nuevamente.'); }
    finally { setBusy(false); }
  }}>{busy ? 'Creando enlace…' : 'Crear enlace para un cliente'}</button><p>Un enlace por cliente. Recargas sin cobro extra.</p>{url && <><code style={{overflowWrap:'anywhere'}}>{url}</code><button className="managedOutline" onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage('Enlace copiado. Compártelo con tu cliente.'); } catch { setMessage('Selecciona el enlace para copiarlo.'); } }}>Copiar enlace para este cliente</button></>}{message && <p role="status">{message}</p>}</div>;
}
