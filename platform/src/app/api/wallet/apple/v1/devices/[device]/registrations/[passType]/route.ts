import { applePassType, appleWalletReady } from '@/lib/apple-wallet';
import { createPointsAdminClient } from '@/lib/supabase/points-admin';

export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ device: string; passType: string }> }) {
  const { device, passType } = await params;
  if (!appleWalletReady() || passType !== applePassType() || !/^[a-zA-Z0-9_-]{8,128}$/.test(device)) return new Response(null, { status: 404 });
  const admin = createPointsAdminClient();
  const { data: registrations, error } = await admin.from('apple_wallet_registrations').select('pass_serial').eq('device_id', device);
  if (error) return new Response(null, { status: 500 });
  const serials = (registrations ?? []).map((row) => row.pass_serial);
  if (!serials.length) return new Response(null, { status: 204 });
  const since = new URL(request.url).searchParams.get('passesUpdatedSince');
  const { data: changes, error: changesError } = await admin.from('apple_wallet_pass_changes').select('pass_serial,updated_at').in('pass_serial', serials);
  if (changesError) return new Response(null, { status: 500 });
  const tag = since && Number.isFinite(Date.parse(since)) ? Date.parse(since) : null;
  const updated = tag === null ? serials : (changes ?? []).filter((item) => Date.parse(item.updated_at) > tag).map((item) => item.pass_serial);
  if (!updated.length) return new Response(null, { status: 204 });
  const mostRecent = Math.max(Date.now(), ...(changes ?? []).map((item) => Date.parse(item.updated_at)));
  return Response.json({ serialNumbers: updated, lastUpdated: new Date(mostRecent).toISOString() }, { headers: { 'cache-control': 'no-store' } });
}
