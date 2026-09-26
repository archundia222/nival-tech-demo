'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NIVAL_PAY_PRICE_CENTS, NIVAL_PAY_PRODUCT, NIVAL_PAY_ADDITIONAL_PRICE_CENTS, NIVAL_PAY_ADDITIONAL_PRODUCT, NIVAL_PAY_INCLUDED_SECTIONS, NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS, NIVAL_PAY_EXTRA_SECTION_PRODUCT, NIVAL_POINTS_PRODUCT, NIVAL_INTELLIGENCE_PRODUCT, NIVAL_POINTS_INTELLIGENCE_PRODUCT, NIVAL_POINTS_PRICE_CENTS, NIVAL_INTELLIGENCE_PRICE_CENTS, NIVAL_POINTS_INTELLIGENCE_PRICE_CENTS, NIVAL_GROWTH_UPGRADE_PRODUCT, NIVAL_GROWTH_UPGRADE_PRICE_CENTS, NIVAL_PAY_PHYSICAL_CARD_PRICE_CENTS, NIVAL_PAY_PHYSICAL_CARD_PRODUCT, NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRICE_CENTS, NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRODUCT, NIVAL_PAY_CARD_CUSTOMIZATION_PRICE_CENTS, NIVAL_PAY_CARD_CUSTOMIZATION_PRODUCT } from '@/lib/orders';
import { isValidClabe } from '@/lib/payment-profile';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { reconcileLatestSubscription } from '@/lib/reconcile-subscription';
import { reconcileLatestMercadoPagoProductOrder } from '@/lib/reconcile-mercado-pago-order';

async function currentPurchaseContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?mode=signup&next=%2Fcheckout');
  const membership = await getActiveBusinessMembership(user.id);
  // Purchases change the commercial state of the workspace, so staff cannot create them.
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Fpay');
  if (!['owner','manager'].includes(membership.role)) redirect('/dashboard?error=Solo+el+propietario+o+un+gerente+puede+realizar+compras.');
  return { user, businessId: membership.business_id, supabase };
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

type CheckoutProduct = {
  productCode: string;
  amountCents: number;
  description: string;
  returnPath: string;
  paymentProfileId?: string;
  physicalOrder?: Record<string, string | null>;
};

function checkoutReturnPath(returnPath: string, key: 'error' | 'result', value: string) {
  const url = new URL(returnPath, 'https://nival-tech-platform.vercel.app');
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function checkoutOrigin() {
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return (process.env.NIVAL_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || 'https://nival-tech-platform.vercel.app').replace(/\/$/, '');
}

const PHYSICAL_ORDER_MATCH_FIELDS = [
  'design','design_notes','front_template','back_style','back_design_notes',
  'delivery_method','recipient_name','phone','address_line1','address_line2',
  'city','state','postal_code','requested_delivery_date',
  'target_payment_profile_id','target_url','included_base_order_id',
] as const;

function physicalOrderMatches(
  existing: Record<string, unknown> | null,
  requested: Record<string, string | null>,
) {
  if (!existing) return false;
  return PHYSICAL_ORDER_MATCH_FIELDS.every((field) =>
    String(existing[field] ?? '') === String(requested[field] ?? ''),
  );
}

async function startMercadoPagoProductCheckout(product: CheckoutProduct): Promise<never> {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) redirect(checkoutReturnPath(product.returnPath, 'error', 'Mercado Pago aún no está configurado.'));
  const { user, businessId } = await currentPurchaseContext();
  const isPreviewCheckout = process.env.VERCEL_ENV === 'preview';
  const payerEmail = isPreviewCheckout
    ? process.env.MERCADO_PAGO_TEST_PAYER_EMAIL?.trim()
    : user.email?.trim();
  if (!isPreviewCheckout && !payerEmail) {
    redirect(checkoutReturnPath(product.returnPath, 'error', 'Tu cuenta necesita un correo para continuar con el pago.'));
  }
  const admin = createAdminClient();
  await reconcileLatestMercadoPagoProductOrder(businessId, { [product.productCode]: product.amountCents });
  if (product.productCode === NIVAL_PAY_PRODUCT) {
    const { data: purchased } = await admin.from('product_orders').select('id')
      .eq('business_id', businessId).eq('product_code', NIVAL_PAY_PRODUCT).eq('status', 'paid').limit(1).maybeSingle();
    if (purchased) redirect('/dashboard/pay?view=manage');
  }
  if (new Set([NIVAL_PAY_ADDITIONAL_PRODUCT, NIVAL_PAY_EXTRA_SECTION_PRODUCT, NIVAL_PAY_CARD_CUSTOMIZATION_PRODUCT]).has(product.productCode)) {
    const { data: baseOrder } = await admin.from('product_orders').select('id')
      .eq('business_id', businessId)
      .eq('product_code', NIVAL_PAY_PRODUCT)
      .eq('status', 'paid')
      .limit(1)
      .maybeSingle();
    if (!baseOrder) {
      redirect(checkoutReturnPath('/checkout', 'error', 'Activa Nival Pay Pro antes de comprar herramientas adicionales.'));
    }
  }
  {
    let existingQuery = admin.from('product_orders')
      .select('id,checkout_url,created_at')
      .eq('business_id', businessId)
      .eq('product_code', product.productCode)
      .eq('payment_method', 'mercado_pago')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);
    existingQuery = product.paymentProfileId
      ? existingQuery.eq('payment_profile_id', product.paymentProfileId)
      : existingQuery.is('payment_profile_id', null);

    const { data: existingOrder } = await existingQuery.maybeSingle();
    if (existingOrder) {
      const { data: freshOrder } = await admin.from('product_orders').select('status')
        .eq('id', existingOrder.id).single();
      if (freshOrder?.status !== 'pending') redirect(product.returnPath);

      let samePhysicalOrder = true;
      if (product.physicalOrder) {
        const { data: existingPhysical } = await admin.from('physical_card_orders')
          .select(PHYSICAL_ORDER_MATCH_FIELDS.join(','))
          .eq('product_order_id', existingOrder.id)
          .maybeSingle();
        samePhysicalOrder = physicalOrderMatches(
          existingPhysical as Record<string, unknown> | null,
          product.physicalOrder,
        );
      }

      if (existingOrder.checkout_url && samePhysicalOrder) {
        const ageMs = Date.now() - new Date(existingOrder.created_at).getTime();
        const reuseWindowMs = product.physicalOrder ? 15 * 60 * 1000 : 6 * 60 * 60 * 1000;
        if (Number.isFinite(ageMs) && ageMs < reuseWindowMs) {
          redirect(existingOrder.checkout_url);
        }
      }

      if (product.physicalOrder) {
        await admin.from('physical_card_orders').delete().eq('product_order_id', existingOrder.id);
      }
      await admin.from('product_orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', existingOrder.id)
        .eq('status', 'pending');
    }
  }

  const { data: order, error } = await admin.from('product_orders').insert({
    business_id: businessId,
    product_code: product.productCode,
    amount_cents: product.amountCents,
    payment_method: 'mercado_pago',
    status: 'pending',
    payment_profile_id: product.paymentProfileId ?? null,
  }).select('id').single();
  if (error || !order) redirect(checkoutReturnPath(product.returnPath, 'error', 'No se pudo crear la orden.'));
  if (product.physicalOrder) {
    const { error: physicalError } = await admin.from('physical_card_orders').insert({
      ...product.physicalOrder,
      product_order_id: order.id,
      business_id: businessId,
    });
    if (physicalError) {
      await admin.from('product_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id);
      console.error('[physical-card] Order details save failed', { code: physicalError.code });
      redirect(checkoutReturnPath(product.returnPath, 'error', 'No se pudieron guardar los datos de entrega.'));
    }
  }

  const origin = checkoutOrigin();
  const amount = (product.amountCents / 100).toFixed(2);
  // In Preview/QA, never send the real Nival account email to a Mercado Pago
  // test seller. Mercado Pago rejects mixed real/test parties. A dedicated test
  // buyer email can be configured; otherwise Checkout will collect the test
  // buyer identity when the tester signs in.
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
        capture_mode: 'automatic_async',
        total_amount: amount,
        external_reference: order.id,
        description: product.description,
        ...(payerEmail ? { payer: { email: payerEmail } } : {}),
        items: [{
          external_code: product.productCode,
          title: product.description,
          quantity: 1,
          unit_price: amount,
        }],
        config: {
          online: {
            success_url: `${origin}${checkoutReturnPath(product.returnPath, 'result', 'success')}`,
            pending_url: `${origin}${checkoutReturnPath(product.returnPath, 'result', 'pending')}`,
            failure_url: `${origin}${checkoutReturnPath(product.returnPath, 'result', 'failure')}`,
            auto_return: 'approved',
          },
        },
      }),
      cache: 'no-store',
    });
    result = await response.json().catch(() => ({})) as MercadoPagoOrderCreateResponse;
    if (!response.ok || !result.id || !result.checkout_url) {
      console.error('[checkout] Mercado Pago order create rejected', JSON.stringify({
        status: response.status,
        error: result.error ?? null,
        message: result.message ?? null,
        cause: Array.isArray(result.cause) ? result.cause.slice(0, 5) : [],
        responseKeys: Object.keys(result).slice(0, 20),
        code: shortText(result.code),
        errors: summarizeValidationEntries(result.errors),
        details: summarizeValidationEntries(result.details),
      }));
      throw new Error(`Mercado Pago order create failed with status ${response.status}`);
    }
  } catch (checkoutError) {
    console.error('Mercado Pago order error', checkoutError);
    if (product.physicalOrder) {
      await admin.from('physical_card_orders').delete().eq('product_order_id', order.id);
    }
    await admin.from('product_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id);
    redirect(checkoutReturnPath(product.returnPath, 'error', 'No se pudo abrir Mercado Pago. Intenta de nuevo.'));
  }

  await admin.from('product_orders').update({
    provider_preference_id: result.id,
    checkout_url: result.checkout_url,
    updated_at: new Date().toISOString(),
  }).eq('id', order.id);
  redirect(result.checkout_url!);
}

export async function startMercadoPagoCheckout() {
  return startMercadoPagoProductCheckout({
    productCode: NIVAL_PAY_PRODUCT,
    amountCents: NIVAL_PAY_PRICE_CENTS,
    description: 'Nival Pay Pro · NFC + QR + página',
    returnPath: '/checkout',
  });
}
export async function startAdditionalNivalPayCheckout() {
  return startMercadoPagoProductCheckout({
    productCode: NIVAL_PAY_ADDITIONAL_PRODUCT,
    amountCents: NIVAL_PAY_ADDITIONAL_PRICE_CENTS,
    description: 'Nival Pay · página de cobro adicional',
    returnPath: '/dashboard/pay?view=add',
  });
}

export async function requestCashPayment() {
  const { businessId } = await currentPurchaseContext();
  const admin = createAdminClient();
  const { data: alreadyPaid } = await admin.from('product_orders').select('id')
    .eq('business_id', businessId)
    .eq('product_code', NIVAL_PAY_PRODUCT)
    .eq('status', 'paid')
    .limit(1)
    .maybeSingle();
  if (alreadyPaid) redirect('/dashboard/pay?view=manage');

  const { data: existing } = await admin.from('product_orders').select('id,created_at')
    .eq('business_id', businessId)
    .eq('product_code', NIVAL_PAY_PRODUCT)
    .eq('payment_method', 'cash')
    .eq('status', 'pending_cash_confirmation')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) redirect('/checkout?result=cash');

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
  const { businessId, supabase } = await currentPurchaseContext();
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

  // A business can now own several Nival Pay profiles, so business_id is no
  // longer a unique conflict target. Update the first profile created by the
  // payment activation RPC instead of using an upsert on business_id.
  const { data: existingProfile, error: profileLookupError } = await supabase
    .from('payment_profiles')
    .select('id')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (profileLookupError) {
    console.error('[checkout] Payment profile lookup failed', {
      businessId,
      code: profileLookupError.code,
      message: profileLookupError.message,
    });
    return { error: 'No pudimos guardar los datos. Intenta nuevamente.' };
  }

  const profileValues = {
    business_id: businessId,
    account_holder: holder,
    bank_name: bank,
    clabe,
    active: true,
    updated_at: new Date().toISOString(),
  };
  const result = existingProfile
    ? await supabase.from('payment_profiles').update(profileValues)
      .eq('id', existingProfile.id)
      .eq('business_id', businessId)
      .select('public_token')
      .single()
    : await supabase.from('payment_profiles').insert(profileValues)
      .select('public_token')
      .single();

  if (result.error || !result.data) {
    console.error('[checkout] Payment profile save failed', {
      businessId,
      profileId: existingProfile?.id ?? null,
      code: result.error?.code ?? null,
      message: result.error?.message ?? null,
    });
    return { error: 'No pudimos guardar los datos. Intenta nuevamente.' };
  }
  return { saved: true, token: result.data.public_token };
}

async function startExtraSectionCheckoutForId(paymentProfileId: string) {
  if (!paymentProfileId) redirect('/dashboard/pay?error=Selecciona+la+Nival+Pay+para+el+apartado.');

  // Mercado Pago can redirect back before its webhook finishes, leaving the
  // browser with the pre-payment React state. Re-check the entitlement on the
  // server so a stale purchase button cannot open a second checkout.
  const { businessId, supabase } = await currentPurchaseContext();
  const { data: profile, error: profileError } = await supabase.from('payment_profiles')
    .select('id, custom_sections, extra_sections_purchased')
    .eq('id', paymentProfileId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (profileError || !profile) {
    console.error('[checkout] Payment profile lookup failed', {
      businessId,
      paymentProfileId,
      code: profileError?.code ?? null,
      message: profileError?.message ?? null,
    });
    redirect(`/dashboard/pay?view=manage&profile=${encodeURIComponent(paymentProfileId)}&error=No+encontramos+esa+Nival+Pay.`);
  }

  const savedSections = Array.isArray(profile.custom_sections) ? profile.custom_sections.length : 0;
  const sectionLimit = NIVAL_PAY_INCLUDED_SECTIONS + Number(profile.extra_sections_purchased ?? 0);
  if (savedSections < sectionLimit) {
    revalidatePath('/dashboard/pay');
    redirect(`/dashboard/pay?view=manage&profile=${encodeURIComponent(profile.id)}&unlocked=1`);
  }

  return startMercadoPagoProductCheckout({
    productCode: NIVAL_PAY_EXTRA_SECTION_PRODUCT,
    amountCents: NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS,
    description: 'Nival Pay · página de cobro adicional',
    returnPath: `/dashboard/pay?view=manage&profile=${encodeURIComponent(profile.id)}`,
    paymentProfileId: profile.id,
  });
}

export async function startExtraSectionCheckout(formData?: FormData) {
  const paymentProfileId = formData instanceof FormData ? String(formData.get('profileId') ?? '') : '';
  return startExtraSectionCheckoutForId(paymentProfileId);
}

export async function startExtraSectionCheckoutForProfile(paymentProfileId: string) {
  return startExtraSectionCheckoutForId(paymentProfileId);
}

type SubscriptionProduct = {
  productCode: typeof NIVAL_POINTS_PRODUCT | typeof NIVAL_INTELLIGENCE_PRODUCT | typeof NIVAL_POINTS_INTELLIGENCE_PRODUCT | typeof NIVAL_GROWTH_UPGRADE_PRODUCT;
  amountCents: number;
  reason: string;
};

async function startMercadoPagoSubscription(product: SubscriptionProduct): Promise<never> {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const { user, businessId } = await currentPurchaseContext();
  const returnPath = product.productCode === NIVAL_POINTS_PRODUCT ? '/dashboard/points' : '/dashboard/intelligence';
  if (!token) redirect(`${returnPath}?error=Mercado+Pago+aún+no+está+configurado.`);
  if (!user.email) redirect(`${returnPath}?error=Tu+cuenta+necesita+un+correo+para+crear+la+suscripción.`);

  const admin = createAdminClient();
  const { data: subscriptionHistory } = await admin.from('product_subscriptions')
    .select('id,status,checkout_url,created_at,current_period_end')
    .eq('business_id', businessId)
    .eq('product_code', product.productCode)
    .in('status', ['pending','authorized','paused','cancelled'])
    .order('created_at', { ascending: false })
    .limit(20);

  const nowMs = Date.now();
  const authorizedSubscription = (subscriptionHistory ?? []).find((item) => item.status === 'authorized');
  const remainingPaidSubscription = (subscriptionHistory ?? []).find((item) =>
    ['paused','cancelled'].includes(item.status)
    && Boolean(item.current_period_end)
    && new Date(item.current_period_end as string).getTime() > nowMs
  );
  const pendingSubscription = (subscriptionHistory ?? []).find((item) => item.status === 'pending');

  if (authorizedSubscription || remainingPaidSubscription) {
    redirect(`${returnPath}?subscription=active`);
  }
  if (pendingSubscription) {
    const ageMs = nowMs - new Date(pendingSubscription.created_at).getTime();
    if (pendingSubscription.checkout_url && Number.isFinite(ageMs) && ageMs < 6 * 60 * 60 * 1000) {
      redirect(pendingSubscription.checkout_url);
    }
    await admin.from('product_subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', pendingSubscription.id)
      .eq('status', 'pending');
  }

  const { data: subscription, error: insertError } = await admin.from('product_subscriptions').insert({
    business_id: businessId,
    product_code: product.productCode,
    amount_cents: product.amountCents,
    status: 'pending',
  }).select('id').single();
  if (insertError || !subscription) redirect(`${returnPath}?error=No+se+pudo+preparar+la+suscripción.`);

  const origin = checkoutOrigin();
  const response = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: product.reason,
      external_reference: subscription.id,
      payer_email: user.email,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: product.amountCents / 100,
        currency_id: 'MXN',
      },
      back_url: `${origin}${returnPath}?subscription=return`,
      status: 'pending',
    }),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({})) as { id?: string; init_point?: string; message?: string };
  if (!response.ok || !result.id || !result.init_point) {
    console.error('[subscriptions] Mercado Pago rejected subscription', { status: response.status, message: result.message ?? null });
    await admin.from('product_subscriptions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', subscription.id);
    redirect(`${returnPath}?error=No+se+pudo+abrir+la+suscripción+de+Mercado+Pago.`);
  }

  await admin.from('product_subscriptions').update({
    provider_subscription_id: result.id,
    checkout_url: result.init_point,
    updated_at: new Date().toISOString(),
  }).eq('id', subscription.id);
  redirect(result.init_point);
}

export async function startNivalPointsSubscription() {
  const { businessId } = await currentPurchaseContext();
  await reconcileLatestSubscription(businessId);
  const admin = createAdminClient();
  const { data: growthSubscription } = await admin.from('product_subscriptions')
    .select('id,product_code,status,checkout_url,current_period_end')
    .eq('business_id', businessId)
    .in('product_code', [NIVAL_POINTS_INTELLIGENCE_PRODUCT, NIVAL_GROWTH_UPGRADE_PRODUCT, NIVAL_INTELLIGENCE_PRODUCT])
    .in('status', ['pending','authorized','paused','cancelled'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const growthPeriodEnd = growthSubscription?.current_period_end ? new Date(growthSubscription.current_period_end).getTime() : 0;
  if (growthSubscription?.status === 'authorized'
      || (['paused','cancelled'].includes(growthSubscription?.status ?? '') && growthPeriodEnd > Date.now())) {
    redirect('/dashboard/points?subscription=active');
  }
  if (growthSubscription?.status === 'pending' && growthSubscription.checkout_url) redirect(growthSubscription.checkout_url);
  if (growthSubscription?.status === 'pending') {
    await admin.from('product_subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', growthSubscription.id)
      .eq('status', 'pending');
  }
  return startMercadoPagoSubscription({ productCode: NIVAL_POINTS_PRODUCT, amountCents: NIVAL_POINTS_PRICE_CENTS, reason: 'Nival Puntos · plan mensual' });
}

export async function startNivalGrowthSubscription() {
  const { businessId } = await currentPurchaseContext();

  // A customer may return from the Puntos checkout and immediately upgrade.
  // Reconcile first so an already-authorized $199 subscription is never
  // mistaken for Free/trial and charged the full $449 Growth amount.
  await reconcileLatestSubscription(businessId);

  const admin = createAdminClient();
  const { data: existingGrowthSubscription } = await admin.from('product_subscriptions')
    .select('id,product_code,status,checkout_url,current_period_end')
    .eq('business_id', businessId)
    .in('product_code', [NIVAL_POINTS_INTELLIGENCE_PRODUCT, NIVAL_GROWTH_UPGRADE_PRODUCT, NIVAL_INTELLIGENCE_PRODUCT])
    .in('status', ['pending','authorized','paused','cancelled'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const existingGrowthPeriodEnd = existingGrowthSubscription?.current_period_end
    ? new Date(existingGrowthSubscription.current_period_end).getTime()
    : 0;
  if (existingGrowthSubscription?.status === 'authorized'
      || (['paused','cancelled'].includes(existingGrowthSubscription?.status ?? '') && existingGrowthPeriodEnd > Date.now())) {
    redirect('/dashboard/intelligence?subscription=active');
  }
  if (existingGrowthSubscription?.status === 'pending' && existingGrowthSubscription.checkout_url) {
    redirect(existingGrowthSubscription.checkout_url);
  }
  if (existingGrowthSubscription?.status === 'pending') {
    await admin.from('product_subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', existingGrowthSubscription.id)
      .eq('status', 'pending');
  }

  const [{ data: points }, { data: pointsSubscriptionHistory }] = await Promise.all([
    admin.from('business_product_entitlements').select('status')
      .eq('business_id', businessId).eq('product_code', NIVAL_POINTS_PRODUCT).maybeSingle(),
    admin.from('product_subscriptions').select('id,status,checkout_url,current_period_end,created_at')
      .eq('business_id', businessId)
      .eq('product_code', NIVAL_POINTS_PRODUCT)
      .in('status', ['pending','authorized','paused','cancelled'])
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const paidPointsSubscription = (pointsSubscriptionHistory ?? []).find((item) => item.status === 'authorized') ?? null;
  const pendingPointsSubscription = (pointsSubscriptionHistory ?? []).find((item) => item.status === 'pending') ?? null;
  const gracePointsSubscription = (pointsSubscriptionHistory ?? []).find((item) =>
    ['paused','cancelled'].includes(item.status)
    && Boolean(item.current_period_end)
    && new Date(item.current_period_end as string).getTime() > Date.now()
  ) ?? null;

  if (pendingPointsSubscription?.checkout_url) {
    redirect(pendingPointsSubscription.checkout_url);
  }
  if (pendingPointsSubscription) {
    await admin.from('product_subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', pendingPointsSubscription.id)
      .eq('status', 'pending');
  }
  if (gracePointsSubscription && !paidPointsSubscription) {
    redirect('/dashboard/intelligence?error=Tu+plan+de+Puntos+está+cancelado+o+pausado,+pero+sigue+activo+hasta+el+fin+del+periodo+pagado.+Growth+se+puede+activar+cuando+Puntos+vuelva+a+tener+renovación+activa.');
  }

  if (!points || !['free', 'active'].includes(points.status)) {
    redirect('/dashboard/points?error=Activa+Nival+Puntos+primero.+Growth+incluye+Puntos+e+Intelligence.');
  }

  return startMercadoPagoSubscription(paidPointsSubscription
    ? {
        productCode: NIVAL_GROWTH_UPGRADE_PRODUCT,
        amountCents: NIVAL_GROWTH_UPGRADE_PRICE_CENTS,
        reason: 'Nival Growth · complemento Intelligence para Nival Puntos Pro',
      }
    : {
        productCode: NIVAL_POINTS_INTELLIGENCE_PRODUCT,
        amountCents: NIVAL_POINTS_INTELLIGENCE_PRICE_CENTS,
        reason: 'Nival Growth · Nival Puntos Pro + Intelligence',
      });
}

type PhysicalCardInput = {
  design: 'black' | 'white' | 'custom';
  design_notes: string | null;
  front_template: 'pay' | 'points' | 'reviews' | 'profile';
  back_style: 'nival' | 'custom';
  back_design_notes: string | null;
  back_design_url: string | null;
  delivery_method: 'sunday_local' | 'shipping';
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  requested_delivery_date: string | null;
  target_payment_profile_id: string | null;
  target_url: string | null;
};

function validateRequestedSunday(form: FormData) {
  const delivery = String(form.get('deliveryMethod') ?? '');
  const requestedDate = String(form.get('requestedDeliveryDate') ?? '').trim();
  if (delivery !== 'sunday_local' || !requestedDate) return;
  const parsed = new Date(requestedDate + 'T12:00:00Z');
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCDay() !== 0) {
    redirect('/dashboard/pay/physical?error=La+entrega+local+solo+se+programa+en+domingo.+Elige+un+domingo+o+deja+la+fecha+vacía.');
  }
}

function readPhysicalCardInput(form: FormData): PhysicalCardInput | null {
  const design = String(form.get('design') ?? '');
  const frontTemplate = String(form.get('frontTemplate') ?? 'pay');
  const backStyle = String(form.get('backStyle') ?? 'nival');
  const backDesignNotes = String(form.get('backDesignNotes') ?? '').trim();
  const delivery = String(form.get('deliveryMethod') ?? '');
  const recipient = String(form.get('recipientName') ?? '').trim();
  const phone = String(form.get('phone') ?? '').replace(/[^0-9+]/g, '');
  const address1 = String(form.get('addressLine1') ?? '').trim();
  const address2 = String(form.get('addressLine2') ?? '').trim();
  const city = String(form.get('city') ?? '').trim();
  const state = String(form.get('state') ?? '').trim();
  const postalCode = String(form.get('postalCode') ?? '').trim();
  const notes = String(form.get('designNotes') ?? '').trim();
  const requestedDate = String(form.get('requestedDeliveryDate') ?? '').trim();
  const targetPaymentProfileId = String(form.get('paymentProfileId') ?? '').trim() || null;
  if (!['black','white','custom'].includes(design) || !['pay','points','reviews','profile'].includes(frontTemplate)
    || !['nival','custom'].includes(backStyle) || !['sunday_local','shipping'].includes(delivery)
    || recipient.length < 2 || phone.length < 10 || address1.length < 5 || city.length < 2
    || state.length < 2 || !/^\d{5}$/.test(postalCode) || notes.length > 500 || backDesignNotes.length > 500) return null;
  if (delivery === 'sunday_local' && requestedDate) {
    const parsed = new Date(requestedDate + 'T12:00:00Z');
    if (Number.isNaN(parsed.getTime()) || parsed.getUTCDay() !== 0) return null;
  }
  return {
    design: design as PhysicalCardInput['design'], design_notes: notes || null,
    front_template: frontTemplate as PhysicalCardInput['front_template'],
    back_style: backStyle as PhysicalCardInput['back_style'],
    back_design_notes: backStyle === 'custom' ? backDesignNotes || null : null,
    back_design_url: null,
    delivery_method: delivery as PhysicalCardInput['delivery_method'],
    recipient_name: recipient.slice(0,120), phone: phone.slice(0,20),
    address_line1: address1.slice(0,180), address_line2: address2.slice(0,180) || null,
    city: city.slice(0,100), state: state.slice(0,100), postal_code: postalCode,
    requested_delivery_date: delivery === 'sunday_local' ? requestedDate || null : null,
    target_payment_profile_id: targetPaymentProfileId,
    target_url: null,
  };
}

async function attachPhysicalCardArtwork(businessId: string, form: FormData, details: PhysicalCardInput) {
  if (details.back_style !== 'custom') return { ...details, back_design_url: null };
  const file = form.get('backDesign');
  if (!(file instanceof File) || file.size === 0) return details;
  if (file.size > 4 * 1024 * 1024) redirect('/dashboard/pay/physical?error=La+imagen+del+reverso+debe+pesar+menos+de+4+MB.');

  const bytes = new Uint8Array(await file.arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const pngSignature = [137,80,78,71,13,10,26,10];
  const png = bytes.length >= 8 && pngSignature.every((value,index) => bytes[index] === value);
  const riff = bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP';
  const contentType = jpeg ? 'image/jpeg' : png ? 'image/png' : riff ? 'image/webp' : null;
  if (!contentType || contentType !== file.type) redirect('/dashboard/pay/physical?error=Sube+una+imagen+JPG,+PNG+o+WebP+válida.');

  const ext = contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/png' ? 'png' : 'webp';
  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from('card-designs').upload(path, bytes, { contentType, upsert: false });
  if (error) redirect('/dashboard/pay/physical?error=No+pudimos+subir+el+diseño+del+reverso.');
  const backDesignUrl = admin.storage.from('card-designs').getPublicUrl(path).data.publicUrl;
  return { ...details, back_design_url: backDesignUrl };
}

async function resolvePhysicalCardDestination(businessId: string, details: PhysicalCardInput) {
  const admin = createAdminClient();
  const siteUrl = (process.env.NIVAL_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || 'https://nival-tech-platform.vercel.app').replace(/\/$/, '');
  const { data: business } = await admin.from('businesses').select('slug').eq('id', businessId).maybeSingle();
  if (!business?.slug) redirect('/dashboard/pay/physical?error=No+pudimos+resolver+el+destino+de+la+tarjeta.');

  if (details.front_template === 'pay') {
    let query = admin.from('payment_profiles').select('id, public_token').eq('business_id', businessId).eq('active', true);
    if (details.target_payment_profile_id) query = query.eq('id', details.target_payment_profile_id);
    const { data: profile } = await query.order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (!profile?.public_token) redirect('/dashboard/pay/physical?error=Primero+configura+la+página+Nival+Pay+que+abrirá+esta+tarjeta.');
    return { ...details, target_payment_profile_id: profile.id, target_url: `${siteUrl}/pay/${profile.public_token}` };
  }

  if (details.front_template === 'points') {
    const [{ data: entitlement }, { data: program }] = await Promise.all([
      admin.from('business_product_entitlements').select('status')
        .eq('business_id', businessId).eq('product_code', NIVAL_POINTS_PRODUCT).in('status', ['active','free']).maybeSingle(),
      admin.from('loyalty_programs').select('id')
        .eq('business_id', businessId).eq('active', true).order('created_at', { ascending: true }).limit(1).maybeSingle(),
    ]);
    if (!entitlement) redirect('/dashboard/pay/physical?error=Activa+Nival+Puntos+antes+de+pedir+una+tarjeta+para+puntos.');
    if (!program) redirect('/dashboard/pay/physical?error=Configura+primero+tu+programa+de+Nival+Puntos.');
    return { ...details, target_payment_profile_id: null, target_url: `${siteUrl}/b/${business.slug}?from=nfc` };
  }

  if (details.front_template === 'reviews') {
    const [{ data: reviewLink }, { data: program }] = await Promise.all([
      admin.from('smart_links').select('id').eq('business_id', businessId).eq('kind', 'google_review').eq('active', true).limit(1).maybeSingle(),
      admin.from('loyalty_programs').select('review_url').eq('business_id', businessId).eq('active', true).limit(1).maybeSingle(),
    ]);
    if (!reviewLink && !program?.review_url) redirect('/dashboard/pay/physical?error=Configura+primero+el+enlace+de+reseñas+del+negocio.');
    return { ...details, target_payment_profile_id: null, target_url: `${siteUrl}/r/${business.slug}` };
  }

  return { ...details, target_payment_profile_id: null, target_url: `${siteUrl}/p/${business.slug}` };
}

export async function startPhysicalCardCheckout(form: FormData) {
  validateRequestedSunday(form);
  const rawDetails = readPhysicalCardInput(form);
  if (!rawDetails) redirect('/dashboard/pay/physical?error=Revisa+los+datos+de+diseño+y+entrega.');
  const { businessId } = await currentPurchaseContext();
  const targetedDetails = await resolvePhysicalCardDestination(businessId, rawDetails);
  const details = await attachPhysicalCardArtwork(businessId, form, targetedDetails);
  const customBack = details.back_style === 'custom';

  const admin = createAdminClient();
  const desiredProductCode = customBack ? NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRODUCT : NIVAL_PAY_PHYSICAL_CARD_PRODUCT;
  const { data: conflictingPending } = await admin.from('product_orders')
    .select('id,product_code')
    .eq('business_id', businessId)
    .in('product_code', [NIVAL_PAY_PHYSICAL_CARD_PRODUCT, NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRODUCT])
    .eq('payment_method', 'mercado_pago')
    .eq('status', 'pending')
    .neq('product_code', desiredProductCode);
  for (const order of conflictingPending ?? []) {
    await admin.from('physical_card_orders').delete().eq('product_order_id', order.id);
    await admin.from('product_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'pending');
  }

  return startMercadoPagoProductCheckout({
    productCode: customBack ? NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRODUCT : NIVAL_PAY_PHYSICAL_CARD_PRODUCT,
    amountCents: customBack ? NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRICE_CENTS : NIVAL_PAY_PHYSICAL_CARD_PRICE_CENTS,
    description: customBack ? 'Nival Pay · tarjeta NFC + reverso personalizado' : 'Nival Pay · tarjeta física NFC',
    returnPath: '/dashboard/pay/physical',
    physicalOrder: details,
  });
}

export async function claimIncludedPhysicalCard(form: FormData) {
  validateRequestedSunday(form);
  const rawDetails = readPhysicalCardInput(form);
  if (!rawDetails) redirect('/dashboard/pay/physical?error=Revisa+los+datos+de+diseño+y+entrega.');
  const { businessId } = await currentPurchaseContext();
  const targetedDetails = await resolvePhysicalCardDestination(businessId, rawDetails);
  const details = await attachPhysicalCardArtwork(businessId, form, targetedDetails);
  const admin = createAdminClient();
  const [{ data: paidOrders, error: paidError }, { data: existingCards, error: cardsError }] = await Promise.all([
    admin.from('product_orders')
      .select('id, provider_preference_id')
      .eq('business_id', businessId)
      .eq('product_code', NIVAL_PAY_PRODUCT)
      .eq('amount_cents', NIVAL_PAY_PRICE_CENTS)
      .eq('status', 'paid')
      .order('paid_at', { ascending: true }),
    admin.from('physical_card_orders').select('product_order_id, included_base_order_id, created_at, product_orders!physical_card_orders_product_order_id_fkey(status,created_at,checkout_url)').eq('business_id', businessId),
  ]);
  if (paidError || cardsError) redirect('/dashboard/pay/physical?error=No+pudimos+validar+tu+tarjeta+incluida.');
  const claimedOrderIds = new Set((existingCards ?? []).filter((card) => {
    const linked = Array.isArray(card.product_orders) ? card.product_orders[0] : card.product_orders;
    return linked?.status === 'paid';
  }).map((card) => card.included_base_order_id ?? card.product_order_id));

  const pendingIncluded = (existingCards ?? []).find((card) => {
    const linked = Array.isArray(card.product_orders) ? card.product_orders[0] : card.product_orders;
    const baseOrderId = card.included_base_order_id ?? card.product_order_id;
    return linked?.status === 'pending' && paidOrders?.some((order) => order.id === baseOrderId);
  });
  if (pendingIncluded) {
    const linked = Array.isArray(pendingIncluded.product_orders) ? pendingIncluded.product_orders[0] : pendingIncluded.product_orders;
    const createdAt = linked?.created_at ?? pendingIncluded.created_at;
    const ageMs = createdAt ? Date.now() - new Date(createdAt).getTime() : Number.POSITIVE_INFINITY;
    if (Number.isFinite(ageMs) && ageMs < 15 * 60 * 1000) {
      if (linked?.checkout_url) redirect(linked.checkout_url);
      redirect('/dashboard/pay/physical?result=pending');
    }
    await admin.from('physical_card_orders').delete().eq('product_order_id', pendingIncluded.product_order_id);
    await admin.from('product_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', pendingIncluded.product_order_id)
      .eq('status', 'pending');
  }

  const includedOrder = paidOrders?.find((order) => !claimedOrderIds.has(order.id));
  if (!includedOrder) redirect('/dashboard/pay/physical?error=No+encontramos+una+tarjeta+incluida+pendiente.');
  if (details.back_style === 'custom') {
    return startMercadoPagoProductCheckout({
      productCode: NIVAL_PAY_CARD_CUSTOMIZATION_PRODUCT,
      amountCents: NIVAL_PAY_CARD_CUSTOMIZATION_PRICE_CENTS,
      description: 'Nival Pay · reverso personalizado',
      returnPath: '/dashboard/pay/physical',
      physicalOrder: { ...details, included_base_order_id: includedOrder.id },
    });
  }
  const { error } = await admin.from('physical_card_orders').insert({
    ...details,
    included_base_order_id: includedOrder.id,
    product_order_id: includedOrder.id,
    business_id: businessId,
    fulfillment_status: 'confirmed',
  });
  if (error) {
    if (error.code === '23505') redirect('/dashboard/pay/physical?result=included');
    console.error('[physical-card] Included card claim failed', { code: error.code });
    redirect('/dashboard/pay/physical?error=No+se+pudieron+guardar+los+datos+de+entrega.');
  }
  redirect('/dashboard/pay/physical?result=included');
}

export async function requestPhysicalCardCashPayment(form: FormData) {
  validateRequestedSunday(form);
  const rawDetails = readPhysicalCardInput(form);
  if (!rawDetails) redirect('/dashboard/pay/physical?error=Revisa+los+datos+de+diseño+y+entrega.');
  const { businessId } = await currentPurchaseContext();
  const targetedDetails = await resolvePhysicalCardDestination(businessId, rawDetails);
  const details = await attachPhysicalCardArtwork(businessId, form, targetedDetails);
  const admin = createAdminClient();
  const customBack = details.back_style === 'custom';
  const productCode = customBack ? NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRODUCT : NIVAL_PAY_PHYSICAL_CARD_PRODUCT;
  const amountCents = customBack ? NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRICE_CENTS : NIVAL_PAY_PHYSICAL_CARD_PRICE_CENTS;

  const { data: conflictingCash } = await admin.from('product_orders')
    .select('id')
    .eq('business_id', businessId)
    .in('product_code', [NIVAL_PAY_PHYSICAL_CARD_PRODUCT, NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRODUCT])
    .eq('payment_method', 'cash')
    .eq('status', 'pending_cash_confirmation')
    .neq('product_code', productCode);
  for (const order of conflictingCash ?? []) {
    await admin.from('physical_card_orders').delete().eq('product_order_id', order.id);
    await admin.from('product_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'pending_cash_confirmation');
  }

  const { data: existing } = await admin.from('product_orders').select('id,created_at')
    .eq('business_id', businessId)
    .eq('product_code', productCode)
    .eq('payment_method', 'cash')
    .eq('status', 'pending_cash_confirmation')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    const { data: existingPhysical } = await admin.from('physical_card_orders')
      .select(PHYSICAL_ORDER_MATCH_FIELDS.join(','))
      .eq('product_order_id', existing.id)
      .maybeSingle();
    const samePhysicalOrder = physicalOrderMatches(
      existingPhysical as Record<string, unknown> | null,
      details as unknown as Record<string, string | null>,
    );
    const ageMs = Date.now() - new Date(existing.created_at).getTime();
    if (samePhysicalOrder && Number.isFinite(ageMs) && ageMs < 15 * 60 * 1000) {
      redirect('/dashboard/pay/physical?result=cash');
    }
    await admin.from('physical_card_orders').delete().eq('product_order_id', existing.id);
    await admin.from('product_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .eq('status', 'pending_cash_confirmation');
  }

  const { data: order, error } = await admin.from('product_orders').insert({
    business_id: businessId,
    product_code: productCode,
    amount_cents: amountCents,
    payment_method: 'cash',
    status: 'pending_cash_confirmation',
  }).select('id').single();
  if (error || !order) redirect('/dashboard/pay/physical?error=No+se+pudo+registrar+el+pedido.');
  const { error: detailsError } = await admin.from('physical_card_orders').insert({
    ...details, product_order_id: order.id, business_id: businessId,
  });
  if (detailsError) {
    await admin.from('product_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id);
    redirect('/dashboard/pay/physical?error=No+se+pudieron+guardar+los+datos+de+entrega.');
  }
  redirect('/dashboard/pay/physical?result=cash');
}
