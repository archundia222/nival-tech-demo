import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

export const BUSINESS_COOKIE = 'nival-business';
export const CODE_PATTERN = /^[A-F0-9]{32}$/;
export function normalizeBusinessCode(code: string) { return code.replace(/[\s-]/g, '').toUpperCase(); }
export function newBusinessCode() { return randomBytes(16).toString('hex').toUpperCase().match(/.{1,4}/g)!.join('-'); }
export function newBusinessSession() { return randomBytes(32).toString('hex'); }
export function businessSecretHash(value: string, purpose: 'code' | 'session' | 'attempt', secret = process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (!secret) throw new Error('Server credentials are not configured');
  return createHmac('sha256', secret).update(`nival-business:${purpose}:${value}`).digest('hex');
}

function codeEncryptionKey(secret = process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (!secret) throw new Error('Server credentials are not configured');
  return createHash('sha256').update(`nival-business:admin-code:${secret}`).digest();
}
export function encryptBusinessCode(code: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', codeEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(value => value.toString('base64url')).join('.');
}
export function decryptBusinessCode(value: string | null | undefined) {
  if (!value) return null;
  try {
    const [ivRaw, tagRaw, encryptedRaw] = value.split('.');
    if (!ivRaw || !tagRaw || !encryptedRaw) return null;
    const decipher = createDecipheriv('aes-256-gcm', codeEncryptionKey(), Buffer.from(ivRaw, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, 'base64url')), decipher.final()]).toString('utf8');
  } catch { return null; }
}
