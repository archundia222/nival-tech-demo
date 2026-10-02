'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CodeLogin() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <form className="managedForm" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError('');
    const code = String(new FormData(e.currentTarget).get('code') ?? '');
    try {
      const response = await fetch('/api/business/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error); return; }
      router.replace('/negocio/panel'); router.refresh();
    } catch { setError('No pudimos conectar. Intenta nuevamente.'); }
    finally { setBusy(false); }
  }}><label>Tu código<input name="code" type="password" autoComplete="current-password" required maxLength={100} placeholder="Código de acceso" spellCheck={false} /></label>
    {error && <p role="alert" className="managedError">{error}</p>}<button disabled={busy}>{busy ? 'Entrando…' : 'Entrar a mi negocio'}</button></form>;
}
