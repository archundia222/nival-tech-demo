import { NextRequest, NextResponse } from 'next/server';
import { WebhookSignatureValidator } from 'mercadopago';
import { createAdminClient } from '@/lib/supabase/admin';
import { NIVAL_PAY_PRICE_CENTS } from '@/lib/orders';

type MercadoPagoOrderWebhook = {
  type?: string;
  action?: string;
  data?: {
    id?: string;
    external_reference?: string;
    currency_id?: string;
    status?: string;
    status_detail?: string;
    total_amount?: string | number;
    total_paid_amount?: string | number;
    transactions?: {
      payments?: Array<{ id?: string }>;
    };
  };
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const body = await request.json().catch(() => null) as MercadoPagoOrderWebhook | null;
  const dataId = request.nextUrl.searchParams.get('data.id') ?? body?.data?.id?.toString();
  const eventType = request.nextUrl.searchParams.get('type') ?? body?.type;
  if (!dataId || eventType !== 'order') return NextResponse.json({ received: true });

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

  const payload = body?.data;
  const orderId = payload?.external_reference;
  if (!payload || !orderId || !UUID_PATTERN.test(orderId)) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin.from('product_orders')
    .select('business_id, amount_cents, currency, status, provider_payment_id')
    .eq('id', orderId).eq('payment_method', 'mercado_pago').maybeSingle();
  if (orderError) {
    console.error('Nival Pay order lookup failed', orderError);
    return NextResponse.json({ error: 'Order lookup failed' }, { status: 500 });
  }
  if (!order) return NextResponse.json({ received: true });

  const amountCents = Math.round(Number(payload.total_amount) * 100);
  const paidAmountCents = Math.round(Number(payload.total_paid_amount) * 100);
  const paymentId = String(payload.transactions?.payments?.[0]?.id ?? dataId);
  const approved = payload.status === 'processed'
    && payload.status_detail === 'accredited'
    && payload.currency_id === order.currency
    && amountCents === order.amount_cents
    && paidAmountCents === order.amount_cents
    && order.amount_cents === NIVAL_PAY_PRICE_CENTS;

  if (!approved) return NextResponse.json({ received: true });
  if (order.provider_payment_id && order.provider_payment_id !== paymentId) {
    console.error('Nival Pay order already references a different Mercado Pago payment', { orderId });
    return NextResponse.json({ error: 'Payment mismatch' }, { status: 409 });
  }

  const now = new Date().toISOString();
  if (order.status !== 'paid') {
    const { error: paymentUpdateError } = await admin.from('product_orders')
      .update({ status: 'paid', provider_payment_id: paymentId, paid_at: now, updated_at: now })
      .eq('id', orderId)
      .neq('status', 'paid');
    if (paymentUpdateError) {
      console.error('Nival Pay order activation failed', paymentUpdateError);
      return NextResponse.json({ error: 'Order activation failed' }, { status: 500 });
    }
  }

  const { error: businessUpdateError } = await admin.from('businesses')
    .update({ subscription_status: 'active', updated_at: now })
    .eq('id', order.business_id)
    .neq('subscription_status', 'active');
  if (businessUpdateError) {
    console.error('Nival Pay business activation failed', businessUpdateError);
    return NextResponse.json({ error: 'Business activation failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
