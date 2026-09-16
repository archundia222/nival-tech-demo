import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { money, NIVAL_PAY_PRICE_CENTS } from '@/lib/orders';
import { requestCashPayment, startMercadoPagoCheckout } from './actions';

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ result?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?mode=signup&next=%2Fcheckout');
  const { data: membership } = await supabase.from('business_members')
    .select('business_id, businesses(name)').eq('user_id', user.id).limit(1).maybeSingle();
  if (!membership) redirect('/dashboard?next=%2Fcheckout');
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const { data: orders } = await supabase.from('product_orders')
    .select('id, status, payment_method, amount_cents, created_at').eq('business_id', membership.business_id)
    .eq('product_code', 'nival_pay').order('created_at', { ascending: false }).limit(5);
  const paid = orders?.find((order) => order.status === 'paid');

  return <main className="checkoutShell">
    <nav className="payNav"><Link href="/" className="landingBrand"><Image src="/wallet/nival-logo.svg" alt="" width={36} height={36} /><span>Nival Tech</span></Link><Link href="/dashboard">Mi negocio</Link></nav>
    <section className="checkoutHeader"><p className="landingEyebrow">ACTIVACIÓN DE NIVAL PAY</p><h1>{paid ? 'Tu Nival Pay está activo.' : 'Elige cómo quieres pagar.'}</h1><p>{business?.name} · Un solo pago, sin mensualidad.</p></section>
    {params.error && <p className="checkoutNotice errorMessage" role="alert">{params.error}</p>}
    {params.result === 'success' && <p className="checkoutNotice">Recibimos el regreso de Mercado Pago. Estamos confirmando el pago de forma segura.</p>}
    {params.result === 'pending' && <p className="checkoutNotice">Tu pago sigue pendiente en Mercado Pago. La activación será automática cuando se apruebe.</p>}
    {params.result === 'failure' && <p className="checkoutNotice errorMessage">El pago no se completó. Puedes intentarlo nuevamente.</p>}
    {params.result === 'cash' && <p className="checkoutNotice">Venta en efectivo registrada. Nival Tech se activará cuando el vendedor confirme que recibió el pago.</p>}
    {paid ? <section className="checkoutSuccess"><span>✓</span><h2>Pago confirmado</h2><p>Ya puedes configurar tus datos bancarios, imagen, concepto, enlace y código QR.</p><Link className="landingPrimary dark" href="/dashboard/pay">Configurar Nival Pay</Link></section> : <div className="checkoutGrid">
      <article className="checkoutSummary"><p>NIVAL PAY</p><h2>Tarjeta NFC + página de pago</h2><ul><li>Tarjeta física programada</li><li>Página personalizada</li><li>Enlace y QR permanentes</li><li>Sin mensualidad</li></ul><strong>{money(NIVAL_PAY_PRICE_CENTS)}</strong><small>Pago único</small></article>
      <section className="paymentChoices">
        <article><div><span className="paymentIcon">MP</span><h2>Mercado Pago</h2><p>Paga en línea desde el checkout seguro de Mercado Pago. La activación es automática cuando se aprueba.</p></div><form action={startMercadoPagoCheckout}><button className="landingPrimary dark">Pagar {money(NIVAL_PAY_PRICE_CENTS)}</button></form></article>
        <article><div><span className="paymentIcon cash">$</span><h2>Efectivo</h2><p>Úsalo cuando compres Nival Pay directamente con un vendedor. La entrega del dinero se confirma manualmente.</p></div><form action={requestCashPayment}><button className="landingSecondary checkoutSecondary">Registrar pago en efectivo</button></form></article>
      </section>
    </div>}
    {!!orders?.length && !paid && <section className="orderHistory"><h2>Estado de tus órdenes</h2>{orders.map((order) => <div key={order.id}><span>{order.payment_method === 'cash' ? 'Efectivo' : 'Mercado Pago'}</span><b>{order.status === 'pending_cash_confirmation' ? 'Esperando confirmación' : order.status === 'pending' ? 'Pendiente' : order.status === 'cancelled' ? 'No completada' : order.status}</b><time>{new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'America/Mexico_City' }).format(new Date(order.created_at))}</time></div>)}</section>}
  </main>;
}

