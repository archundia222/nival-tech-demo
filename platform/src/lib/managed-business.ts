import 'server-only';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminClient } from './supabase/admin';
import { createClient } from './supabase/server';
import { BUSINESS_COOKIE, businessSecretHash } from './business-code';

export interface ManagedCard {
  id: string; public_token: string; display_name: string; account_holder: string; bank_name: string; clabe: string; concept: string | null;
  active: boolean; managed_ready: boolean; managed_removed_at: string | null; period_views: number; view_count: number;
}
export interface UsagePeriod {
  id: string; starts_at: string; ends_at: string; rate_cents: number; paid_at: string | null; payment_reference: string | null;
  views: number; amount_cents: number; card_totals: { id: string; name: string; views: number }[] | null;
}
export interface ManagedBusiness { id: string; name: string; phone: string | null; suspended: boolean; created_at: string; cards: ManagedCard[]; periods: UsagePeriod[]; }

export async function getManagedAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email_confirmed_at ? user : null;
}
export async function requireManagedAdmin() {
  const user = await getManagedAdmin();
  if (!user) redirect('/auth?next=%2Fadmin%2Fnegocios');
  return user;
}
export async function getBusinessSession() {
  const token = (await cookies()).get(BUSINESS_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { data, error } = await createAdminClient().from('nival_business_sessions').select('business_id')
    .eq('token_hash', businessSecretHash(token, 'session')).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (error) throw new Error('Could not verify business session');
  return data;
}
export async function managedBusinesses(businessId?: string): Promise<ManagedBusiness[]> {
  const { data, error } = await createAdminClient().rpc('nival_business_snapshot', { p_business: businessId ?? null });
  if (error) throw new Error('Could not load businesses');
  return (data ?? []) as ManagedBusiness[];
}
export async function workspaceBusinesses(user: User): Promise<ManagedBusiness[]> {
  const { data, error } = await createAdminClient().rpc('nival_workspace_snapshot', { p_creator: user.app_metadata.nival_admin === true ? null : user.id });
  if (error) throw new Error('Could not load workspace');
  return (data ?? []) as ManagedBusiness[];
}
export function currentPeriod(business: ManagedBusiness) { return business.periods.find(p => !p.paid_at); }
export function isBusinessActive(business: ManagedBusiness) {
  const p = currentPeriod(business);
  return !business.suspended && !!p && Date.parse(p.starts_at) <= Date.now() && Date.parse(p.ends_at) > Date.now();
}
export async function nivalWhatsApp(message: string) {
  const { data } = await createAdminClient().from('site_legal_settings').select('phone').eq('id', 'default').maybeSingle();
  const raw = String(data?.phone ?? '').replace(/\D/g, '');
  const phone = raw.length === 10 ? `52${raw}` : raw;
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;
}
