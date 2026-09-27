import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { robots: { index: false, follow: false } };

export default async function PublicReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const { data } = await createAdminClient().from('review_profiles')
    .select('google_review_url,active')
    .eq('public_token', token)
    .maybeSingle();
  if (!data?.active || !data.google_review_url) notFound();
  redirect(data.google_review_url);
}
