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
  const ssid = String(formData.get('ssid') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const security = formData.get('security') === 'nopass' ? 'nopass' : 'WPA';
  if (!ssid || ssid.length > 32 || /[\r\n]/.test(ssid)) redirect('/dashboard/wifi?error=Escribe+el+nombre+de+tu+red+(hasta+32+caracteres).');
  if (security === 'WPA' && (password.length < 8 || password.length > 63)) redirect('/dashboard/wifi?error=La+contraseña+debe+tener+entre+8+y+63+caracteres.');
  const { error } = await supabase.from('wifi_profiles').update({ ssid, password: security === 'nopass' ? '' : password, security, updated_at: new Date().toISOString() }).eq('business_id', businessId);
  if (error) redirect('/dashboard/wifi?error=No+pudimos+guardar+tu+red.+Intenta+de+nuevo.');
  revalidatePath('/dashboard/wifi');
  redirect('/dashboard/wifi?message=Red+guardada.+El+QR+ya+permite+conectarse.');
}
