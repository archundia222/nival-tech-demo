'use client';

import { useFormStatus } from 'react-dom';

export function FreePaySubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="loginLink" type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? 'Creando tu Nival Pay…' : 'Crear mi Nival Pay Gratis →'}
    </button>
  );
}
