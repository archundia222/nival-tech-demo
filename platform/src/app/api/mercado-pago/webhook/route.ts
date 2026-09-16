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

  const payment = await new Payment(new MercadoPagoConfig({ accessToken })).get({ id: dataId });
  const orderId = payment.external_reference;
  if (!orderId) return NextResponse.json({ received: true });
  const admin = createAdminClient();
  const { data: order } = await admin.from('product_orders').select('business_id, amount_cents, currency, status')
    .eq('id', orderId).eq('payment_method', 'mercado_pago').maybeSingle();
  if (!order) return NextResponse.json({ received: true });

  const approved = payment.status === 'approved'
    && payment.currency_id === order.currency
    && Math.round(Number(payment.transaction_amount) * 100) === order.amount_cents
    && order.amount_cents === NIVAL_PAY_PRICE_CENTS;
  if (approved && order.status !== 'paid') {
    const now = new Date().toISOString();
    await admin.from('product_orders').update({ status: 'paid', provider_payment_id: String(payment.id), paid_at: now, updated_at: now }).eq('id', orderId);
    await admin.from('businesses').update({ subscription_status: 'active', updated_at: now }).eq('id', order.business_id);
  }
  return NextResponse.json({ received: true });
}

