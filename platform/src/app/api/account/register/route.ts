import { createClient as signupClient } from '@supabase/supabase-js';
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
  const client = signupClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const origin = new URL(request.url).origin;
  const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: `${origin}/auth/complete-signup?next=%2Fdashboard` } });
  if (error) {
    const limited = /rate limit|security purposes/i.test(error.message) || error.code === 'over_email_send_rate_limit';
    return jsonResponse({ error: limited ? 'El servicio de correo alcanzó su límite temporal. Espera unos minutos y vuelve a intentar.' : 'No pudimos crear tu cuenta. Revisa tus datos o inicia sesión si ya tienes una.' }, limited ? 429 : 400);
  }
  if (data.session) {
    const server = await createClient();
    const { error: sessionError } = await server.auth.setSession(data.session);
    return jsonResponse({ ok: true, next: sessionError ? '/auth' : '/dashboard' });
  }
  const message = data.user?.identities?.length === 0 ? 'Si ya tienes cuenta, inicia sesión. Si falta confirmar tu correo, usa Reenviar confirmación.' : `Revisa ${email} y la carpeta de spam para confirmar tu cuenta. Después podrás entrar a tu panel.`;
  return jsonResponse({ ok: true, next: `/auth?next=%2Fdashboard&message=${encodeURIComponent(message)}` });
}
