import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBusinessSession, getManagedAdmin, isBusinessActive, managedBusinesses } from '@/lib/managed-business';
import { PROFILE_UUID, signVisit } from '@/lib/pay-visit';
import { jsonResponse, sameOrigin } from '@/lib/managed-http';

// Issuing a link does not record a visit. Its first visible opening can count once.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonResponse({ error: 'Solicitud inválida.' }, 403);
  const { id } = await params;
  if (!PROFILE_UUID.test(id)) return jsonResponse({ error: 'Tarjeta inválida.' }, 400);
  const session = await getBusinessSession();
  const user = session ? null : await getManagedAdmin();
  if (!session && !user) return jsonResponse({ error: 'Entra a tu panel para compartir una tarjeta.' }, 401);
  const admin = createAdminClient();
  const { data: card, error } = await admin.from('payment_profiles').select('business_id,public_token').eq('id',id).eq('active',true).eq('managed_ready',true).is('managed_removed_at',null).maybeSingle();
  if (error) return jsonResponse({ error: 'Intenta nuevamente.' }, 503);
  if (!card) return jsonResponse({ error: 'Tarjeta no disponible.' }, 404);
  if (session) {
    if (session.business_id !== card.business_id) return jsonResponse({ error: 'Tarjeta no disponible.' }, 404);
  } else if (user?.app_metadata.nival_admin !== true) {
    const { data: owned, error: ownershipError } = await admin.from('nival_managed_businesses').select('business_id').eq('business_id',card.business_id).eq('created_by',user!.id).maybeSingle();
    if (ownershipError) return jsonResponse({ error: 'Intenta nuevamente.' }, 503);
    if (!owned) return jsonResponse({ error: 'Tarjeta no disponible.' }, 404);
  }
  const [business] = await managedBusinesses(card.business_id);
  if (!business || !isBusinessActive(business)) return jsonResponse({ error: 'El servicio de esta tarjeta está suspendido.' }, 409);
  const url = new URL(`/pay/${card.public_token}`,request.url);
  url.searchParams.set('visit',signVisit(card.public_token,randomUUID(),'card'));
  return jsonResponse({ ok: true, url: url.toString() });
}
