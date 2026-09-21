import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNavigation } from '../../dashboard-navigation';
import { claimIncludedPhysicalCard, requestPhysicalCardCashPayment, startPhysicalCardCheckout } from '@/app/checkout/actions';
import { createAdminClient } from '@/lib/supabase/admin';
import { NIVAL_PAY_PRICE_CENTS, NIVAL_PAY_PRODUCT } from '@/lib/orders';

export default async function PhysicalCardOrderPage({ searchParams }: {
  searchParams: Promise<{ error?: string; result?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpay%2Fphysical');
  const { data: membership } = await supabase.from('business_members')
    .select('business_id, businesses(name, product_level)').eq('user_id', user.id).limit(1).maybeSingle();
  if (!membership) redirect('/dashboard');
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const admin = createAdminClient();
  const isPreviewCheckout = process.env.VERCEL_ENV === 'preview';
  const [{ data: paidInitialOrders }, { data: claimedCards }] = await Promise.all([
    admin.from('product_orders')
      .select('id, provider_preference_id')
      .eq('business_id', membership.business_id)
      .eq('product_code', NIVAL_PAY_PRODUCT)
      .eq('amount_cents', NIVAL_PAY_PRICE_CENTS)
      .eq('status', 'paid')
      .order('paid_at', { ascending: true }),
    admin.from('physical_card_orders').select('product_order_id').eq('business_id', membership.business_id),
  ]);
  const claimedOrderIds = new Set((claimedCards ?? []).map((card) => card.product_order_id));
  const hasIncludedCard = Boolean(paidInitialOrders?.some((order) => {
    if (!order.provider_preference_id || claimedOrderIds.has(order.id)) return false;
    const isTestOrder = order.provider_preference_id.toUpperCase().startsWith('ORDTST');
    return isPreviewCheckout ? isTestOrder : !isTestOrder;
  }));
  const { data: orders } = await supabase.from('physical_card_orders')
    .select('id, design, delivery_method, fulfillment_status, requested_delivery_date, tracking_code, created_at, product_orders(status, payment_method)')
    .eq('business_id', membership.business_id).order('created_at', { ascending: false }).limit(5);

  return <main className="dashboardApp">
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active="agregar-tarjetas" productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent physicalCardPage">
      <header className="dashboardContentTopbar payTopbar"><div><strong>Tarjeta física Nival Pay</strong></div><span className="ready">{hasIncludedCard ? 'Incluida en tu compra' : '$99 MXN'}</span></header>
      {params.error && <p role="alert" className="formMessage errorMessage">{params.error}</p>}
      {params.result === 'success' && <p role="status" className="formMessage">Pago recibido. Tu tarjeta entrará a producción cuando confirmemos el diseño.</p>}
      {params.result === 'pending' && <p role="status" className="formMessage">Mercado Pago está confirmando tu pago.</p>}
      {params.result === 'cash' && <p role="status" className="formMessage">Pedido registrado. Pagarás $99 en efectivo al recibirla.</p>}
      {params.result === 'included' && <p role="status" className="formMessage">Tu tarjeta incluida quedó registrada. Revisaremos el diseño y confirmaremos la entrega.</p>}
      <header className="payHeading physicalCardHero"><p className="eyebrow">NIVAL CARD</p><h1>Diseña tu tarjeta NFC.</h1><p>{hasIncludedCard ? 'Tu compra de $199 ya incluye la página Nival Pay y una tarjeta NFC física de plástico. Solo elige el diseño y cómo quieres recibirla; no vuelves a pagar.' : 'Esta sección es para tarjetas adicionales. Cada tarjeta adicional cuesta $99 MXN; la primera tarjeta de plástico ya viene incluida en la compra inicial de Nival Pay por $199.'}</p></header>
      <form className="paymentEditor physicalCardForm" action={hasIncludedCard ? claimIncludedPhysicalCard : startPhysicalCardCheckout}>
        <section className="chartCard physicalCardSection">
          <h2>1. Diseño</h2>
          <label>Estilo<select name="design" required defaultValue="black"><option value="black">Negra Nival</option><option value="white">Blanca Nival</option><option value="custom">Personalizada</option></select></label>
          <label>Indicaciones del diseño<textarea name="designNotes" maxLength={500} placeholder="Nombre, colores, texto o indicaciones para tu logotipo."/></label>
        </section>
        <section className="chartCard physicalCardSection">
          <h2>2. Entrega</h2>
          <label>Método<select name="deliveryMethod" required defaultValue="sunday_local"><option value="sunday_local">Entrega local en domingo · sin costo</option><option value="shipping">Paquetería · envío por cotizar</option></select></label>
          <label>Domingo solicitado<input name="requestedDeliveryDate" type="date" /></label>
          <p className="payHelp">La fecha se confirma según producción y disponibilidad. Si eliges paquetería, puedes dejarla vacía.</p>
        </section>
        <section className="chartCard physicalCardSection">
          <h2>3. Datos para recibir</h2>
          <label>Nombre de quien recibe<input name="recipientName" required minLength={2} maxLength={120}/></label>
          <label>Teléfono<input name="phone" required inputMode="tel" minLength={10} maxLength={20}/></label>
          <label>Calle, número y colonia<input name="addressLine1" required minLength={5} maxLength={180}/></label>
          <label>Referencias<input name="addressLine2" maxLength={180}/></label>
          <label>Ciudad o municipio<input name="city" required minLength={2} maxLength={100}/></label>
          <label>Estado<input name="state" required minLength={2} maxLength={100}/></label>
          <label>Código postal<input name="postalCode" required inputMode="numeric" pattern="[0-9]{5}" maxLength={5}/></label>
        </section>
        <div className="checkoutActions">
          <button className="primaryButton" type="submit">{hasIncludedCard ? 'Solicitar mi tarjeta incluida' : 'Pagar $99 con Mercado Pago'}</button>
          {!hasIncludedCard && <button className="secondaryButton" type="submit" formAction={requestPhysicalCardCashPayment}>Pagar $99 en efectivo al recibir</button>}
        </div>
      </form>
      {orders?.length ? <section className="chartCard"><h2>Tus pedidos recientes</h2>{orders.map((order) => {
        const payment = Array.isArray(order.product_orders) ? order.product_orders[0] : order.product_orders;
        return <p key={order.id}><strong>{order.design === 'custom' ? 'Personalizada' : order.design === 'white' ? 'Blanca' : 'Negra'}</strong> · {order.delivery_method === 'shipping' ? 'Paquetería' : 'Entrega dominical'} · Pago: {payment?.status === 'paid' ? 'pagado' : payment?.status === 'pending_cash_confirmation' ? 'efectivo pendiente' : 'pendiente'} · Pedido: {order.fulfillment_status}</p>;
      })}</section> : null}
    </div>
  </main>;
}
