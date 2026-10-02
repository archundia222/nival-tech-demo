import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUSINESS_COOKIE, businessSecretHash } from '@/lib/business-code';
import { jsonResponse, sameOrigin } from '@/lib/managed-http';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonResponse({ error: 'Solicitud inválida.' }, 403);
  const token = (await cookies()).get(BUSINESS_COOKIE)?.value;
  if (token) await createAdminClient().from('nival_business_sessions').delete().eq('token_hash', businessSecretHash(token, 'session'));
  const response = jsonResponse({ ok: true });
  response.cookies.set(BUSINESS_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}
