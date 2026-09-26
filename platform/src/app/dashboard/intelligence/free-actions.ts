'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { trialEndsAt } from '@/lib/commercial';

export async function activateFreeNivalIntelligence() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?mode=signup&next=%2Fdashboard%2Fintelligence');

  const membership = await getActiveBusinessMembership(user.id);
  if (!membership || !['owner', 'manager'].includes(membership.role)) redirect('/dashboard/intelligence?error=No+tienes+permiso+para+activar+Growth.');

  const admin = createAdminClient();
  const { data: points } = await admin.from('business_product_entitlements')
    .select('status')
    .eq('business_id', membership.business_id)
    .eq('product_code', 'nival_points')
    .maybeSingle();

  if (!points || !['free', 'active'].includes(points.status)) {
    redirect('/dashboard/intelligence?error=Activa+Nival+Puntos+primero.+Intelligence+usa+los+clientes+y+visitas+de+tu+programa.');
  }

  const { data: existing } = await admin.from('business_product_entitlements')
    .select('status,current_period_end')
    .eq('business_id', membership.business_id)
    .eq('product_code', 'nival_intelligence')
    .maybeSingle();

  if (existing?.status !== 'active' && (!existing || !existing.current_period_end)) {
    const growthTrialEnd = trialEndsAt();
    const entitlementRows = [{
      business_id: membership.business_id,
      product_code: 'nival_intelligence',
      status: 'free',
      current_period_end: growthTrialEnd,
      updated_at: new Date().toISOString(),
    }];
    if (points.status !== 'active') {
      entitlementRows.push({
        business_id: membership.business_id,
        product_code: 'nival_points',
        status: 'free',
        current_period_end: growthTrialEnd,
        updated_at: new Date().toISOString(),
      });
    }
    const { error } = await admin.from('business_product_entitlements').upsert(
      entitlementRows,
      { onConflict: 'business_id,product_code' },
    );
    if (error) {
      console.error('[intelligence-free] entitlement failed', { code: error.code });
      redirect('/dashboard/intelligence?error=No+pudimos+activar+la+prueba+de+Growth.');
    }
  }

  revalidatePath('/dashboard/intelligence');
  revalidatePath('/dashboard');
  redirect('/dashboard/intelligence?free=started');
}
