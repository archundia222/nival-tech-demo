'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NIVAL_PAY_PRICE_CENTS, NIVAL_PAY_PRODUCT } from '@/lib/orders';

async function currentPurchaseContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?mode=signup&next=%2Fcheckout');
  const { data: membership } = await supabase.from('business_members')
    .select('business_id, businesses(name)').eq('user_id', user.id).limit(1).maybeSingle();
  // /dashboard/pay is an allowed onboarding destination and redirects unpaid customers back to checkout.
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Fpay');
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  return { user, businessId: membership.business_id, businessName: business?.name ?? 'Mi negocio' };
}

export async function startMercadoPagoCheckout() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) redirect('/checkout?error=Mercado+Pago+aún+no+está+configurado.');
  const { user, businessId, businessName } = await currentPurchaseContext();
  const admin = createAdminClient();
  const { data: order, error } = await admin.from('product_orders').insert({
    business_id: businessId,
    product_code: NIVAL_PAY_PRODUCT,
    amount_cents: NIVAL_PAY_PRICE_CENTS,
    payment_method: 'mercado_pago',
    status: 'pending',
  }).select('id').single();
  if (error || !order) redirect('/checkout?error=No+se+pudo+crear+la+orden.');

  const requestHeaders = await headers();
  const origin = requestHeaders.get('origin') ?? 'https://nival-tech-platform.vercel.app';
  const preference = new Preference(new MercadoPagoConfig({ accessToken: token }));
  let result;
  try {
    result = await preference.create({
      body: {
        items: [{ id: NIVAL_PAY_PRODUCT, title: 'Nival Pay · tarjeta NFC + página', quantity: 1, currency_id: 'MXN', unit_price: NIVAL_PAY_PRICE_CENTS / 100 }],
        payer: { email: user.email },
        external_reference: order.id,
        back_urls: {
          success: `${origin}/checkout?result=success`,
          pending: `${origin}/checkout?result=pending`,
          failure: `${origin}/checkout?result=failure`,
        },
        auto_return: 'approved',
        notification_url: `${origin}/api/mercado-pago/webhook`,
        statement_descriptor: 'NIVAL TECH',
        metadata: { business_id: businessId, business_name: businessName, product_code: NIVAL_PAY_PRODUCT },
      },
      requestOptions: { idempotencyKey: order.id },
    });
  } catch (checkoutError) {
    console.error('Mercado Pago preference error', checkoutError);
    await admin.from('product_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id);
    redirect('/checkout?error=No+se+pudo+abrir+Mercado+Pago.+Intenta+de+nuevo.');
  }
  await admin.from('product_orders').update({ provider_preference_id: result.id, updated_at: new Date().toISOString() }).eq('id', order.id);
  if (!result.init_point) redirect('/checkout?error=Mercado+Pago+no+devolvió+un+enlace+de+pago.');
  redirect(result.init_point);
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
