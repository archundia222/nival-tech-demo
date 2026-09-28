import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { DashboardNavigation } from '@/app/dashboard/dashboard-navigation';
import { CheckoutSubmitButton } from '@/app/checkout/submit-button';
import { PaymentStatusPoller } from '@/app/checkout/payment-status-poller';
import { startMercadoPagoCheckout, startNivalReviewsCheckout, startNivalWifiCheckout, startNivalCardsBundleCheckout } from '@/app/checkout/actions';
import { NIVAL_CARDS_BUNDLE_PRICE_CENTS, NIVAL_CARDS_BUNDLE_PRODUCT } from '@/lib/orders';
import { reconcileLatestMercadoPagoProductOrder, cancelLatestTerminalMercadoPagoProductOrder } from '@/lib/reconcile-mercado-pago-order';

export default async function AddNivalCardPage({ searchParams }: { searchParams: Promise<{ result?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?mode=signup&next=%2Fdashboard%2Fcards%2Fadd');
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Fcards%2Fadd');
  if (membership.role === 'staff') redirect('/dashboard');
  if (params.result === 'success' || params.result === 'pending') {
    await reconcileLatestMercadoPagoProductOrder(membership.business_id, { [NIVAL_CARDS_BUNDLE_PRODUCT]: NIVAL_CARDS_BUNDLE_PRICE_CENTS });
  }
  if (params.result === 'failure') {
    await cancelLatestTerminalMercadoPagoProductOrder(membership.business_id, { [NIVAL_CARDS_BUNDLE_PRODUCT]: NIVAL_CARDS_BUNDLE_PRICE_CENTS });
  }
  const [{ data: business }, { data: paidOrders }, { data: reviewsEntitlement }] = await Promise.all([
    supabase.from('businesses').select('name').eq('id', membership.business_id).maybeSingle(),
    supabase.from('product_orders').select('product_code').eq('business_id', membership.business_id).eq('status', 'paid').in('product_code', ['nival_pay', 'nival_reviews', 'nival_wifi', NIVAL_CARDS_BUNDLE_PRODUCT]),
    supabase.from('business_product_entitlements').select('status').eq('business_id', membership.business_id).eq('product_code', 'nival_reviews').maybeSingle(),
  ]);
  const codes = new Set((paidOrders ?? []).map(order => order.product_code));
  const bundle = codes.has(NIVAL_CARDS_BUNDLE_PRODUCT);
  const options = [
    { code: 'pay', title: 'Nival Pay', price: '$199', detail: 'Comparte los datos de transferencia de tu negocio.', included: 'Página de pago, QR y una tarjeta NFC física.', owned: bundle || codes.has('nival_pay'), href: '/dashboard/pay', action: startMercadoPagoCheckout },
    { code: 'reviews', title: 'Nival Reseñas', price: '$99', detail: 'Lleva a tus clientes al enlace de reseñas de Google.', included: 'Enlace, QR y una tarjeta NFC física.', owned: bundle || reviewsEntitlement?.status === 'active' || codes.has('nival_reviews'), href: '/dashboard/reviews', action: startNivalReviewsCheckout },
    { code: 'wifi', title: 'Nival WiFi', price: '$99', detail: 'Comparte el acceso a la red de invitados.', included: 'Enlace, QR y una tarjeta NFC física.', owned: bundle || codes.has('nival_wifi'), href: '/dashboard/wifi', action: startNivalWifiCheckout },
    { code: 'bundle', title: 'Paquete completo', price: '$199', detail: 'Activa Pay, Reseñas y WiFi en un solo pago.', included: 'Tres accesos y una tarjeta NFC física incluida.', owned: bundle, href: '/dashboard', action: startNivalCardsBundleCheckout },
  ];
  return <main className="dashboardApp nivalDashboard"><DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active="cards-add"/><div className="dashboardContent nivalCardsAddPage">
    <header className="dashboardContentTopbar"><div><span>Nival Cards</span><b>Agregar una tarjeta</b></div><Link href="/dashboard">Volver a Inicio</Link></header>
    <section className="nivalAddHero"><span>NUEVA NIVAL CARD</span><h1>Elige lo que quieres activar.</h1><p>Tu cuenta es gratis. Compra cada producto por separado o el paquete completo. Después podrás configurarlo y solicitar tu tarjeta física incluida.</p></section>
    {params.error && <p className="formMessage errorMessage" role="alert">{params.error}</p>}
    {params.result === 'success' && !bundle && <p className="formMessage" role="status">Estamos confirmando tu pago. No vuelvas a pagar.<PaymentStatusPoller active /></p>}
    {params.result === 'success' && bundle && <p className="formMessage successMessage" role="status">Paquete activado. Ya puedes configurar tus tres accesos.</p>}
    {params.result === 'pending' && <p className="formMessage" role="status">Tu pago está pendiente de aprobación. La activación será automática.</p>}
    {params.result === 'failure' && <p className="formMessage errorMessage" role="alert">El pago no se completó. Puedes intentarlo de nuevo.</p>}
    <section className="nivalShop" aria-label="Opciones de Nival Cards"><div className="nivalShopGrid">{options.map(option => <article key={option.code} className={option.code === 'bundle' ? 'nivalShopCard featured' : 'nivalShopCard'}><span>{option.code === 'bundle' ? 'TRES ACCESOS' : 'UN ACCESO'}</span><h2>{option.title}</h2><p>{option.detail}</p><small>{option.included}</small><strong>{option.price} <small>MXN · pago único</small></strong>{option.owned ? <Link className="nivalShopOwned" href={option.href}>Ya lo tienes · Administrar →</Link> : <form action={option.action}><CheckoutSubmitButton className="nivalShopBuy" pendingLabel="Abriendo Mercado Pago…">Comprar {option.code === 'bundle' ? 'paquete' : option.title} →</CheckoutSubmitButton></form>}</article>)}</div></section>
    <p className="nivalAddFootnote">Las pruebas de 15 días funcionan con enlace y QR. La tarjeta NFC física se solicita tras la compra.</p>
  </div></main>;
}
