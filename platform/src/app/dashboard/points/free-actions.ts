'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveBusinessMembership } from '@/lib/active-business';

export async function activateFreeNivalPoints() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?mode=signup&next=%2Fdashboard%2Fpoints');

  const membership = await getActiveBusinessMembership(user.id);
  if (!membership || !['owner', 'manager'].includes(membership.role)) redirect('/dashboard/points?error=No+tienes+permiso+para+activar+el+programa.');

  const admin = createAdminClient();
  const { data: existing } = await admin.from('business_product_entitlements')
    .select('status')
    .eq('business_id', membership.business_id)
    .eq('product_code', 'nival_points')
    .maybeSingle();

  if (existing?.status !== 'active') {
    const { error: entitlementError } = await admin.from('business_product_entitlements').upsert({
      business_id: membership.business_id,
      product_code: 'nival_points',
      status: 'free',
      current_period_end: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,product_code' });

    if (entitlementError) {
      console.error('[points-free] entitlement failed', { code: entitlementError.code });
      redirect('/dashboard/points?error=No+pudimos+activar+Nival+Puntos+Gratis.');
    }
  }

  const { data: program } = await admin.from('loyalty_programs')
    .select('id')
    .eq('business_id', membership.business_id)
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  if (!program) {
    const { error: programError } = await admin.from('loyalty_programs').insert({
      business_id: membership.business_id,
      name: 'Mi programa de puntos',
      points_per_visit: 1,
      reward_threshold: 5,
      reward_description: 'Recompensa del negocio',
      point_cooldown_minutes: 60,
      daily_points_cap: 1,
      active: true,
    });
    if (programError) {
      console.error('[points-free] default program failed', { code: programError.code });
      redirect('/dashboard/points?error=Activamos+el+plan+pero+no+pudimos+crear+el+programa.');
    }
  }

  revalidatePath('/dashboard/points');
  revalidatePath('/dashboard');
  redirect('/dashboard/points?free=started');
}
