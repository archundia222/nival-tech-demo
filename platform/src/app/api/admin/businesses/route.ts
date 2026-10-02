import { createAdminClient } from '@/lib/supabase/admin';
import { getManagedAdmin, managedBusinesses } from '@/lib/managed-business';
import { newBusinessCode, normalizeBusinessCode, businessSecretHash } from '@/lib/business-code';
import { PROFILE_UUID } from '@/lib/pay-visit';
import { jsonResponse, sameOrigin, smallBody } from '@/lib/managed-http';

export async function GET() {
  if (!await getManagedAdmin()) return jsonResponse({ error: 'Acceso restringido.' }, 401);
  return jsonResponse({ businesses: await managedBusinesses() });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonResponse({ error: 'Solicitud inválida.' }, 403);
  const user = await getManagedAdmin();
  if (!user) return jsonResponse({ error: 'Acceso restringido.' }, 401);
  const body = await smallBody(request);
  const action = String(body?.action ?? '');
  if (!body || !['create','add','remove','restore','rotate','suspend','resume','settle'].includes(action)) return jsonResponse({ error: 'Acción inválida.' }, 400);
  const businessId = String(body.businessId ?? '');
  if (action !== 'create' && !PROFILE_UUID.test(businessId)) return jsonResponse({ error: 'Negocio inválido.' }, 400);
  const quantity = Number(body.quantity ?? 1);
  const rateCents = Math.round(Number(body.rate ?? 1) * 100);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100 || !Number.isFinite(rateCents) || rateCents < 0 || rateCents > 100000) return jsonResponse({ error: 'Revisa la cantidad y la tarifa.' }, 400);
  const name = String(body.name ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  if (action === 'create' && (name.length < 2 || name.length > 120 || phone.length > 30)) return jsonResponse({ error: 'Revisa los datos del negocio.' }, 400);
  const profileId = String(body.profileId ?? '');
  const periodId = String(body.periodId ?? '');
  if (['remove','restore'].includes(action) && !PROFILE_UUID.test(profileId) || action === 'settle' && !PROFILE_UUID.test(periodId)) return jsonResponse({ error: 'Referencia inválida.' }, 400);
  const code = ['create','rotate'].includes(action) ? newBusinessCode() : null;
  const { data, error } = await createAdminClient().rpc('nival_manage_business', {
    p_action: action, p_actor: user.id, p_business: businessId || null, p_name: name || null, p_phone: phone || null,
    p_code_hash: code ? businessSecretHash(normalizeBusinessCode(code), 'code') : null, p_quantity: quantity,
    p_profile: profileId || null, p_period: periodId || null, p_reference: String(body.reference ?? '').trim().slice(0,200) || null, p_rate_cents: rateCents,
  });
  if (error) {
    console.error('[managed-business] command failed', { action, code: error.code });
    return jsonResponse({ error: action === 'settle' ? 'No se registró el pago. Actualiza el panel para revisar si el periodo ya fue cerrado.' : 'No se pudo completar el cambio.' }, 409);
  }
  return jsonResponse({ ok: true, businessId: data.business_id, code });
}
