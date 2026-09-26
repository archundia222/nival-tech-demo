import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { money, NIVAL_PAY_PRICE_CENTS, NIVAL_PAY_PRODUCT } from '@/lib/orders';
import { publicSiteUrl } from '@/lib/payment-profile';
import { requestCashPayment, startMercadoPagoCheckout } from './actions';
import { CheckoutSubmitButton } from './submit-button';
import { PaymentStatusPoller } from './payment-status-poller';
import { ActiveCard, BankSetupForm } from './bank-setup-form';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { cancelLatestTerminalMercadoPagoProductOrder } from '@/lib/reconcile-mercado-pago-order';

type MercadoPagoOrder = {
  id?: string;
  external_reference?: string;
  currency_id?: string;
  status?: string;
  status_detail?: string;
  total_amount?: string | number;
  total_paid_amount?: string | number;
  transactions?: { payments?: Array<{
    id?: string;
    status?: string;
    status_detail?: string;
    amount?: string | number;
    paid_amount?: string | number;
  }> };
};

async function reconcileLatestOrder(businessId: string) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) return;
  const admin = createAdminClient();
  const { data: recentOrders } = await admin.from('product_orders')
    .select('id, amount_cents, currency, status, provider_preference_id, provider_payment_id')
    .eq('business_id', businessId)
    .eq('product_code', 'nival_pay')
    .eq('payment_method', 'mercado_pago')
    .order('created_at', { ascending: false })
    .limit(20);

  const activateBusiness = async () => {
    const now = new Date().toISOString();
    await admin.from('businesses')
      .update({ subscription_status: 'active', updated_at: now })
      .eq('id', businessId)
      .neq('subscription_status', 'active');
  };

  for (const order of recentOrders ?? []) {
    if (order.status === 'paid' && order.provider_payment_id) {
      await activateBusiness();
      return;
    }
    if (!order.provider_preference_id) continue;

    const response = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(order.provider_preference_id)}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' },
    );

    // Mercado Pago can return orders from a different credential scope in the
    // same database during QA. A 404 only means this token cannot see that
    // order, so continue with the next recent order instead of getting stuck.
    if (response.status === 404) continue;
    if (!response.ok) {
      console.warn('Mercado Pago reconciliation request failed', {
        providerOrderId: order.provider_preference_id,
        httpStatus: response.status,
      });
      continue;
    }

    const payload = await response.json() as MercadoPagoOrder;
    const payment = payload.transactions?.payments?.find((candidate) =>
      candidate.status === 'processed' && candidate.status_detail === 'accredited'
    );
    const paymentId = payment?.id ? String(payment.id) : null;
    const checks = {
      orderId: payload.id === order.provider_preference_id,
      externalReference: payload.external_reference === order.id,
      orderStatus: payload.status === 'processed',
      orderStatusDetail: payload.status_detail === 'accredited',
      currency: !payload.currency_id || payload.currency_id === order.currency,
      totalAmount: Math.round(Number(payload.total_amount) * 100) === order.amount_cents,
      totalPaidAmount: Math.round(Number(payload.total_paid_amount) * 100) === order.amount_cents,
      catalogAmount: order.amount_cents === NIVAL_PAY_PRICE_CENTS,
      paymentId: Boolean(paymentId),
      storedPaymentId: !order.provider_payment_id || order.provider_payment_id === paymentId,
    };
    const approved = Object.values(checks).every(Boolean);
    if (!approved || !paymentId) continue;

    const { error: finalizeError } = await admin.rpc('finalize_nival_pay_order', {
      p_order_id: order.id,
      p_provider_payment_id: paymentId,
    });
    if (finalizeError) {
      console.error('Nival Pay reconciliation finalization failed', {
        orderId: order.id,
        code: finalizeError.code,
      });
      continue;
    }
    await activateBusiness();
    return;
  }
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ result?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?mode=signup&next=%2Fcheckout');
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Fpay');
  const { data: business } = await supabase.from('businesses')
    .select('name, subscription_status')
    .eq('id', membership.business_id)
    .maybeSingle();
  if (!business) redirect('/dashboard');
  if (params.result === 'success') await reconcileLatestOrder(membership.business_id);
  if (params.result === 'failure') {
    await cancelLatestTerminalMercadoPagoProductOrder(membership.business_id, {
      [NIVAL_PAY_PRODUCT]: NIVAL_PAY_PRICE_CENTS,
    });
  }
  const { data: orders } = await supabase.from('product_orders')
    .select('id, status, payment_method, amount_cents, created_at').eq('business_id', membership.business_id)
    .eq('product_code', 'nival_pay').order('created_at', { ascending: false }).limit(5);
  const paid = orders?.find((order) => order.status === 'paid');
  const { data: paymentProfile } = paid
    ? await supabase.from('payment_profiles').select('public_token, account_holder, bank_name, clabe')
      .eq('business_id', membership.business_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    : { data: null };
  const hasBankProfile = Boolean(paymentProfile?.public_token && paymentProfile.account_holder && paymentProfile.bank_name && paymentProfile.clabe);
  const paymentConfirmationPending = !paid && (params.result === 'success' || params.result === 'pending');
  const siteUrl = publicSiteUrl();

  return <main className="checkoutExperience">
    <header className="checkoutBrand"><Link href="/"><span>N</span><b>NIVAL</b> tech</Link><small>Compra segura</small></header>
    <div className="checkoutFrame">
      {params.error && <p className="checkoutStatus errorMessage" role="alert">{params.error}</p>}
      {params.result === 'success' && !paid && <><p className="checkoutStatus">Estamos confirmando tu pago. Esta pantalla se actualizará sola.</p><PaymentStatusPoller active /></>}
      {params.result === 'pending' && <><p className="checkoutStatus">Tu pago está pendiente. La activación será automática cuando Mercado Pago lo apruebe.</p><PaymentStatusPoller active /></>}
      {params.result === 'failure' && <p className="checkoutStatus errorMessage">El pago no se completó. Puedes intentarlo nuevamente.</p>}
      {params.result === 'cash' && <p className="checkoutStatus">Pago en efectivo registrado. Se activará cuando el vendedor confirme la recepción.</p>}

      {paid
        ? hasBankProfile && paymentProfile
          ? <ActiveCard businessName={business?.name ?? 'Tu negocio'} url={`${siteUrl}/pay/${paymentProfile.public_token}`} />
          : <BankSetupForm businessName={business?.name ?? 'Tu negocio'} siteUrl={siteUrl} />
        : paymentConfirmationPending
          ? <section className="checkoutConfirming" aria-live="polite">
              <div className="checkoutConfirmingMark" aria-hidden="true">✓</div>
              <p className="checkoutKicker">PAGO EN VALIDACIÓN</p>
              <h1>No vuelvas a pagar.</h1>
              <p>Mercado Pago ya nos devolvió a Nival y estamos verificando la acreditación. Esta pantalla se actualiza automáticamente; cuando termine, continuaremos con la activación.</p>
              <div className="checkoutConfirmingSteps"><span>1 · Pago enviado</span><span>2 · Validando con Mercado Pago</span><span>3 · Activación automática</span></div>
              <Link className="checkoutSecondaryLink" href="/dashboard/pay">Volver a Nival Pay</Link>
            </section>
          : <>
          <section className="checkoutIntro"><p className="checkoutKicker">NIVAL PAY PRO</p><h1>Lleva tu Nival Pay del QR a una experiencia completa.</h1><p>Conserva tu misma página y QR. El pago único desbloquea la tarjeta NFC física, 3 apartados y las herramientas Pro.</p></section>
          <section className="checkoutSteps" aria-label="Proceso de activación"><div className="current"><span>1</span><b>Activa Pro</b><small>Pago único</small></div><div><span>2</span><b>Conserva</b><small>Mismo QR y página</small></div><div><span>3</span><b>Llévalo al negocio</b><small>NFC + QR + enlace</small></div></section>
          <div className="checkoutCommerce">
            <article className="checkoutProduct">
              <div><span>Nival Pay Pro · pago único</span><strong>{money(NIVAL_PAY_PRICE_CENTS)}</strong><small>MXN · Sin mensualidad</small></div>
              <ul><li>Primera tarjeta NFC física incluida</li><li>Página de cobro personalizada</li><li>Enlace y código QR permanentes</li><li>3 apartados incluidos</li><li>Datos editables sin cambiar la tarjeta</li></ul>
            </article>
            <section className="checkoutMethods" aria-label="Métodos de pago">
              <article className="checkoutMethodPrimary"><div className="checkoutMethodHeading"><span className="mercadoPagoMark">MP</span><div><small>RECOMENDADO</small><h2>Mercado Pago</h2></div></div><p>Pago seguro con tarjeta, saldo o los métodos disponibles en Mercado Pago.</p>
                <form action={startMercadoPagoCheckout}><CheckoutSubmitButton className="checkoutPrimaryButton" pendingLabel="Abriendo Mercado Pago…">Pagar {money(NIVAL_PAY_PRICE_CENTS)}</CheckoutSubmitButton></form>
              </article>
              <article className="checkoutMethodCash"><div><h2>Pago en efectivo</h2><p>Para ventas presenciales. Requiere confirmación manual del vendedor.</p></div>
                <form action={requestCashPayment}><CheckoutSubmitButton className="checkoutCashButton" pendingLabel="Registrando…">Registrar efectivo</CheckoutSubmitButton></form>
              </article>
            </section>
          </div>
          <footer className="checkoutTrust"><span>Pago procesado por Mercado Pago</span><span>Tu QR y enlace se conservan</span><span>Sin mensualidad para Nival Pay Pro</span><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link></footer>
        </>}
    </div>
  </main>;
}
