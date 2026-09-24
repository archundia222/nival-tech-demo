'use client';

import { useFormStatus } from 'react-dom';

export function CheckoutSubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending} aria-live="polite">
      {pending ? pendingLabel : children}
    </button>
  );
}
