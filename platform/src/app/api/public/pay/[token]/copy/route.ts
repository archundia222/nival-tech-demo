import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID.test(token)) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('record_nival_pay_public_copy', { profile_token: token });

  if (error) {
    console.error('[public-pay] copy analytics failed', { code: error.code });
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: Boolean(data) }, { status: 200 });
}
