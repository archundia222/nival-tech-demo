import { createHmac, timingSafeEqual } from 'node:crypto';

export const VISIT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const PROFILE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type VisitSource = 'card' | 'direct';

function signature(token: string, sessionId: string, source: VisitSource, secret: string) {
  return createHmac('sha256', secret).update(`nival-pay-visit-v1:${token}:${sessionId}:${source}`).digest('hex');
}

function signingKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Visit signing key is not configured.');
  return key;
}

export function signVisit(token: string, sessionId: string, source: VisitSource, secret = signingKey()) {
  return `${sessionId}.${source}.${signature(token, sessionId, source, secret)}`;
}

export function verifyVisit(token: string, value: string, secret = signingKey()) {
  const [sessionId, source, mac, extra] = value.split('.');
  if (extra || !VISIT_UUID.test(sessionId ?? '') || !['card', 'direct'].includes(source) || !/^[a-f0-9]{64}$/.test(mac ?? '')) return null;
  const expected = signature(token, sessionId, source as VisitSource, secret);
  if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(mac, 'hex'))) return null;
  return { sessionId, source: source as VisitSource };
}

export function isAutomatedVisit(headers: Headers) {
  return /bot|crawler|spider|headless|preview|facebookexternalhit|whatsapp|telegram|slack/i.test(headers.get('user-agent') ?? '')
    || headers.has('next-router-prefetch')
    || /prefetch|prerender/i.test(`${headers.get('purpose') ?? ''} ${headers.get('sec-purpose') ?? ''}`);
}
