import { createAdminClient } from '@/lib/supabase/admin';
import { getManagedAdmin, workspaceBusinesses } from '@/lib/managed-business';
import { newBusinessCode, normalizeBusinessCode, businessSecretHash, encryptBusinessCode } from '@/lib/business-code';
import { PROFILE_UUID } from '@/lib/pay-visit';
import { jsonResponse, sameOrigin, smallBody } from '@/lib/managed-http';

export async function GET() {
  const user = await getManagedAdmin();
  if (!user) return jsonResponse({ error: 'Acceso restringido.' }, 401);
  return jsonResponse({ businesses: await workspaceBusinesses(user) });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonResponse({ error: 'Solicitud inválida.' }, 403);
  const user = await getManagedAdmin();
  if (!user) return jsonResponse({ error: 'Acceso restringido.' }, 401);
  const body = await smallBody(request);
  const action = String(body?.action ?? '');
  if (!body || !['create','add','remove','restore','rotate','suspend','resume'].includes(action)) return jsonResponse({ error: 'Acción inválida.' }, 400);
  const businessId = String(body.businessId ?? '');
  if (action !== 'create' && !PROFILE_UUID.test(businessId)) return jsonResponse({ error: 'Negocio inválido.' }, 400);
  if (action !== 'create' && user.app_metadata.nival_admin !== true) {
    const { data: owned, error } = await createAdminClient().from('nival_managed_businesses').select('business_id').eq('business_id', businessId).eq('created_by', user.id).maybeSingle();
    if (error) return jsonResponse({ error: 'No se pudo verificar el acceso.' }, 503);
    if (!owned) return jsonResponse({ error: 'Negocio no disponible.' }, 404);
  }
  const quantity = Number(body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) return jsonResponse({ error: 'Revisa la cantidad.' }, 400);
  const name = String(body.name ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const phoneDigits = phone.replace(/\D/g, '');
  if (action === 'create' && (name.length < 2 || name.length > 120 || phone.length > 30 || phoneDigits.length < 8 || phoneDigits.length > 15)) return jsonResponse({ error: 'Ingresa nombre, número de contacto válido y cantidad de Nival Pay.' }, 400);
  const profileId = String(body.profileId ?? '');
  if (['remove','restore'].includes(action) && !PROFILE_UUID.test(profileId)) return jsonResponse({ error: 'Referencia inválida.' }, 400);
  const code = ['create','rotate'].includes(action) ? newBusinessCode() : null;
  if (action === 'add' && body.cardPaymentConfirmed !== true) return jsonResponse({ error: 'Confirma que el Nival Pay ya fue pagado antes de agregarlo.' }, 400);
  const { data, error } = await createAdminClient().rpc('nival_manage_business', {
    p_action: action, p_actor: user.id, p_business: businessId || null, p_name: name || null, p_phone: phone || null,
    p_code_hash: code ? businessSecretHash(normalizeBusinessCode(code), 'code') : null, p_quantity: quantity,
    p_profile: profileId || null, p_period: null, p_reference: null, p_rate_cents: 0,
  });
  if (!error && code && data?.business_id) {
    const { error: codeStoreError } = await createAdminClient().from('nival_managed_businesses').update({ code_ciphertext: encryptBusinessCode(code) }).eq('business_id', data.business_id);
    if (codeStoreError) return jsonResponse({ error: 'El negocio se guardó, pero no se pudo guardar el código visible. Genera uno nuevo antes de entregarlo.' }, 503);
  }
  if (error) return jsonResponse({ error: 'No se pudo completar el cambio.' }, 409);
  return jsonResponse({ ok: true, businessId: data.business_id, code });
}
