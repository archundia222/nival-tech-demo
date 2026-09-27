'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveBusinessMembership } from '@/lib/active-business';

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fwifi');
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership || !['owner', 'manager'].includes(membership.role)) redirect('/dashboard');
  return { supabase, businessId: membership.business_id };
}

export async function activateFreeWifi() {
  const { supabase, businessId } = await context();
  const { error } = await supabase.from('wifi_profiles').upsert({ business_id: businessId }, { onConflict: 'business_id', ignoreDuplicates: true });
  if (error) redirect('/dashboard/wifi?error=No+pudimos+preparar+tu+WiFi.+Intenta+de+nuevo.');
  revalidatePath('/dashboard/wifi');
  redirect('/dashboard/wifi?message=Ya+puedes+configurar+el+WiFi+para+tus+clientes.');
}

export async function saveWifi(formData: FormData) {
  const { supabase, businessId } = await context();
  const raw = String(formData.get('accessUrl') ?? '').trim();
  let accessUrl: URL;
  try {
    accessUrl = new URL(raw);
    if (accessUrl.protocol !== 'https:' || accessUrl.username || accessUrl.password || raw.length > 2000) throw new Error('invalid wifi url');
  } catch { redirect('/dashboard/wifi?error=Escribe+un+enlace+HTTPS+de+acceso+a+tu+WiFi.'); }
  const { error } = await supabase.from('wifi_profiles').update({ access_url: accessUrl.toString(), ssid: accessUrl.hostname.slice(0,32), password: '', security: 'nopass', updated_at: new Date().toISOString() }).eq('business_id', businessId);
  if (error) redirect('/dashboard/wifi?error=No+pudimos+guardar+el+enlace.+Intenta+de+nuevo.');
  revalidatePath('/dashboard/wifi');
  redirect('/dashboard/wifi?message=Enlace+guardado.+Tu+QR+ya+abre+el+acceso+WiFi.');
}
