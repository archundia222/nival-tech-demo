'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ProfileRegistrationForm() {
  const router = useRouter();
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  return <form className="managedForm" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError('');
    const body = Object.fromEntries(new FormData(e.currentTarget));
    if (body.password !== body.confirmPassword) { setError('Las contraseñas no coinciden.'); setBusy(false); return; }
    try {
      const response = await fetch('/api/account/register',{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { setError(result.error); return; }
      router.replace(result.next); router.refresh();
    } catch { setError('No pudimos conectar. Si tu cuenta se creó, intenta iniciar sesión con tus datos.'); }
    finally { setBusy(false); }
  }}><label>Tu nombre<input name="name" autoComplete="name" required minLength={2} maxLength={120}/></label><label>Correo<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>Contraseña<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label><label>Repite tu contraseña<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label><label><span><input type="checkbox" name="terms" required style={{width:'auto',marginRight:8}}/>Acepto los <Link href="/terms">términos</Link> y el <Link href="/privacy">aviso de privacidad</Link>.</span></label>{error&&<p className="managedError" role="alert">{error}</p>}<button disabled={busy}>{busy?'Creando cuenta…':'Crear mi perfil'}</button></form>;
}
