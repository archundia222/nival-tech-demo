interface SessionStore { getItem(key: string): string | null; setItem(key: string, value: string): void; }
export interface PayVisitSession { sessionId: string; visit?: string; }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Tab-scoped storage persists across reloads and restored tabs, without identifying a person.
export function getPayVisitSession(token: string, entryVisit: string | undefined, storage: SessionStore, newId: () => string): PayVisitSession | null {
  const key = `nival-pay-session:${token}`;
  if (entryVisit) {
    const sessionId = entryVisit.split('.')[0];
    if (!UUID.test(sessionId)) return null;
    const session = { sessionId, visit: entryVisit };
    try { storage.setItem(key, JSON.stringify(session)); } catch { /* The URL still retains this session. */ }
    return session;
  }
  try {
    const saved = storage.getItem(key);
    if (saved) {
      const session = JSON.parse(saved) as PayVisitSession;
      if (UUID.test(session.sessionId) && (!session.visit || typeof session.visit === 'string')) return session;
    }
    const session = { sessionId: newId() };
    storage.setItem(key, JSON.stringify(session));
    return session;
  } catch {
    // Missing storage must undercount rather than manufacture visits on every reload.
    return null;
  }
}
