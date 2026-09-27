'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveBusinessMembership } from '@/lib/active-business';

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?mode=signup&next=%2Fdashboard%2Freviews');
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership || !['owner','manager'].includes(membership.role)) {
    redirect('/dashboard?error=No+tienes+permiso+para+configurar+Nival+Reseñas.');
  }
  return { membership, admin: createAdminClient() };
}

export async function activateFreeNivalReviews() {
  const { membership, admin } = await context();
  const now = new Date().toISOString();
  const { data: existing } = await admin.from('business_product_entitlements').select('status')
    .eq('business_id', membership.business_id).eq('product_code', 'nival_reviews').maybeSingle();
  if (existing?.status === 'active') redirect('/dashboard/reviews');

  const { error: entitlementError } = await admin.from('business_product_entitlements').upsert({
    business_id: membership.business_id,
    product_code: 'nival_reviews',
    status: 'free',
    updated_at: now,
  }, { onConflict: 'business_id,product_code', ignoreDuplicates: false });

  if (entitlementError) redirect('/dashboard/reviews?error=No+pudimos+activar+Nival+Reseñas+Gratis.');

  const { error: profileError } = await admin.from('review_profiles').upsert({
    business_id: membership.business_id,
    active: true,
    updated_at: now,
  }, { onConflict: 'business_id', ignoreDuplicates: false });

  if (profileError) redirect('/dashboard/reviews?error=No+pudimos+preparar+tu+código+de+reseñas.');

  revalidatePath('/dashboard/reviews');
  redirect('/dashboard/reviews?free=started');
}

export async function saveNivalReviews(formData: FormData) {
  const { membership, admin } = await context();
  const raw = String(formData.get('googleReviewUrl') ?? '').trim();
  let url: URL;
  try {
    url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || !/(^|\.)google\.[a-z.]+$|^g\.page$|^maps\.app\.goo\.gl$/i.test(url.hostname)) throw new Error('Google review URL required');
  } catch {
    redirect('/dashboard/reviews?error=Escribe+un+enlace+HTTPS+válido+de+reseñas+de+Google.');
  }

  const { data: entitlement } = await admin.from('business_product_entitlements')
    .select('status')
    .eq('business_id', membership.business_id)
    .eq('product_code', 'nival_reviews')
    .maybeSingle();

  if (!entitlement || !['free','active'].includes(entitlement.status)) {
    redirect('/dashboard/reviews?error=Primero+activa+Nival+Reseñas+Gratis+o+Pro.');
  }

  const { error } = await admin.from('review_profiles').upsert({
    business_id: membership.business_id,
    google_review_url: url.toString(),
    active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id', ignoreDuplicates: false });

  if (error) redirect('/dashboard/reviews?error=No+pudimos+guardar+tu+enlace+de+reseñas.');

  revalidatePath('/dashboard/reviews');
  redirect('/dashboard/reviews?message=Enlace+guardado.+Tu+QR+ya+lleva+a+tus+reseñas.');
}
