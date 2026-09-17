import { NextRequest, NextResponse } from 'next/server';
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from 'mercadopago';
import { createAdminClient } from '@/lib/supabase/admin';
import { NIVAL_PAY_PRICE_CENTS } from '@/lib/orders';

type MercadoPagoOrderWebhook = {
  type?: string;
  action?: string;
  live_mode?: boolean;
  data?: { id?: string };
};

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
      amount?: string | number;
      paid_amount?: string | number;
    }>;
  };
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!webhookSecret || !accessToken) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as MercadoPagoOrderWebhook | null;
  const queryDataId = request.nextUrl.searchParams.get('data.id');
  const bodyDataId = body?.data?.id?.toString();
  const dataId = queryDataId ?? bodyDataId;
  const eventType = request.nextUrl.searchParams.get('type') ?? body?.type;
  if (!dataId || eventType !== 'order') return NextResponse.json({ received: true });

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get('x-signature') ?? '',
      xRequestId: request.headers.get('x-request-id') ?? '',
      dataId,
      secret: webhookSecret,
    });
  } catch (error) {
    console.warn('Mercado Pago webhook signature rejected', {
      reason: error instanceof InvalidWebhookSignatureError ? error.reason : 'Unknown',
      dataIdSource: queryDataId ? 'query' : 'body',
      queryBodyDataIdMatch: queryDataId && bodyDataId ? queryDataId === bodyDataId : null,
      hasXSignature: Boolean(request.headers.get('x-signature')),
      hasXRequestId: Boolean(request.headers.get('x-request-id')),
      eventType,
      action: body?.action ?? null,
      liveMode: body?.live_mode ?? null,
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const providerResponse = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(dataId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!providerResponse.ok) {
    console.error('Mercado Pago order verification failed', {
      providerOrderId: dataId,
      status: providerResponse.status,
    });
    return NextResponse.json({ error: 'Provider verification failed' }, { status: 502 });
  }

  const payload = await providerResponse.json() as MercadoPagoOrder;
  if (payload.id && String(payload.id) !== dataId) {
    console.error('Mercado Pago returned a different order', { providerOrderId: dataId });
    return NextResponse.json({ error: 'Provider order mismatch' }, { status: 409 });
  }

  const orderId = payload.external_reference;
  if (!orderId || !UUID_PATTERN.test(orderId)) return NextResponse.json({ received: true });

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin.from('product_orders')
    .select('business_id, amount_cents, currency, status, provider_preference_id, provider_payment_id')
    .eq('id', orderId).eq('payment_method', 'mercado_pago').maybeSingle();
  if (orderError) {
    console.error('Nival Pay order lookup failed', orderError);
    return NextResponse.json({ error: 'Order lookup failed' }, { status: 500 });
  }
  if (!order) return NextResponse.json({ received: true });

  if (order.provider_preference_id && order.provider_preference_id !== dataId) {
    console.error('Nival Pay provider order mismatch', { orderId });
    return NextResponse.json({ error: 'Order mismatch' }, { status: 409 });
  }

  const payment = payload.transactions?.payments?.find((candidate) =>
    candidate.status === 'processed' && candidate.status_detail === 'accredited'
  );
  const amountCents = Math.round(Number(payload.total_amount) * 100);
  const paidAmountCents = Math.round(Number(payload.total_paid_amount) * 100);
  const paymentId = payment?.id ? String(payment.id) : null;
  const approved = payload.status === 'processed'
    && payload.status_detail === 'accredited'
    && payload.currency_id === order.currency
    && amountCents === order.amount_cents
    && paidAmountCents === order.amount_cents
    && order.amount_cents === NIVAL_PAY_PRICE_CENTS
    && Boolean(paymentId);

  if (!approved || !paymentId) return NextResponse.json({ received: true });
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
