'use client';

import { useEffect } from 'react';
import { getPayVisitSession } from '@/lib/pay-visit-session';

export function VisitTracker({ token, entryVisit }: { token: string; entryVisit?: string }) {
  useEffect(() => {
    let started = false;
    const record = () => {
      if (started || document.visibilityState !== 'visible') return;
      started = true;
      // The same ID is stored before fetch, including during React remounts or retries.
      const storage = {
        getItem: (key: string) => window.sessionStorage.getItem(key),
        setItem: (key: string, value: string) => window.sessionStorage.setItem(key, value),
      };
      const session = getPayVisitSession(token, entryVisit, storage, () => crypto.randomUUID());
      if (!session) return;
      void fetch(`/api/public/pay/${token}/visit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session), credentials: 'same-origin', keepalive: true,
      }).catch(() => { /* Metrics must never prevent a customer from paying. */ });
    };
    record();
    document.addEventListener('visibilitychange', record);
    return () => document.removeEventListener('visibilitychange', record);
  }, [token, entryVisit]);
  return null;
}
