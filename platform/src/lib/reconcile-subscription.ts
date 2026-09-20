import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  NIVAL_INTELLIGENCE_PRICE_CENTS,
  NIVAL_INTELLIGENCE_PRODUCT,
  NIVAL_POINTS_INTELLIGENCE_PRICE_CENTS,
  NIVAL_POINTS_INTELLIGENCE_PRODUCT,
  NIVAL_POINTS_PRICE_CENTS,
  NIVAL_POINTS_PRODUCT,
} from '@/lib/orders';

const SUBSCRIPTION_PRICES: Record<string, number> = {
  [NIVAL_POINTS_PRODUCT]: NIVAL_POINTS_PRICE_CENTS,
  [NIVAL_INTELLIGENCE_PRODUCT]: NIVAL_INTELLIGENCE_PRICE_CENTS,
  [NIVAL_POINTS_INTELLIGENCE_PRODUCT]: NIVAL_POINTS_INTELLIGENCE_PRICE_CENTS,
};

export async function reconcileLatestSubscription(businessId: string) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) return;

  const admin = createAdminClient();
  const { data: subscription, error: lookupError } = await admin
    .from('product_subscriptions')
    .select('id, product_code, amount_cents, provider_subscription_id, status')
    .eq('business_id', businessId)
    .eq('provider', 'mercado_pago')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError || !subscription?.provider_subscription_id) {
    if (lookupError) {
      console.error('[subscriptions] Reconciliation lookup failed', {
        businessId,
        code: lookupError.code,
      });
    }
    return;
  }

  const response = await fetch(
    `https://api.mercadopago.com/preapproval/${encodeURIComponent(subscription.provider_subscription_id)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' },
  );
  if (!response.ok) {
    console.warn('[subscriptions] Reconciliation provider request failed', {
      subscriptionId: subscription.id,
      httpStatus: response.status,
    });
    return;
  }

  const provider = await response.json() as {
    id?: string;
    external_reference?: string;
    status?: string;
    next_payment_date?: string;
    auto_recurring?: { transaction_amount?: number; currency_id?: string };
  };
  const expectedAmount = SUBSCRIPTION_PRICES[subscription.product_code];
  const providerAmountCents = Math.round(Number(provider.auto_recurring?.transaction_amount) * 100);
  const verified = provider.id === subscription.provider_subscription_id
    && provider.external_reference === subscription.id
    && expectedAmount === subscription.amount_cents
    && providerAmountCents === subscription.amount_cents
    && provider.auto_recurring?.currency_id === 'MXN';

  if (!verified) {
    console.warn('[subscriptions] Reconciliation verification failed', {
      subscriptionId: subscription.id,
      providerStatus: provider.status ?? null,
    });
    return;
  }

  const status = provider.status === 'authorized' ? 'authorized'
    : provider.status === 'paused' ? 'paused'
    : provider.status === 'cancelled' ? 'cancelled'
    : 'pending';
  const { error } = await admin.rpc('sync_nival_product_subscription', {
    p_subscription_id: subscription.id,
    p_provider_subscription_id: subscription.provider_subscription_id,
    p_status: status,
    p_current_period_end: provider.next_payment_date ?? null,
  });
  if (error) {
    console.error('[subscriptions] Reconciliation sync failed', {
      subscriptionId: subscription.id,
      code: error.code,
    });
  }
}
