'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NIVAL_PAY_PRICE_CENTS, NIVAL_PAY_PRODUCT, NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS, NIVAL_PAY_EXTRA_SECTION_PRODUCT } from '@/lib/orders';
import { isValidClabe } from '@/lib/payment-profile';

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
  message?: string;
  error?: string;
  cause?: Array<{ code?: string; description?: string }>;
  code?: unknown;
  errors?: unknown;
  details?: unknown;
};

function shortText(value: unknown) {
  return typeof value === 'string'
    ? value.slice(0, 300).replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    : null;
}

function safeValidationMetadata(value: unknown, depth = 0): unknown {
  if (depth > 2) return '[max-depth]';
  if (typeof value === 'string') return shortText(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => safeValidationMetadata(item, depth + 1));
  }
  if (!value || typeof value !== 'object') return null;

  const blockedKey = /(authorization|token|password|secret|email|payer|card|clabe|value|input|request)/i;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !blockedKey.test(key))
      .slice(0, 15)
      .map(([key, item]) => [key, safeValidationMetadata(item, depth + 1)]),
  );
}

function summarizeValidationEntries(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 5).map((entry) => {
    if (!entry || typeof entry !== 'object') return { value: shortText(entry) };
    const item = entry as Record<string, unknown>;
    return {
      keys: Object.keys(item).slice(0, 20),
      code: shortText(item.code),
      message: shortText(item.message),
      field: shortText(item.field),
      path: shortText(item.path),
      details: safeValidationMetadata(item.details),
      unsupportedProperties: safeValidationMetadata(
        item.unsupported_properties ?? item.unsupportedProperties ?? item.properties,
      ),
    };
  });
}

export async function startMercadoPagoCheckout() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) redirect('/checkout?error=Mercado+Pago+aún+no+está+configurado.');
  const { businessId } = await currentPurchaseContext();
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
        // The payer must match the Mercado Pago buyer test user. A generic test email
        // lets the order open, but Mercado Pago can leave every payment method disabled.
        payer: { email: 'test_user_1348852238063419528@testuser.com' },
        items: [{
          external_code: NIVAL_PAY_PRODUCT,
          title: 'Nival Pay · tarjeta NFC + página',
          quantity: 1,
          unit_price: amount,
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
      const validationSummary = {
        status: response.status,
        error: result.error ?? null,
        message: result.message ?? null,
        cause: Array.isArray(result.cause) ? result.cause.slice(0, 5) : [],
        responseKeys: Object.keys(result).slice(0, 20),
        code: shortText(result.code),
        errors: summarizeValidationEntries(result.errors),
        details: summarizeValidationEntries(result.details),
      };
      console.error(
        '[checkout] Mercado Pago order create rejected',
        JSON.stringify(validationSummary),
      );
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

export interface CheckoutBankState {
  error?: string;
  saved?: boolean;
  token?: string;
}

export async function completeCheckoutBankProfile(
  _state: CheckoutBankState,
  form: FormData,
): Promise<CheckoutBankState> {
  const { businessId } = await currentPurchaseContext();
  const supabase = await createClient();
  const holder = String(form.get('accountHolder') ?? '').trim();
  const bank = String(form.get('bankName') ?? '').trim();
  const clabe = String(form.get('clabe') ?? '').replace(/\D/g, '');

  if (holder.length < 2 || holder.length > 120) {
    return { error: 'Escribe el nombre completo del titular.' };
  }
  if (bank.length < 2 || bank.length > 80) {
    return { error: 'Selecciona un banco.' };
  }
  if (!/^\d{18}$/.test(clabe)) {
    return { error: 'La CLABE debe contener exactamente 18 dígitos.' };
  }
  if (!isValidClabe(clabe)) {
    return { error: 'La CLABE no es válida. Revisa los 18 dígitos.' };
  }

  const { data: paidOrder } = await supabase.from('product_orders')
    .select('id')
    .eq('business_id', businessId)
    .eq('product_code', NIVAL_PAY_PRODUCT)
    .eq('status', 'paid')
    .limit(1)
    .maybeSingle();
  if (!paidOrder) return { error: 'Primero necesitamos confirmar tu pago.' };

  const { data, error } = await supabase.from('payment_profiles').upsert({
    business_id: businessId,
    account_holder: holder,
    bank_name: bank,
    clabe,
    active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id' }).select('public_token').single();

  if (error || !data) return { error: 'No pudimos guardar los datos. Intenta nuevamente.' };
  return { saved: true, token: data.public_token };
}

export async function startExtraSectionCheckout() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) redirect('/dashboard/pay?error=Mercado+Pago+aún+no+está+configurado.');
  const { businessId } = await currentPurchaseContext();
  const admin = createAdminClient();
  const { data: order, error } = await admin.from('product_orders').insert({
    business_id: businessId, product_code: NIVAL_PAY_EXTRA_SECTION_PRODUCT,
    amount_cents: NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS, payment_method: 'mercado_pago', status: 'pending',
  }).select('id').single();
  if (error || !order) redirect('/dashboard/pay?error=No+se+pudo+crear+la+orden.');
  const requestHeaders = await headers();
  const origin = requestHeaders.get('origin') ?? 'https://nival-tech-platform.vercel.app';
  const amount = (NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS / 100).toFixed(2);
  const response = await fetch('https://api.mercadopago.com/v1/orders', {
    method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-Idempotency-Key':order.id},
    body:JSON.stringify({
      type:'online', processing_mode:'manual', total_amount:amount, external_reference:order.id,
      description:'Nival Pay · apartado adicional',
      payer:{email:'test_user_1348852238063419528@testuser.com'},
      items:[{external_code:NIVAL_PAY_EXTRA_SECTION_PRODUCT,title:'Nival Pay · apartado adicional',quantity:1,unit_price:amount}],
      config:{online:{success_url:`${origin}/dashboard/pay?purchase=success`,pending_url:`${origin}/dashboard/pay?purchase=pending`,failure_url:`${origin}/dashboard/pay?purchase=failure`,auto_return:'approved'}}
    }), cache:'no-store'
  });
  const result = await response.json().catch(()=>({})) as MercadoPagoOrderCreateResponse;
  if (!response.ok || !result.id || !result.checkout_url) {
    await admin.from('product_orders').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',order.id);
    redirect('/dashboard/pay?error=No+se+pudo+abrir+Mercado+Pago.');
  }
  await admin.from('product_orders').update({provider_preference_id:result.id,updated_at:new Date().toISOString()}).eq('id',order.id);
  redirect(result.checkout_url);
}
