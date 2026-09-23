'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ACTIVE_BUSINESS_COOKIE } from '@/lib/active-business';

export async function switchActiveBusiness(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '').trim();
  const next = String(formData.get('next') ?? '/dashboard');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !businessId) redirect('/auth');

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .maybeSingle();

  if (!membership) redirect('/dashboard');

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  const safeNext = next.startsWith('/dashboard') ? next : '/dashboard';
  redirect(safeNext);
}
