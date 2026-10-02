import { createHmac, randomBytes } from 'node:crypto';

export const BUSINESS_COOKIE = 'nival-business';
export const CODE_PATTERN = /^[A-F0-9]{32}$/;
export function normalizeBusinessCode(code: string) { return code.replace(/[\s-]/g, '').toUpperCase(); }
export function newBusinessCode() { return randomBytes(16).toString('hex').toUpperCase().match(/.{1,4}/g)!.join('-'); }
export function newBusinessSession() { return randomBytes(32).toString('hex'); }
export function businessSecretHash(value: string, purpose: 'code' | 'session' | 'attempt', secret = process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (!secret) throw new Error('Server credentials are not configured');
  return createHmac('sha256', secret).update(`nival-business:${purpose}:${value}`).digest('hex');
}
