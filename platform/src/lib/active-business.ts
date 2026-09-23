import 'server-only';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const ACTIVE_BUSINESS_COOKIE = 'nival_active_business';

export type ActiveBusinessMembership = {
  business_id: string;
  role: 'owner' | 'manager' | 'staff';
  created_at: string;
};

export async function getActiveBusinessMembership(userId: string): Promise<ActiveBusinessMembership | null> {
  const supabase = await createClient();
  const { data: memberships, error } = await supabase
    .from('business_members')
    .select('business_id, role, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('No se pudo cargar el espacio de trabajo.');
  if (!memberships?.length) return null;

  const cookieStore = await cookies();
  const preferredBusinessId = cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value;
  const preferred = preferredBusinessId
    ? memberships.find((membership) => membership.business_id === preferredBusinessId)
    : null;

  return (preferred ?? memberships[0]) as ActiveBusinessMembership;
}

export async function getBusinessChoices(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('business_members')
    .select('business_id, role, created_at, businesses(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) return [];

  return (data ?? []).map((membership) => {
    const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
    return {
      id: membership.business_id,
      name: business?.name ?? 'Negocio',
      role: membership.role as 'owner' | 'manager' | 'staff',
    };
  });
}
