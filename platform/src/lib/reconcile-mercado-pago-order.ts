import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

type MercadoPagoOrder = {
  id?: string;
  external_reference?: string;
  currency_id?: string;
  status?: string;
  status_detail?: string;
  total_amount?: string | number;
  total_paid_amount?: string | number;
  transactions?: {
    payments?: Array<{
      id?: string;
      status?: string;
      status_detail?: string;
    }>;
  };
};

export async function reconcileLatestMercadoPagoProductOrder(
  businessId: string,
  catalog: Record<string, number>,
) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) return false;

  const admin = createAdminClient();
  const { data: orders } = await admin.from('product_orders')
    .select('id,product_code,amount_cents,currency,status,provider_preference_id,provider_payment_id')
    .eq('business_id', businessId)
    .eq('payment_method', 'mercado_pago')
    .eq('status', 'pending')
    .in('product_code', Object.keys(catalog))
    .order('created_at', { ascending: false })
    .limit(10);

  for (const order of orders ?? []) {
    if (!order.provider_preference_id) continue;

    const response = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(order.provider_preference_id)}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' },
    );
    if (!response.ok) continue;

    const payload = await response.json() as MercadoPagoOrder;
    const payment = payload.transactions?.payments?.find((candidate) =>
      candidate.status === 'processed' && candidate.status_detail === 'accredited'
    );
    const paymentId = payment?.id ? String(payment.id) : null;
    const expectedAmount = catalog[order.product_code];

    const verified = payload.id === order.provider_preference_id
      && payload.external_reference === order.id
      && payload.status === 'processed'
      && payload.status_detail === 'accredited'
      && (!payload.currency_id || payload.currency_id === order.currency)
      && Math.round(Number(payload.total_amount) * 100) === order.amount_cents
      && Math.round(Number(payload.total_paid_amount) * 100) === order.amount_cents
      && order.amount_cents === expectedAmount
      && Boolean(paymentId)
      && (!order.provider_payment_id || order.provider_payment_id === paymentId);

    if (!verified || !paymentId) continue;

    const { error } = await admin.rpc('finalize_nival_pay_order', {
      p_order_id: order.id,
      p_provider_payment_id: paymentId,
    });
    if (error) {
      console.error('[checkout] Product reconciliation failed', {
        orderId: order.id,
        productCode: order.product_code,
        code: error.code,
      });
      continue;
    }
    return true;
  }

  return false;
}
