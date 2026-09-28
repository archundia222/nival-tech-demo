import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { WifiQr } from '@/app/dashboard/wifi/wifi-qr';
export const metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function GuestWifiPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(token)) notFound();
  const admin = createAdminClient();
  const { data } = await admin.from('wifi_profiles').select('business_id,trial_started_at,ssid,password,security,access_url,businesses(name)').eq('public_token', token).maybeSingle();
  if (!data) notFound();
  const { data: order } = await admin.from('product_orders').select('id').eq('business_id', data.business_id).eq('product_code', 'nival_wifi').eq('status', 'paid').limit(1).maybeSingle();
  // eslint-disable-next-line react-hooks/purity -- A server request checks access against its current timestamp.
  if (!order && (!data.trial_started_at || Date.now() - new Date(data.trial_started_at).getTime() >= 15 * 86400000)) notFound();
  const business = Array.isArray(data.businesses) ? data.businesses[0] : data.businesses;
  const name = business?.name ?? 'Este negocio';
  const url = `${(process.env.NIVAL_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || 'https://nival-tech-platform.vercel.app').replace(/\/$/, '')}/wifi/${token}`;
  return <main className="wifiGuestPage"><section><span>TOCARIO WIFI</span><h1>Conéctate al WiFi de {name}</h1><p>Abre el enlace de la red de invitados. El teléfono puede pedirte confirmar la conexión.</p>{data.access_url ? <a className="nvPrimaryLink" href={data.access_url} rel="nofollow noreferrer">Abrir acceso WiFi →</a> : <WifiQr guest ssid={data.ssid} password={data.password} security={data.security} url={url} />}</section></main>;
}
