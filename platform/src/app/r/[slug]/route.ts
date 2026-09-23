import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: business } = await admin.from('businesses').select('id').eq('slug', slug).maybeSingle();
  if (!business) return NextResponse.redirect(new URL('/', request.url));

  const { data: program } = await admin.from('loyalty_programs')
    .select('review_url')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (program?.review_url?.startsWith('https://')) return NextResponse.redirect(program.review_url);
  return NextResponse.redirect(new URL(`/p/${encodeURIComponent(slug)}`, request.url));
}
