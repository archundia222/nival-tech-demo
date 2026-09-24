'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function PaymentStatusPoller({
  active,
  intervalMs = 2000,
  attempts = 8,
}: {
  active: boolean;
  intervalMs?: number;
  attempts?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      router.refresh();
      if (count >= attempts) window.clearInterval(timer);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [active, attempts, intervalMs, router]);

  return null;
}
