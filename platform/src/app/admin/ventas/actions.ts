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
  const { data: order } = await admin.from('product_orders').select('business_id, product_code, status, payment_method')
    .eq('id', orderId).maybeSingle();
  if (!order || order.payment_method !== 'cash' || order.status !== 'pending_cash_confirmation') redirect('/admin/ventas?error=Orden+inválida');
  const now = new Date().toISOString();
  const { error } = await admin.from('product_orders').update({ status: 'paid', paid_at: now, confirmed_by: user.id, updated_at: now }).eq('id', orderId);
  if (error) redirect('/admin/ventas?error=No+se+pudo+confirmar');
  if (order.product_code === 'nival_pay') {
    await admin.from('businesses').update({ subscription_status: 'active', updated_at: now }).eq('id', order.business_id);
  } else if (order.product_code.startsWith('nival_pay_physical_card')) {
    await admin.from('physical_card_orders')
      .update({ fulfillment_status: 'confirmed', updated_at: now })
      .eq('product_order_id', orderId)
      .eq('fulfillment_status', 'new');
  }
  revalidatePath('/admin/ventas');
}

export async function updatePhysicalCardFulfillment(formData: FormData) {
  const cardId = String(formData.get('cardId') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  const trackingCode = String(formData.get('trackingCode') ?? '').trim().slice(0, 120) || null;
  const allowed = new Set(['new','confirmed','producing','ready','shipped','delivered','cancelled']);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isNivalAdmin(user.email)) redirect('/dashboard');
  if (!cardId || !allowed.has(status)) redirect('/admin/ventas?section=nival-card&error=Estado+inválido');

  const admin = createAdminClient();
  const { data: card } = await admin.from('physical_card_orders')
    .select('id, product_orders!physical_card_orders_product_order_id_fkey(status)')
    .eq('id', cardId)
    .maybeSingle();
  const payment = Array.isArray(card?.product_orders) ? card?.product_orders[0] : card?.product_orders;
  if (!card) redirect('/admin/ventas?section=nival-card&error=No+encontramos+el+pedido');
  if (payment?.status !== 'paid' && !['new','cancelled'].includes(status)) {
    redirect('/admin/ventas?section=nival-card&error=Confirma+el+pago+antes+de+mandar+la+tarjeta+a+producción');
  }

  const { error } = await admin.from('physical_card_orders')
    .update({ fulfillment_status: status, tracking_code: trackingCode, updated_at: new Date().toISOString() })
    .eq('id', cardId);
  if (error) redirect('/admin/ventas?section=nival-card&error=No+se+pudo+actualizar+el+pedido');
  revalidatePath('/admin/ventas');
  redirect('/admin/ventas?section=nival-card');
}

