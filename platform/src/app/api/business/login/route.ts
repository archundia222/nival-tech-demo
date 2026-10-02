import { createAdminClient } from '@/lib/supabase/admin';
import { BUSINESS_COOKIE, CODE_PATTERN, normalizeBusinessCode, newBusinessSession, businessSecretHash } from '@/lib/business-code';
import { jsonResponse, sameOrigin, smallBody } from '@/lib/managed-http';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonResponse({ error: 'Solicitud inválida.' }, 403);
  const body = await smallBody(request);
  if (!body || typeof body.code !== 'string' || body.code.length > 100) return jsonResponse({ error: 'Escribe tu código.' }, 400);
  const code = normalizeBusinessCode(body.code);
  const admin = createAdminClient();
  const ip = (request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const keys = [businessSecretHash(ip, 'attempt'), businessSecretHash(code, 'attempt')];
  const attempts = await Promise.all(keys.map(p_key => admin.rpc('nival_consume_code_attempt', { p_key })));
  if (attempts.some(r => r.error)) return jsonResponse({ error: 'Intenta nuevamente en un momento.' }, 503);
  if (attempts.some(r => !r.data)) return jsonResponse({ error: 'Demasiados intentos. Espera 15 minutos.' }, 429);
  if (!CODE_PATTERN.test(code)) return jsonResponse({ error: 'Código incorrecto.' }, 401);
  const token = newBusinessSession();
  const expires = new Date(Date.now() + 7 * 86400000);
  const { data: business, error } = await admin.rpc('nival_open_business_session', { p_code_hash: businessSecretHash(code, 'code'), p_session_hash: businessSecretHash(token, 'session') });
  if (error) return jsonResponse({ error: 'Intenta nuevamente en un momento.' }, 503);
  if (!business) return jsonResponse({ error: 'Código incorrecto.' }, 401);
  const response = jsonResponse({ ok: true });
  response.cookies.set(BUSINESS_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires });
  return response;
}
