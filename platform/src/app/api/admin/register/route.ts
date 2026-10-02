import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { CODE_PATTERN, normalizeBusinessCode, businessSecretHash } from '@/lib/business-code';
import { jsonResponse, sameOrigin, smallBody } from '@/lib/managed-http';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonResponse({ error: 'Solicitud inválida.' }, 403);
  const body = await smallBody(request);
  if (!body || body.terms !== 'on') return jsonResponse({ error: 'Revisa los campos y acepta los términos.' }, 400);
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const name = String(body.name ?? '').trim();
  const rawCode = String(body.code ?? '');
  if (name.length < 2 || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128 || rawCode.length > 100) return jsonResponse({ error: 'Completa tu nombre, un correo válido y una contraseña de al menos 12 caracteres.' }, 400);
  const admin = createAdminClient();
  const ip = (request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const { data: allowed, error: rateError } = await admin.rpc('nival_consume_code_attempt', { p_key: businessSecretHash(`admin-register:${ip}`, 'attempt') });
  if (rateError) return jsonResponse({ error: 'Intenta nuevamente en un momento.' }, 503);
  if (!allowed) return jsonResponse({ error: 'Demasiados intentos. Espera 15 minutos.' }, 429);
  const code = normalizeBusinessCode(rawCode);
  if (!CODE_PATTERN.test(code)) return jsonResponse({ error: 'Código de registro incorrecto o vencido.' }, 401);
  const hash = createHash('sha256').update(code).digest('hex');
  const { data: claim, error: claimError } = await admin.rpc('nival_claim_admin_registration', { p_code_hash: hash });
  if (claimError) return jsonResponse({ error: 'Intenta nuevamente en un momento.' }, 503);
  if (!claim) return jsonResponse({ error: 'Código de registro incorrecto, utilizado o vencido.' }, 401);
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name }, app_metadata: { nival_admin: true } });
  if (error || !created.user) {
    await admin.from('nival_admin_registration_codes').update({ claim_id: null, claimed_at: null }).eq('code_hash',hash).eq('claim_id',claim).is('used_at',null);
    return jsonResponse({ error: 'No pudimos crear la cuenta. Revisa el correo y la contraseña; si el correo ya tiene cuenta, inicia sesión.' }, 409);
  }
  const { error: consumedError } = await admin.from('nival_admin_registration_codes').update({ used_at: new Date().toISOString() }).eq('code_hash',hash).eq('claim_id',claim);
  if (consumedError) console.error('[admin-register] Could not finalize invitation', { code: consumedError.code });
  const supabase = await createClient();
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  return jsonResponse({ ok: true, next: loginError ? '/auth?next=%2Fadmin%2Fnegocios&message=Cuenta+creada.+Inicia+sesión+con+tus+datos.' : '/admin/negocios' });
}
