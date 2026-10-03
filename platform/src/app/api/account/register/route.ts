import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { businessSecretHash } from '@/lib/business-code';
import { jsonResponse, sameOrigin, smallBody } from '@/lib/managed-http';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonResponse({ error: 'Solicitud inválida.' }, 403);
  const body = await smallBody(request);
  if (!body || body.terms !== 'on') return jsonResponse({ error: 'Acepta los términos para continuar.' }, 400);
  const email = String(body.email ?? '').trim().toLowerCase();
  const name = String(body.name ?? '').trim();
  const password = typeof body.password === 'string' ? body.password : '';
  if (name.length < 2 || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128 || password !== body.confirmPassword) return jsonResponse({ error: 'Revisa tu nombre, correo y ambas contraseñas. Usa al menos 12 caracteres.' }, 400);
  const ip = (request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const { data: allowed, error: rateError } = await createAdminClient().rpc('nival_consume_code_attempt', { p_key: businessSecretHash(`profile-register:${ip}`, 'attempt') });
  if (rateError) return jsonResponse({ error: 'Intenta nuevamente en un momento.' }, 503);
  if (!allowed) return jsonResponse({ error: 'Demasiados intentos. Espera 15 minutos.' }, 429);
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) {
    const duplicate = /already|registered|exists/i.test(error.message);
    return jsonResponse({ error: duplicate ? 'Ese correo ya tiene una cuenta. Inicia sesión.' : 'No pudimos crear tu cuenta. Revisa tus datos e inténtalo nuevamente.' }, duplicate ? 409 : 400);
  }
  if (!data.user) return jsonResponse({ error: 'No pudimos crear tu cuenta.' }, 500);
  const server = await createClient();
  const { data: signedIn, error: signInError } = await server.auth.signInWithPassword({ email, password });
  if (signInError || !signedIn.session) return jsonResponse({ ok: true, next: '/auth?next=%2Fdashboard&message=Cuenta creada. Inicia sesión para continuar.' });
  return jsonResponse({ ok: true, next: '/dashboard' });
}
