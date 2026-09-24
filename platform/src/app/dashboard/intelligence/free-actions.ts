'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveBusinessMembership } from '@/lib/active-business';

export async function activateFreeNivalIntelligence() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?mode=signup&next=%2Fdashboard%2Fintelligence');

  const membership = await getActiveBusinessMembership(user.id);
  if (!membership || !['owner', 'manager'].includes(membership.role)) redirect('/dashboard/intelligence?error=No+tienes+permiso+para+activar+Intelligence.');

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
    .select('status')
    .eq('business_id', membership.business_id)
    .eq('product_code', 'nival_intelligence')
    .maybeSingle();

  if (existing?.status !== 'active') {
    const { error } = await admin.from('business_product_entitlements').upsert({
      business_id: membership.business_id,
      product_code: 'nival_intelligence',
      status: 'free',
      current_period_end: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,product_code' });
    if (error) {
      console.error('[intelligence-free] entitlement failed', { code: error.code });
      redirect('/dashboard/intelligence?error=No+pudimos+activar+Intelligence+Gratis.');
    }
  }

  revalidatePath('/dashboard/intelligence');
  revalidatePath('/dashboard');
  redirect('/dashboard/intelligence?free=started');
}
