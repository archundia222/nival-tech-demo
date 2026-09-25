import { validApplePassRequest } from '@/lib/apple-wallet';
import { createPointsAdminClient } from '@/lib/supabase/points-admin';

export const runtime = 'nodejs';
type Context = { params: Promise<{ device: string; passType: string; serial: string }> };

async function context(request: Request, params: Context['params']) {
  const { device, passType, serial } = await params;
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(device) || !validApplePassRequest(serial, passType, request.headers.get('authorization'))) return null;
  return { device, serial };
}

export async function POST(request: Request, { params }: Context) {
  const pass = await context(request, params);
  if (!pass) return new Response(null, { status: 401 });
  const body = await request.json().catch(() => null);
  const token = body?.pushToken;
  if (typeof token !== 'string' || !/^[a-f0-9]{32,256}$/i.test(token)) return new Response(null, { status: 400 });
  const admin = createPointsAdminClient();
  const { data: account } = await admin.from('loyalty_accounts').select('id').eq('public_token', pass.serial).maybeSingle();
  if (!account) return new Response(null, { status: 404 });
  const { data: existing } = await admin.from('apple_wallet_registrations').select('device_id').eq('pass_serial', pass.serial).eq('device_id', pass.device).maybeSingle();
  const { error } = await admin.from('apple_wallet_registrations').upsert({ pass_serial: pass.serial, device_id: pass.device, push_token: token, registered_at: new Date().toISOString() }, { onConflict: 'pass_serial,device_id' });
  return new Response(null, { status: error ? 500 : existing ? 200 : 201 });
}

export async function DELETE(request: Request, { params }: Context) {
  const pass = await context(request, params);
  if (!pass) return new Response(null, { status: 401 });
  const { error } = await createPointsAdminClient().from('apple_wallet_registrations').delete().eq('pass_serial', pass.serial).eq('device_id', pass.device);
  return new Response(null, { status: error ? 500 : 200 });
}
