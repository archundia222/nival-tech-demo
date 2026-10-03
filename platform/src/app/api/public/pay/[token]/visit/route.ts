import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { PROFILE_UUID, VISIT_UUID, isAutomatedVisit, signVisit, verifyVisit } from '@/lib/pay-visit';
import { getBusinessSession } from '@/lib/managed-business';

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const origin = request.headers.get('origin');
  if (!PROFILE_UUID.test(token)) return NextResponse.json({ ok: false }, { status: 400 });
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ ok: false }, { status: 403 });
  if (isAutomatedVisit(request.headers)) return NextResponse.json({ ok: true, counted: false });
  let body: { sessionId?: unknown; visit?: unknown };
  try {
    const text = await request.text();
    if (text.length > 512) return NextResponse.json({ ok: false }, { status: 413 });
    body = JSON.parse(text);
  } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (!body || typeof body.sessionId !== 'string' || !VISIT_UUID.test(body.sessionId)) return NextResponse.json({ ok: false }, { status: 400 });
  const entry = typeof body.visit === 'string' ? verifyVisit(token, body.visit) : null;
  if (body.visit !== undefined && (!entry || entry.sessionId !== body.sessionId)) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin.from('payment_profiles').select('id,business_id').eq('public_token', token).eq('active', true).maybeSingle();
  if (profileError) return NextResponse.json({ ok: false }, { status: 503 });
  if (!profile) return NextResponse.json({ ok: false }, { status: 404 });

  const businessSession = await getBusinessSession();
  if (businessSession?.business_id === profile.business_id) return NextResponse.json({ ok: true, counted: false, reason: 'business_owner' });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.app_metadata.nival_admin === true) return NextResponse.json({ ok: true, counted: false, reason: 'administrator' });
  if (user) {
    const { data: manager, error: managerError } = await admin.from('nival_managed_businesses').select('business_id').eq('business_id', profile.business_id).eq('created_by', user.id).maybeSingle();
    if (managerError) return NextResponse.json({ ok: false }, { status: 503 });
    if (manager) return NextResponse.json({ ok: true, counted: false, reason: 'business_owner' });
    const { data: member, error } = await admin.from('business_members').select('user_id').eq('business_id', profile.business_id).eq('user_id', user.id).maybeSingle();
    if (error) return NextResponse.json({ ok: false }, { status: 503 });
    if (member) return NextResponse.json({ ok: true, counted: false, reason: 'business_member' });
  }

  const source = entry?.source ?? 'direct';
  const { data, error } = await admin.rpc('record_nival_pay_visit', { profile_token: token, visit_session: body.sessionId, visit_source: source });
  if (error) {
    console.error('[public-pay] visit analytics failed', { code: error.code });
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const response = NextResponse.json({ ok: true, counted: Boolean(data), visit: signVisit(token, body.sessionId, source) });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
