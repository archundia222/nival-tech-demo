import { createAdminClient } from '@/lib/supabase/admin';
import { getBusinessSession } from '@/lib/managed-business';
import { jsonResponse, sameOrigin, smallBody } from '@/lib/managed-http';
import { isValidClabe } from '@/lib/payment-profile';
import { PROFILE_UUID } from '@/lib/pay-visit';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonResponse({ error: 'Solicitud inválida.' }, 403);
  const session = await getBusinessSession();
  if (!session) return jsonResponse({ error: 'Entra nuevamente con tu código.' }, 401);
  const { id } = await params;
  const body = await smallBody(request);
  if (!body || !PROFILE_UUID.test(id)) return jsonResponse({ error: 'Tarjeta inválida.' }, 400);
  const displayName = String(body.displayName ?? '').trim();
  const holder = String(body.holder ?? '').trim();
  const bank = String(body.bank ?? '').trim();
  const clabe = String(body.clabe ?? '').replace(/\s/g, '');
  const concept = String(body.concept ?? '').trim();
  if (displayName.length < 2 || displayName.length > 80 || holder.length < 2 || holder.length > 120 || bank.length < 2 || bank.length > 80 || concept.length > 120 || !isValidClabe(clabe)) return jsonResponse({ error: 'Revisa los campos y los 18 dígitos de tu CLABE.' }, 400);
  const { data, error } = await createAdminClient().from('payment_profiles').update({ display_name: displayName, account_holder: holder, bank_name: bank, clabe, concept: concept || null, managed_ready: true, active: true, updated_at: new Date().toISOString() })
    .eq('id', id).eq('business_id', session.business_id).is('managed_removed_at', null).select('id').maybeSingle();
  if (error) return jsonResponse({ error: 'No pudimos guardar la tarjeta.' }, 503);
  if (!data) return jsonResponse({ error: 'Tarjeta no disponible.' }, 404);
  return jsonResponse({ ok: true });
}
