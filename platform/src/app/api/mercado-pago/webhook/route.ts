import { NextRequest, NextResponse } from 'next/server';
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from 'mercadopago';
import { createAdminClient } from '@/lib/supabase/admin';
import { NIVAL_PAY_PRICE_CENTS, NIVAL_PAY_PRODUCT, NIVAL_PAY_ADDITIONAL_PRICE_CENTS, NIVAL_PAY_ADDITIONAL_PRODUCT, NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS, NIVAL_PAY_EXTRA_SECTION_PRODUCT, NIVAL_POINTS_PRODUCT, NIVAL_INTELLIGENCE_PRODUCT, NIVAL_POINTS_INTELLIGENCE_PRODUCT, NIVAL_POINTS_PRICE_CENTS, NIVAL_INTELLIGENCE_PRICE_CENTS, NIVAL_POINTS_INTELLIGENCE_PRICE_CENTS } from '@/lib/orders';

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
  if (!dataId || !['order', 'subscription_preapproval', 'preapproval'].includes(eventType ?? '')) return NextResponse.json({ received: true });

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get('x-signature') ?? '',
      xRequestId: request.headers.get('x-request-id') ?? '',
      // Mercado Pago signs alphanumeric Orders API IDs in lowercase.
      // Keep the original value for the provider lookup below.
      dataId: dataId.toLowerCase(),
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

  if (eventType === 'subscription_preapproval' || eventType === 'preapproval') {
    const subscriptionResponse = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(dataId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!subscriptionResponse.ok) return NextResponse.json({ error: 'Subscription verification failed' }, { status: 502 });
    const subscription = await subscriptionResponse.json() as {
      id?: string;
      external_reference?: string;
      status?: string;
      next_payment_date?: string;
      auto_recurring?: { transaction_amount?: number; currency_id?: string };
    };
    const subscriptionId = subscription.external_reference;
    if (!subscriptionId || !UUID_PATTERN.test(subscriptionId) || subscription.id !== dataId) {
      return NextResponse.json({ error: 'Subscription mismatch' }, { status: 409 });
    }
    const mappedStatus = subscription.status === 'authorized' ? 'authorized'
      : subscription.status === 'paused' ? 'paused'
      : subscription.status === 'cancelled' ? 'cancelled'
      : 'pending';
    const admin = createAdminClient();
    const { data: storedSubscription, error: lookupError } = await admin.from('product_subscriptions')
      .select('product_code, amount_cents, provider_subscription_id')
      .eq('id', subscriptionId)
      .eq('provider', 'mercado_pago')
      .maybeSingle();
    if (lookupError || !storedSubscription) {
      return NextResponse.json({ error: 'Subscription lookup failed' }, { status: 500 });
    }
    const catalogAmount = storedSubscription.product_code === NIVAL_POINTS_PRODUCT ? NIVAL_POINTS_PRICE_CENTS
      : storedSubscription.product_code === NIVAL_INTELLIGENCE_PRODUCT ? NIVAL_INTELLIGENCE_PRICE_CENTS
      : storedSubscription.product_code === NIVAL_POINTS_INTELLIGENCE_PRODUCT ? NIVAL_POINTS_INTELLIGENCE_PRICE_CENTS
      : null;
    const providerAmountCents = Math.round(Number(subscription.auto_recurring?.transaction_amount) * 100);
    const subscriptionVerified = catalogAmount !== null
      && storedSubscription.amount_cents === catalogAmount
      && providerAmountCents === storedSubscription.amount_cents
      && subscription.auto_recurring?.currency_id === 'MXN'
      && (!storedSubscription.provider_subscription_id || storedSubscription.provider_subscription_id === dataId);
    if (!subscriptionVerified) {
      console.error('Nival subscription verification failed', { subscriptionId });
      return NextResponse.json({ error: 'Subscription verification failed' }, { status: 409 });
    }
    const { error } = await admin.rpc('sync_nival_product_subscription', {
      p_subscription_id: subscriptionId,
      p_provider_subscription_id: dataId,
      p_status: mappedStatus,
      p_current_period_end: subscription.next_payment_date ?? null,
    });
    if (error) {
      console.error('Nival subscription sync failed', { subscriptionId, code: error.code });
      return NextResponse.json({ error: 'Subscription sync failed' }, { status: 500 });
    }
    return NextResponse.json({ received: true });
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
    .select('business_id, product_code, amount_cents, currency, status, provider_preference_id, provider_payment_id')
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
    && (!payload.currency_id || payload.currency_id === order.currency)
    && amountCents === order.amount_cents
    && paidAmountCents === order.amount_cents
    && ((order.product_code === NIVAL_PAY_PRODUCT && order.amount_cents === NIVAL_PAY_PRICE_CENTS)
      || (order.product_code === NIVAL_PAY_EXTRA_SECTION_PRODUCT && order.amount_cents === NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS)
      || (order.product_code === NIVAL_PAY_ADDITIONAL_PRODUCT && order.amount_cents === NIVAL_PAY_ADDITIONAL_PRICE_CENTS))
    && Boolean(paymentId);

  if (!approved || !paymentId) return NextResponse.json({ received: true });
  if (order.provider_payment_id && order.provider_payment_id !== paymentId) {
    console.error('Nival Pay order already references a different Mercado Pago payment', { orderId });
    return NextResponse.json({ error: 'Payment mismatch' }, { status: 409 });
  }

  const { error: finalizeError } = await admin.rpc('finalize_nival_pay_order', {
    p_order_id: orderId,
    p_provider_payment_id: paymentId,
  });
  if (finalizeError) {
    console.error('Nival Pay order finalization failed', { orderId, code: finalizeError.code });
    return NextResponse.json({ error: 'Order finalization failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
