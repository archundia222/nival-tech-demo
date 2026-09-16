'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isNivalAdmin } from '@/lib/admin';

export async function confirmCashPayment(formData: FormData) {
  const orderId = String(formData.get('orderId') ?? '');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isNivalAdmin(user.email)) redirect('/dashboard');
  const admin = createAdminClient();
  const { data: order } = await admin.from('product_orders').select('business_id, status, payment_method')
    .eq('id', orderId).maybeSingle();
  if (!order || order.payment_method !== 'cash' || order.status !== 'pending_cash_confirmation') redirect('/admin/ventas?error=Orden+inválida');
  const now = new Date().toISOString();
  const { error } = await admin.from('product_orders').update({ status: 'paid', paid_at: now, confirmed_by: user.id, updated_at: now }).eq('id', orderId);
  if (error) redirect('/admin/ventas?error=No+se+pudo+confirmar');
  await admin.from('businesses').update({ subscription_status: 'active', updated_at: now }).eq('id', order.business_id);
  revalidatePath('/admin/ventas');
}

