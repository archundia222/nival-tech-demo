import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: business } = await admin.from('businesses').select('id').eq('slug', slug).maybeSingle();
  if (!business) return NextResponse.redirect(new URL('/', request.url));

  const [{ data: smartLink }, { data: program }] = await Promise.all([
    admin.from('smart_links').select('target_url, public_token')
      .eq('business_id', business.id)
      .eq('kind', 'google_review')
      .eq('active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin.from('loyalty_programs').select('review_url')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (smartLink?.public_token) return NextResponse.redirect(new URL(`/go/${smartLink.public_token}`, request.url));
  const destination = program?.review_url;
  if (destination?.startsWith('https://')) return NextResponse.redirect(destination);
  return NextResponse.redirect(new URL(`/p/${encodeURIComponent(slug)}`, request.url));
}
