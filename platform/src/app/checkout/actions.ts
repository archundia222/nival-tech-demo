'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NIVAL_PAY_PRICE_CENTS, NIVAL_PAY_PRODUCT } from '@/lib/orders';

async function currentPurchaseContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?mode=signup&next=%2Fcheckout');
  const { data: membership } = await supabase.from('business_members')
    .select('business_id').eq('user_id', user.id).limit(1).maybeSingle();
  // /dashboard/pay is an allowed onboarding destination and redirects unpaid customers back to checkout.
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Fpay');
  return { user, businessId: membership.business_id };
}

type MercadoPagoOrderCreateResponse = {
  id?: string;
  checkout_url?: string;
};

export async function startMercadoPagoCheckout() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) redirect('/checkout?error=Mercado+Pago+aún+no+está+configurado.');
  const { user, businessId } = await currentPurchaseContext();
  const admin = createAdminClient();
  const { data: order, error } = await admin.from('product_orders').insert({
    business_id: businessId,
    product_code: NIVAL_PAY_PRODUCT,
    amount_cents: NIVAL_PAY_PRICE_CENTS,
    payment_method: 'mercado_pago',
    status: 'pending',
  }).select('id').single();
  if (error || !order) {
    console.error('[checkout] product order insert failed', {
      code: error?.code ?? 'missing_order',
      message: error?.message ?? 'Insert returned no order',
    });
    redirect('/checkout?error=No+se+pudo+crear+la+orden.');
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get('origin') ?? 'https://nival-tech-platform.vercel.app';
  const amount = (NIVAL_PAY_PRICE_CENTS / 100).toFixed(2);
  let result: MercadoPagoOrderCreateResponse = {};

  try {
    const response = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': order.id,
      },
      body: JSON.stringify({
        type: 'online',
        processing_mode: 'manual',
        total_amount: amount,
        external_reference: order.id,
        description: 'Nival Pay · tarjeta NFC + página',
        ...(user.email ? { payer: { email: user.email } } : {}),
        items: [{
          external_code: NIVAL_PAY_PRODUCT,
          title: 'Nival Pay · tarjeta NFC + página',
          quantity: 1,
          unit_measure: 'unit',
          unit_price: amount,
          total_amount: amount,
        }],
        config: {
          online: {
            success_url: `${origin}/checkout?result=success`,
            pending_url: `${origin}/checkout?result=pending`,
            failure_url: `${origin}/checkout?result=failure`,
            auto_return: 'approved',
          },
        },
      }),
      cache: 'no-store',
    });

    result = await response.json().catch(() => ({})) as MercadoPagoOrderCreateResponse;
    if (!response.ok || !result.id || !result.checkout_url) {
      throw new Error(`Mercado Pago order create failed with status ${response.status}`);
    }
  } catch (checkoutError) {
    console.error('Mercado Pago order error', checkoutError);
    await admin.from('product_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id);
    redirect('/checkout?error=No+se+pudo+abrir+Mercado+Pago.+Intenta+de+nuevo.');
  }

  // Reuse this provider field for the external Mercado Pago order id until the schema is renamed.
  await admin.from('product_orders').update({ provider_preference_id: result.id, updated_at: new Date().toISOString() }).eq('id', order.id);
  redirect(result.checkout_url!);
}

export async function requestCashPayment() {
  const { businessId } = await currentPurchaseContext();
  const admin = createAdminClient();
  const { error } = await admin.from('product_orders').insert({
    business_id: businessId,
    product_code: NIVAL_PAY_PRODUCT,
    amount_cents: NIVAL_PAY_PRICE_CENTS,
    payment_method: 'cash',
    status: 'pending_cash_confirmation',
  });
  if (error) redirect('/checkout?error=No+se+pudo+registrar+el+pago+en+efectivo.');
  redirect('/checkout?result=cash');
}
