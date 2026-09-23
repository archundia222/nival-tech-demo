'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fintelligence');

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'manager'])
    .limit(1)
    .maybeSingle();

  if (!membership) redirect('/dashboard/intelligence?error=No+tienes+permiso+para+administrar+Intelligence.');
  return { supabase, user, businessId: membership.business_id };
}

async function requireIntelligencePro(supabase: Awaited<ReturnType<typeof createClient>>, businessId: string) {
  const { data: entitlement } = await supabase.from('business_product_entitlements')
    .select('status')
    .eq('business_id', businessId)
    .eq('product_code', 'nival_intelligence')
    .maybeSingle();
  const { data: business } = await supabase.from('businesses').select('product_level').eq('id', businessId).maybeSingle();
  if (entitlement?.status !== 'active' && business?.product_level !== 'intelligence') {
    redirect('/dashboard/intelligence?error=Esta+acción+requiere+Intelligence+Pro.');
  }
}

export async function startIntelligenceCampaign(formData: FormData) {
  const { supabase, user, businessId } = await getContext();
  await requireIntelligencePro(supabase, businessId);
  const rawIds = String(formData.get('customerIds') ?? '[]');
  const segment = String(formData.get('segment') ?? 'segmento').trim().slice(0, 60);
  const message = String(formData.get('message') ?? '').trim().slice(0, 1200);
  const campaignName = String(formData.get('campaignName') ?? 'Campaña recomendada por Nival').trim().slice(0, 100);

  let customerIds: string[] = [];
  try {
    const parsed = JSON.parse(rawIds);
    if (Array.isArray(parsed)) customerIds = [...new Set(parsed.map(String))].slice(0, 150);
  } catch {
    redirect('/dashboard/intelligence?view=campaigns&error=No+pudimos+preparar+la+audiencia.');
  }

  if (!customerIds.length || !message) {
    redirect('/dashboard/intelligence?view=campaigns&error=La+campaña+necesita+clientes+y+un+mensaje.');
  }

  const { data: allowedCustomers, error: customersError } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', businessId)
    .in('id', customerIds)
    .not('marketing_consent_at', 'is', null);

  if (customersError) redirect('/dashboard/intelligence?view=campaigns&error=No+pudimos+validar+la+audiencia.');

  const allowedIds = (allowedCustomers ?? []).map((customer) => customer.id);
  if (!allowedIds.length) {
    redirect('/dashboard/intelligence?view=campaigns&error=No+hay+clientes+con+consentimiento+para+esta+campaña.');
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from('campaigns').insert({
    business_id: businessId,
    name: campaignName,
    message,
    status: 'sent',
    approved_by: user.id,
    approved_at: now,
    sent_at: now,
    audience_rule: {
      source: 'nival_intelligence',
      segment,
      customer_ids: allowedIds,
      tracking_window_days: 30,
      created_from: 'recommended_action',
    },
  });

  if (error) {
    console.error('[intelligence] Campaign tracking insert failed', { code: error.code });
    redirect('/dashboard/intelligence?view=campaigns&error=No+pudimos+iniciar+la+medición.');
  }

  revalidatePath('/dashboard/intelligence');
  redirect('/dashboard/intelligence?view=impact&campaign=started');
}

export async function saveAverageTicket(formData: FormData) {
  const { supabase, businessId } = await getContext();
  await requireIntelligencePro(supabase, businessId);
  const raw = String(formData.get('averageTicket') ?? '').replace(/[^0-9.]/g, '');
  const pesos = Number(raw);

  if (!Number.isFinite(pesos) || pesos <= 0 || pesos > 1_000_000) {
    redirect('/dashboard/intelligence?view=impact&error=Escribe+un+ticket+promedio+válido.');
  }

  const cents = Math.round(pesos * 100);
  const { error } = await supabase
    .from('businesses')
    .update({ average_ticket_cents: cents })
    .eq('id', businessId);

  if (error) {
    console.error('[intelligence] Average ticket save failed', { code: error.code });
    redirect('/dashboard/intelligence?view=impact&error=No+pudimos+guardar+el+ticket+promedio.');
  }

  revalidatePath('/dashboard/intelligence');
  redirect('/dashboard/intelligence?view=impact&ticket=saved');
}
