import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { money, NIVAL_PAY_PRICE_CENTS } from '@/lib/orders';
import { signOut } from '@/app/auth/actions';
import { requestCashPayment, startMercadoPagoCheckout } from './actions';
import { CheckoutSubmitButton } from './submit-button';

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
  const { data: order } = await admin.from('product_orders')
    .select('id, amount_cents, currency, status, provider_preference_id, provider_payment_id')
    .eq('business_id', businessId)
    .eq('product_code', 'nival_pay')
    .eq('payment_method', 'mercado_pago')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!order?.provider_preference_id || order.status === 'paid') return;

  const response = await fetch(
    `https://api.mercadopago.com/v1/orders/${encodeURIComponent(order.provider_preference_id)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' },
  );
  if (!response.ok) {
    console.warn('Mercado Pago reconciliation request failed', {
      providerOrderId: order.provider_preference_id,
      httpStatus: response.status,
    });
    return;
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
    currency: payload.currency_id === order.currency,
    totalAmount: Math.round(Number(payload.total_amount) * 100) === order.amount_cents,
    totalPaidAmount: Math.round(Number(payload.total_paid_amount) * 100) === order.amount_cents,
    catalogAmount: order.amount_cents === NIVAL_PAY_PRICE_CENTS,
    paymentId: Boolean(paymentId),
    storedPaymentId: !order.provider_payment_id || order.provider_payment_id === paymentId,
  };
  console.info('Mercado Pago reconciliation result', {
    providerOrderId: order.provider_preference_id,
    payloadOrderId: payload.id,
    status: payload.status,
    statusDetail: payload.status_detail,
    currency: payload.currency_id,
    totalAmount: payload.total_amount,
    totalPaidAmount: payload.total_paid_amount,
    payments: payload.transactions?.payments?.map((candidate) => ({
      hasId: Boolean(candidate.id),
      status: candidate.status,
      statusDetail: candidate.status_detail,
      amount: candidate.amount,
      paidAmount: candidate.paid_amount,
    })) ?? [],
    checks,
  });
  const approved = Object.values(checks).every(Boolean);
  if (!approved || !paymentId) return;

  const now = new Date().toISOString();
  const { error: paymentError } = await admin.from('product_orders')
    .update({ status: 'paid', provider_payment_id: paymentId, paid_at: now, updated_at: now })
    .eq('id', order.id)
    .neq('status', 'paid');
  if (paymentError) return;
  await admin.from('businesses')
    .update({ subscription_status: 'active', updated_at: now })
    .eq('id', businessId)
    .neq('subscription_status', 'active');
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ result?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?mode=signup&next=%2Fcheckout');
  const { data: membership } = await supabase.from('business_members')
    .select('business_id, businesses(name, subscription_status)').eq('user_id', user.id).limit(1).maybeSingle();
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Fpay');
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  if (params.result === 'success') await reconcileLatestOrder(membership.business_id);
  const { data: orders } = await supabase.from('product_orders')
    .select('id, status, payment_method, amount_cents, created_at').eq('business_id', membership.business_id)
    .eq('product_code', 'nival_pay').order('created_at', { ascending: false }).limit(5);
  const paid = orders?.find((order) => order.status === 'paid');

  return <main className="dashboardApp">
    <aside className="dashboardSidebar">
      <Link className="brand dashboardBrand" href="/dashboard"><span className="brandmark">N</span>NIVAL tech</Link>
      <div className="sidebarBusiness"><span>ESPACIO DE TRABAJO</span><strong>{business?.name ?? 'Mi negocio'}</strong></div>
      <nav className="sidebarNav" aria-label="Navegación del panel">
        <Link href="/dashboard?section=resumen"><span>01</span>Resumen</Link>
        <Link href="/dashboard?section=inteligencia"><span>02</span>Inteligencia</Link>
        <Link href="/dashboard?section=clientes"><span>03</span>Clientes</Link>
        <Link href="/dashboard?section=nival-card"><span>04</span>Nival Card</Link>
        <Link className="active" aria-current="page" href="/dashboard/pay"><span>05</span>Nival Pay</Link>
        <Link href="/dashboard?section=configuracion"><span>06</span>Configuración</Link>
      </nav>
      <div className="sidebarFooter"><Link href="/products">Mis productos</Link><form action={signOut}><button className="textButton">Cerrar sesión</button></form></div>
    </aside>
    <details className="dashboardMobileMenu">
      <summary><span className="hamburgerIcon" aria-hidden="true"><i /><i /><i /></span><span>Menú</span><strong>{business?.name ?? 'Mi negocio'}</strong></summary>
      <nav aria-label="Navegación móvil del panel">
        <Link href="/dashboard?section=resumen">Resumen</Link><Link href="/dashboard?section=inteligencia">Inteligencia</Link><Link href="/dashboard?section=clientes">Clientes</Link><Link href="/dashboard?section=nival-card">Nival Card</Link><Link aria-current="page" href="/dashboard/pay">Nival Pay</Link><Link href="/dashboard?section=configuracion">Configuración</Link>
      </nav>
    </details>
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar"><div><span>Nival Pay</span><b>{new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'America/Mexico_City' }).format(new Date())}</b></div><span className="ready">{business?.subscription_status ?? 'trial'}</span></header>
      <section className="checkoutHeader"><p className="landingEyebrow">ACTIVACIÓN DE NIVAL PAY</p><h1>{paid ? 'Tu Nival Pay está activo.' : 'Elige cómo quieres pagar.'}</h1><p>{business?.name} · Un solo pago, sin mensualidad.</p></section>
      {params.error && <p className="checkoutNotice errorMessage" role="alert">{params.error}</p>}
      {params.result === 'success' && <p className="checkoutNotice">Recibimos el regreso de Mercado Pago. Estamos confirmando el pago de forma segura.</p>}
      {params.result === 'pending' && <p className="checkoutNotice">Tu pago sigue pendiente en Mercado Pago. La activación será automática cuando se apruebe.</p>}
      {params.result === 'failure' && <p className="checkoutNotice errorMessage">El pago no se completó. Puedes intentarlo nuevamente.</p>}
      {params.result === 'cash' && <p className="checkoutNotice">Venta en efectivo registrada. Nival Tech se activará cuando el vendedor confirme que recibió el pago.</p>}
      {paid ? <section className="checkoutSuccess"><span>✓</span><h2>Pago confirmado</h2><p>Ya puedes configurar tus datos bancarios, imagen, concepto, enlace y código QR.</p><Link className="landingPrimary dark" href="/dashboard/pay">Configurar Nival Pay</Link></section> : <div className="checkoutGrid">
        <article className="checkoutSummary"><p>NIVAL PAY</p><h2>Tarjeta NFC + página de pago</h2><ul><li>Tarjeta física programada</li><li>Página personalizada</li><li>Enlace y QR permanentes</li><li>Sin mensualidad</li></ul><strong>{money(NIVAL_PAY_PRICE_CENTS)}</strong><small>Pago único</small></article>
        <section className="paymentChoices">
          <article><div><span className="paymentIcon">MP</span><h2>Mercado Pago</h2><p>Paga en línea desde el checkout seguro de Mercado Pago. La activación es automática cuando se aprueba.</p></div><form action={startMercadoPagoCheckout}><CheckoutSubmitButton className="landingPrimary dark" pendingLabel="Abriendo Mercado Pago…">Pagar {money(NIVAL_PAY_PRICE_CENTS)}</CheckoutSubmitButton></form></article>
          <article><div><span className="paymentIcon cash">$</span><h2>Efectivo</h2><p>Úsalo cuando compres Nival Pay directamente con un vendedor. La entrega del dinero se confirma manualmente.</p></div><form action={requestCashPayment}><CheckoutSubmitButton className="landingSecondary checkoutSecondary" pendingLabel="Registrando…">Registrar pago en efectivo</CheckoutSubmitButton></form></article>
        </section>
      </div>}
      {!!orders?.length && !paid && <section className="orderHistory"><h2>Estado de tus órdenes</h2>{orders.map((order) => <div key={order.id}><span>{order.payment_method === 'cash' ? 'Efectivo' : 'Mercado Pago'}</span><b>{order.status === 'pending_cash_confirmation' ? 'Esperando confirmación' : order.status === 'pending' ? 'Pendiente' : order.status === 'cancelled' ? 'No completada' : order.status}</b><time>{new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'America/Mexico_City' }).format(new Date(order.created_at))}</time></div>)}</section>}
    </div>
  </main>;
}
