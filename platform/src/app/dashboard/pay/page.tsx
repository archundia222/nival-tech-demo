import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { publicSiteUrl } from '@/lib/payment-profile';
import { PaymentEditor } from './payment-editor';
import { DashboardNavigation } from '../dashboard-navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS, NIVAL_PAY_EXTRA_SECTION_PRODUCT } from '@/lib/orders';

type MercadoPagoOrder = {
  id?: string;
  external_reference?: string;
  currency_id?: string;
  status?: string;
  status_detail?: string;
  total_amount?: string | number;
  total_paid_amount?: string | number;
  transactions?: { payments?: Array<{ id?: string; status?: string; status_detail?: string }> };
};

async function reconcileLatestExtraSectionOrder(businessId: string) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) return;

  const admin = createAdminClient();
  const { data: order } = await admin.from('product_orders')
    .select('id, amount_cents, currency, status, provider_preference_id, provider_payment_id')
    .eq('business_id', businessId)
    .eq('product_code', NIVAL_PAY_EXTRA_SECTION_PRODUCT)
    .eq('payment_method', 'mercado_pago')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!order?.provider_preference_id) return;

  const response = await fetch(
    `https://api.mercadopago.com/v1/orders/${encodeURIComponent(order.provider_preference_id)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' },
  );
  if (!response.ok) {
    console.warn('Extra section reconciliation request failed', {
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
    currency: !payload.currency_id || payload.currency_id === order.currency,
    totalAmount: Math.round(Number(payload.total_amount) * 100) === order.amount_cents,
    totalPaidAmount: Math.round(Number(payload.total_paid_amount) * 100) === order.amount_cents,
    catalogAmount: order.amount_cents === NIVAL_PAY_EXTRA_SECTION_PRICE_CENTS,
    paymentId: Boolean(paymentId),
    storedPaymentId: !order.provider_payment_id || order.provider_payment_id === paymentId,
  };
  const approved = Object.values(checks).every(Boolean);
  if (!approved || !paymentId) {
    console.warn('Extra section reconciliation verification failed', {
      orderId: order.id,
      failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
      providerStatus: payload.status ?? null,
      providerStatusDetail: payload.status_detail ?? null,
    });
    return;
  }

  const { error } = await admin.rpc('finalize_nival_pay_order', {
    p_order_id: order.id,
    p_provider_payment_id: paymentId,
  });
  if (error) console.error('Extra section reconciliation failed', { orderId: order.id, code: error.code });
}

export default async function PaySettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpay');
  const { data: membership, error } = await supabase.from('business_members')
    .select('business_id, role, businesses(name, logo_url, subscription_status, product_level)').eq('user_id', user.id)
    .order('created_at').limit(1).maybeSingle();
  if (error) throw new Error('No se pudo cargar el negocio.');
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Fpay');
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  await reconcileLatestExtraSectionOrder(membership.business_id);
  const [{ data: paidOrder }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from('product_orders').select('id')
      .eq('business_id', membership.business_id).eq('product_code', 'nival_pay').eq('status', 'paid').limit(1).maybeSingle(),
    supabase.from('payment_profiles')
      .select('account_holder, bank_name, clabe, concept, payment_url, image_url, public_token, active, view_count, clabe_copy_count, holder_visible, bank_visible, clabe_visible, concept_visible, payment_url_visible, custom_sections, extra_sections_purchased')
      .eq('business_id', membership.business_id).maybeSingle(),
  ]);
  if (profileError) throw new Error('No se pudo cargar Nival Pay.');
  if (!paidOrder) return <main className="dashboardApp">
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active="nival-pay" productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar payTopbar"><div><strong>Nival Pay</strong></div><span className="ready">Sin activar</span></header>
      <section className="dashboardHero">
        <div>
          <p className="eyebrow">NIVAL PAY</p>
          <h1>Convierte tu tarjeta NFC en una página de cobro.</h1>
          <p>Recibe transferencias con un enlace y QR propios. La activación incluye tu tarjeta NFC y es un pago único de $199 MXN, sin mensualidad.</p>
          <a className="loginLink" href="/checkout">Activar Nival Pay · $199 MXN</a>
        </div>
      </section>
      <section className="analyticsGrid" aria-label="Qué incluye Nival Pay">
        <article className="chartCard"><div className="chartHeading"><div><span>PÁGINA DE COBRO</span><h2>Lista para compartir</h2></div></div><p>Tu cliente abre una página simple con los datos necesarios para pagarte.</p></article>
        <article className="chartCard"><div className="chartHeading"><div><span>NFC + QR</span><h2>Un mismo destino</h2></div></div><p>Comparte el mismo enlace desde tu tarjeta NFC o mediante código QR.</p></article>
      </section>
    </div>
  </main>;

  return <main className="dashboardApp">
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active="nival-pay" productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar payTopbar"><div><strong>Nival Pay</strong></div><span className="ready">Activo</span></header>
      <header className="payHeading"><p className="eyebrow">NIVAL PAY</p><h1>Tus puntos de cobro.</h1><p>Administra tu página, QR y tarjeta NFC desde un solo lugar.</p></header>
      {!['trial','active'].includes(business?.subscription_status ?? '') && <p role="status" className="formMessage">Tu servicio está suspendido. Puedes editar los datos, pero la página pública no estará disponible hasta reactivar el servicio.</p>}
      {['owner','manager'].includes(membership.role)
        ? <PaymentEditor businessId={membership.business_id} businessName={business?.name ?? 'Mi negocio'} businessLogo={business?.logo_url ?? null} profile={profile} siteUrl={publicSiteUrl()} />
        : <p>Solo el propietario o un administrador puede configurar Nival Pay.</p>}
    </div>
  </main>;
}
