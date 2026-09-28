import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PublicReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const admin = createAdminClient();
  const { data } = await admin.from('review_profiles')
    .select('business_id,google_review_url,active,trial_started_at')
    .eq('public_token', token)
    .maybeSingle();
  if (!data?.active || !data.google_review_url) notFound();
  const { data: entitlement } = await admin.from('business_product_entitlements').select('status')
    .eq('business_id', data.business_id).eq('product_code', 'nival_reviews').maybeSingle();
  if (entitlement?.status !== 'active' && (!data.trial_started_at || Date.now() - new Date(data.trial_started_at).getTime() >= 15 * 86400000)) notFound();
  await admin.rpc('increment_nival_card_view', { p_kind: 'reviews', p_token: token });
  redirect(data.google_review_url);
}
