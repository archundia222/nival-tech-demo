import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { WifiQr } from '@/app/dashboard/wifi/wifi-qr';

export default async function GuestWifiPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(token)) notFound();
  const { data } = await createAdminClient().from('wifi_profiles').select('ssid,password,security,businesses(name)').eq('public_token', token).maybeSingle();
  if (!data?.ssid) notFound();
  const business = Array.isArray(data.businesses) ? data.businesses[0] : data.businesses;
  const name = business?.name ?? 'Este negocio';
  const url = `${(process.env.NIVAL_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || 'https://nival-tech-platform.vercel.app').replace(/\/$/, '')}/wifi/${token}`;
  return <main className="wifiGuestPage"><section><span>NIVAL WIFI</span><h1>Conéctate al WiFi de {name}</h1><p>Escanea el QR con la cámara de tu teléfono para unirte a la red.</p><WifiQr ssid={data.ssid} password={data.password} security={data.security} url={url} /></section></main>;
}
