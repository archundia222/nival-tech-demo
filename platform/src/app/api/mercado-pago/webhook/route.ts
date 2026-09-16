import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment, WebhookSignatureValidator } from 'mercadopago';
import { createAdminClient } from '@/lib/supabase/admin';
import { NIVAL_PAY_PRICE_CENTS } from '@/lib/orders';

export async function POST(request: NextRequest) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!accessToken || !webhookSecret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const body = await request.json().catch(() => null);
  const dataId = request.nextUrl.searchParams.get('data.id') ?? body?.data?.id?.toString();
  if (!dataId || body?.type !== 'payment') return NextResponse.json({ received: true });
  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get('x-signature') ?? '',
      xRequestId: request.headers.get('x-request-id') ?? '',
      dataId,
      secret: webhookSecret,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payment;
  try {
    payment = await new Payment(new MercadoPagoConfig({ accessToken })).get({ id: dataId });
  } catch (error) {
    console.error('Mercado Pago payment lookup failed', error);
    return NextResponse.json({ error: 'Payment lookup failed' }, { status: 502 });
  }

  const orderId = payment.external_reference;
  if (!orderId) return NextResponse.json({ received: true });
  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin.from('product_orders')
    .select('business_id, amount_cents, currency, status, provider_payment_id')
    .eq('id', orderId).eq('payment_method', 'mercado_pago').maybeSingle();
  if (orderError) {
    console.error('Nival Pay order lookup failed', orderError);
    return NextResponse.json({ error: 'Order lookup failed' }, { status: 500 });
  }
  if (!order) return NextResponse.json({ received: true });

  const paymentId = String(payment.id);
  const approved = payment.status === 'approved'
    && payment.currency_id === order.currency
    && Math.round(Number(payment.transaction_amount) * 100) === order.amount_cents
    && order.amount_cents === NIVAL_PAY_PRICE_CENTS;
  if (!approved || order.status === 'paid') return NextResponse.json({ received: true });
  if (order.provider_payment_id && order.provider_payment_id !== paymentId) {
    console.error('Nival Pay order already references a different Mercado Pago payment', { orderId });
    return NextResponse.json({ error: 'Payment mismatch' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: paidOrder, error: paymentUpdateError } = await admin.from('product_orders')
    .update({ status: 'paid', provider_payment_id: paymentId, paid_at: now, updated_at: now })
    .eq('id', orderId).neq('status', 'paid').select('business_id').maybeSingle();
  if (paymentUpdateError) {
    console.error('Nival Pay order activation failed', paymentUpdateError);
    return NextResponse.json({ error: 'Order activation failed' }, { status: 500 });
  }
  if (!paidOrder) return NextResponse.json({ received: true });

  const { error: businessUpdateError } = await admin.from('businesses')
    .update({ subscription_status: 'active', updated_at: now }).eq('id', paidOrder.business_id);
  if (businessUpdateError) {
    console.error('Nival Pay business activation failed', businessUpdateError);
    return NextResponse.json({ error: 'Business activation failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
