import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNavigation } from '../../dashboard-navigation';
import { claimIncludedPhysicalCard, requestPhysicalCardCashPayment, startPhysicalCardCheckout } from '@/app/checkout/actions';
import { createAdminClient } from '@/lib/supabase/admin';
import { NIVAL_PAY_PRICE_CENTS, NIVAL_PAY_PRODUCT, NIVAL_PAY_PHYSICAL_CARD_PRICE_CENTS, NIVAL_PAY_PHYSICAL_CARD_PRODUCT, NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRICE_CENTS, NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRODUCT, NIVAL_PAY_CARD_CUSTOMIZATION_PRICE_CENTS, NIVAL_PAY_CARD_CUSTOMIZATION_PRODUCT } from '@/lib/orders';
import { reconcileLatestMercadoPagoProductOrder } from '@/lib/reconcile-mercado-pago-order';
import { CheckoutSubmitButton } from '@/app/checkout/submit-button';
import { PaymentStatusPoller } from '@/app/checkout/payment-status-poller';
import { getActiveBusinessMembership } from '@/lib/active-business';

export default async function PhysicalCardOrderPage({ searchParams }: {
  searchParams: Promise<{ error?: string; result?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpay%2Fphysical');
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect('/dashboard');
  if (membership.role === 'staff') redirect('/dashboard/points?view=visits');
  const { data: business } = await supabase.from('businesses')
    .select('name, product_level, slug, logo_url')
    .eq('id', membership.business_id)
    .maybeSingle();
  if (!business) redirect('/dashboard');
  if (params.result === 'success') {
    await reconcileLatestMercadoPagoProductOrder(membership.business_id, {
      [NIVAL_PAY_PHYSICAL_CARD_PRODUCT]: NIVAL_PAY_PHYSICAL_CARD_PRICE_CENTS,
      [NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRODUCT]: NIVAL_PAY_PHYSICAL_CARD_CUSTOM_PRICE_CENTS,
      [NIVAL_PAY_CARD_CUSTOMIZATION_PRODUCT]: NIVAL_PAY_CARD_CUSTOMIZATION_PRICE_CENTS,
    });
  }
  const admin = createAdminClient();
  const [{ data: paidInitialOrders }, { data: claimedCards }, { data: paymentProfiles }, { data: pointsEntitlement }, { data: loyaltyProgram }, { data: reviewSmartLink }] = await Promise.all([
    admin.from('product_orders')
      .select('id, provider_preference_id')
      .eq('business_id', membership.business_id)
      .eq('product_code', NIVAL_PAY_PRODUCT)
      .eq('amount_cents', NIVAL_PAY_PRICE_CENTS)
      .eq('status', 'paid')
      .order('paid_at', { ascending: true }),
    admin.from('physical_card_orders').select('product_order_id, included_base_order_id, product_orders!physical_card_orders_product_order_id_fkey(status)').eq('business_id', membership.business_id),
    admin.from('payment_profiles').select('id, display_name, public_token').eq('business_id', membership.business_id).eq('active', true).order('created_at', { ascending: true }),
    admin.from('business_product_entitlements').select('status').eq('business_id', membership.business_id).eq('product_code', 'nival_points').in('status', ['active','free']).maybeSingle(),
    admin.from('loyalty_programs').select('review_url').eq('business_id', membership.business_id).eq('active', true).limit(1).maybeSingle(),
    admin.from('smart_links').select('id').eq('business_id', membership.business_id).eq('kind', 'google_review').eq('active', true).limit(1).maybeSingle(),
  ]);
  const claimedOrderIds = new Set((claimedCards ?? []).filter((card) => {
    const payment = Array.isArray(card.product_orders) ? card.product_orders[0] : card.product_orders;
    return payment?.status === 'paid';
  }).map((card) => card.included_base_order_id ?? card.product_order_id));
  const pendingIncludedOrderIds = new Set((claimedCards ?? []).filter((card) => {
    const payment = Array.isArray(card.product_orders) ? card.product_orders[0] : card.product_orders;
    return payment?.status === 'pending' && Boolean(card.included_base_order_id);
  }).map((card) => card.included_base_order_id as string));
  const hasPendingIncludedCard = Boolean(paidInitialOrders?.some((order) => pendingIncludedOrderIds.has(order.id)));
  const hasIncludedCard = Boolean(paidInitialOrders?.some((order) =>
    !claimedOrderIds.has(order.id) && !pendingIncludedOrderIds.has(order.id)
  ));
  const hasPointsDestination = Boolean(pointsEntitlement && loyaltyProgram && business.slug);
  const hasReviewDestination = Boolean(reviewSmartLink || loyaltyProgram?.review_url);
  const primaryPaymentProfileId = paymentProfiles?.[0]?.id ?? '';
  const canPurchase = membership.role === 'owner' || membership.role === 'manager';
  const { data: orders } = await supabase.from('physical_card_orders')
    .select('id, design, front_template, back_style, back_design_url, target_url, delivery_method, fulfillment_status, requested_delivery_date, tracking_code, created_at, product_orders!physical_card_orders_product_order_id_fkey(status, payment_method, amount_cents)')
    .eq('business_id', membership.business_id).order('created_at', { ascending: false }).limit(5);
  const latestPhysicalPayment = orders?.[0]
    ? (Array.isArray(orders[0].product_orders) ? orders[0].product_orders[0] : orders[0].product_orders)
    : null;
  const physicalPaymentConfirming = (params.result === 'success' || params.result === 'pending')
    && latestPhysicalPayment?.status !== 'paid';

  return <main className="dashboardApp nivalDashboard">
    <PaymentStatusPoller active={(params.result === 'success' || params.result === 'pending') && latestPhysicalPayment?.status !== 'paid'} />
    <DashboardNavigation businessName={business?.name ?? 'Tu negocio'} active="nival-card" productLevel={business?.product_level === 'intelligence' ? 'intelligence' : 'pay'} />
    <div className="dashboardContent dashboardPayContent physicalCardPage">
      <header className="dashboardContentTopbar payTopbar"><div><strong>Tarjeta NFC Nival</strong></div><span className="ready">{hasIncludedCard ? 'Incluida en tu compra' : hasPendingIncludedCard ? 'Pago pendiente' : 'Desde $99 MXN'}</span></header>
      {params.error && <p role="alert" className="formMessage errorMessage">{params.error}</p>}
      {params.result === 'success' && <p role="status" className="formMessage">{latestPhysicalPayment?.status === 'paid' ? 'Pago confirmado. Tu pedido de tarjeta quedó registrado correctamente.' : 'Regresaste de Mercado Pago. Estamos confirmando el pago; esta pantalla se actualizará sola.'}</p>}
      {params.result === 'pending' && <p role="status" className="formMessage">Mercado Pago está confirmando tu pago. No necesitas volver a comprar.</p>}
      {params.result === 'failure' && <p role="alert" className="formMessage errorMessage">El pago no se completó. Tu pedido no se activó y puedes intentarlo otra vez.</p>}
      {params.result === 'cash' && <p role="status" className="formMessage">Pedido en efectivo registrado. El total quedó guardado según el diseño que elegiste.</p>}
      {params.result === 'included' && <p role="status" className="formMessage">Tu tarjeta incluida quedó registrada. Revisaremos el diseño y confirmaremos la entrega.</p>}
      <header className="payHeading physicalCardHero"><p className="eyebrow">NIVAL CARD</p><h1>Una tarjeta. La acción que tu negocio necesite.</h1><p>{hasIncludedCard ? 'Tu compra de Nival Pay incluye una tarjeta física. Puedes programarla para cobrar, puntos, reseñas o tu perfil. El reverso Nival está incluido; personalizarlo cuesta $10 MXN.' : hasPendingIncludedCard ? 'Ya hay una personalización de tu tarjeta incluida esperando confirmación de Mercado Pago. No necesitas volver a pagar.' : 'Puedes comprar una tarjeta NFC aunque uses Nival Puntos, reseñas o tu perfil digital. Cuesta $99 MXN con reverso Nival o $109 MXN con reverso personalizado.'}</p></header>
      {!canPurchase && <p className="formMessage">Puedes revisar las tarjetas de este negocio, pero solo el propietario o un gerente puede solicitar o comprar una nueva.</p>}
      {canPurchase && (hasPendingIncludedCard && !hasIncludedCard || physicalPaymentConfirming) && <section className="physicalPaymentWaiting" aria-live="polite"><span>CONFIRMANDO PAGO</span><strong>No necesitas volver a comprar.</strong><p>Estamos validando el pago con Mercado Pago. Cuando quede acreditado, tu pedido aparecerá como pagado automáticamente.</p></section>}
      {canPurchase && !physicalPaymentConfirming && (!hasPendingIncludedCard || hasIncludedCard) && <form className="paymentEditor physicalCardForm" action={hasIncludedCard ? claimIncludedPhysicalCard : startPhysicalCardCheckout}>
        <section className="chartCard physicalCardSection">
          <div className="physicalSectionHeading"><span>1</span><div><h2>Elige qué hará el frente</h2><p>Nival usa una plantilla clara con el logo actual de tu negocio, QR y una instrucción corta. Tú eliges el objetivo.</p></div></div>
          <div className="cardTemplateChoiceGrid">
            <label className={!primaryPaymentProfileId ? 'templateUnavailable' : undefined}><input type="radio" name="frontTemplate" value="pay" defaultChecked={Boolean(primaryPaymentProfileId)} disabled={!primaryPaymentProfileId}/><span className="templateMock"><small>PAGAR</small>{business.logo_url ? <img src={business.logo_url} alt="" /> : <b>{business.name.slice(0,1).toUpperCase()}</b>}<i>QR</i><em>Escanea o acerca tu celular para pagar</em></span><strong>Nival Pay</strong>{!primaryPaymentProfileId && <small>Configura tu página primero</small>}</label>
            <label className={!hasPointsDestination ? 'templateUnavailable' : undefined}><input type="radio" name="frontTemplate" value="points" defaultChecked={!primaryPaymentProfileId && hasPointsDestination} disabled={!hasPointsDestination}/><span className="templateMock"><small>PUNTOS</small>{business.logo_url ? <img src={business.logo_url} alt="" /> : <b>{business.name.slice(0,1).toUpperCase()}</b>}<i>QR</i><em>Escanea o acerca tu celular para guardar tus puntos</em></span><strong>Nival Puntos</strong>{!hasPointsDestination && <small>Activa y configura Puntos para usarla</small>}</label>
            <label className={!hasReviewDestination ? 'templateUnavailable' : undefined}><input type="radio" name="frontTemplate" value="reviews" defaultChecked={!primaryPaymentProfileId && !hasPointsDestination && hasReviewDestination} disabled={!hasReviewDestination}/><span className="templateMock"><small>RESEÑA</small>{business.logo_url ? <img src={business.logo_url} alt="" /> : <b>{business.name.slice(0,1).toUpperCase()}</b>}<i>QR</i><em>Escanea o acerca tu celular para dejar tu reseña</em></span><strong>Reseñas</strong>{!hasReviewDestination && <small>Configura tu enlace de reseñas desde Página del negocio</small>}</label>
            <label><input type="radio" name="frontTemplate" value="profile" defaultChecked={!primaryPaymentProfileId && !hasPointsDestination && !hasReviewDestination}/><span className="templateMock"><small>NEGOCIO</small>{business.logo_url ? <img src={business.logo_url} alt="" /> : <b>{business.name.slice(0,1).toUpperCase()}</b>}<i>QR</i><em>Escanea o acerca tu celular para ver nuestros enlaces</em></span><strong>Perfil digital</strong></label>
          </div>
          {paymentProfiles && paymentProfiles.length > 1 ? <label>Página Nival Pay<select name="paymentProfileId" defaultValue={primaryPaymentProfileId}>{paymentProfiles.map((profile,index)=><option key={profile.id} value={profile.id}>{profile.display_name || `Nival Pay ${index+1}`}</option>)}</select></label> : <input type="hidden" name="paymentProfileId" value={primaryPaymentProfileId}/>}
          <p className="payHelp">La tarjeta quedará programada al destino elegido. Nival valida que ese destino exista antes de registrar el pedido.</p>
          {(!primaryPaymentProfileId || !hasPointsDestination || !hasReviewDestination) && <div className="templateSetupLinks">
            {!primaryPaymentProfileId && <a href="/dashboard/pay">Configurar Nival Pay →</a>}
            {!hasPointsDestination && <a href="/dashboard/points">Activar / configurar Nival Puntos →</a>}
            {!hasReviewDestination && <a href="/dashboard?section=perfil-digital#reviews">Configurar reseñas →</a>}
          </div>}
          <label>Color del frente<select name="design" required defaultValue="black"><option value="black">Negro Nival</option><option value="white">Blanco Nival</option><option value="custom">Color de mi marca</option></select></label>
          <label>Indicaciones del frente<textarea name="designNotes" maxLength={500} placeholder="Ej. usar mi logo blanco, fondo azul, nombre del negocio debajo del QR."/></label>
        </section>
        <section className="chartCard physicalCardSection">
          <div className="physicalSectionHeading"><span>2</span><div><h2>Elige el reverso</h2><p>La opción estándar viene incluida. Si quieres usar tu propio diseño, cuesta $10 MXN.</p></div></div>
          <div className="backDesignOptions">
            <label><input type="radio" name="backStyle" value="nival" defaultChecked/><span><b>Reverso Nival</b><small>Diseño limpio de Nival Tech · incluido</small></span><strong>$0</strong></label>
            <label><input type="radio" name="backStyle" value="custom"/><span><b>Reverso personalizado</b><small>Tu imagen, frase, promoción, redes o diseño propio</small></span><strong>+$10</strong></label>
          </div>
          <div className="physicalCustomHelp"><strong>Si elegiste reverso personalizado</strong><span>Sube una imagen o describe tu idea. Puedes usar ambas opciones; el diseño estándar no necesita nada más.</span></div>
          <label>Imagen para el reverso <small>JPG, PNG o WebP · opcional</small><input name="backDesign" type="file" accept="image/jpeg,image/png,image/webp"/></label>
          <label>¿Cómo quieres el reverso?<textarea name="backDesignNotes" maxLength={500} placeholder="Ej. fondo negro, Instagram @minegocio y la frase Gracias por visitarnos."/></label>
        </section>
        <section className="chartCard physicalCardSection">
          <h2>3. Entrega</h2>
          <label>Método<select name="deliveryMethod" required defaultValue="sunday_local"><option value="sunday_local">Entrega local en domingo · sin costo</option><option value="shipping">Paquetería · envío por cotizar</option></select></label>
          <label>Domingo solicitado<input name="requestedDeliveryDate" type="date" /></label>
          <p className="payHelp">La fecha se confirma según producción y disponibilidad. Si eliges paquetería, puedes dejarla vacía.</p>
        </section>
        <section className="chartCard physicalCardSection">
          <h2>4. Datos para recibir</h2>
          <label>Nombre de quien recibe<input name="recipientName" required minLength={2} maxLength={120}/></label>
          <label>Teléfono<input name="phone" required inputMode="tel" minLength={10} maxLength={20}/></label>
          <label>Calle, número y colonia<input name="addressLine1" required minLength={5} maxLength={180}/></label>
          <label>Referencias<input name="addressLine2" maxLength={180}/></label>
          <label>Ciudad o municipio<input name="city" required minLength={2} maxLength={100}/></label>
          <label>Estado<input name="state" required minLength={2} maxLength={100}/></label>
          <label>Código postal<input name="postalCode" required inputMode="numeric" pattern="[0-9]{5}" maxLength={5}/></label>
        </section>
        <div className="checkoutActions">
          <CheckoutSubmitButton className="nvPrimaryButton" pendingLabel={hasIncludedCard ? 'Procesando tarjeta…' : 'Abriendo Mercado Pago…'}>{hasIncludedCard ? 'Solicitar tarjeta / continuar si elegí reverso +$10' : 'Continuar al pago · $99 o $109'}</CheckoutSubmitButton>
          {!hasIncludedCard && <button className="nvSecondaryButton" type="submit" formAction={requestPhysicalCardCashPayment}>Registrar pago en efectivo · $99 o $109</button>}
          <p className="payHelp">El total depende únicamente del reverso: estándar $0 extra · personalizado +$10 MXN.</p>
        </div>
      </form>}
      {orders?.length ? <section className="chartCard"><h2>Tus pedidos recientes</h2>{orders.map((order) => {
        const payment = Array.isArray(order.product_orders) ? order.product_orders[0] : order.product_orders;
        return <p key={order.id}><strong>{order.front_template === 'points' ? 'Puntos' : order.front_template === 'reviews' ? 'Reseñas' : order.front_template === 'profile' ? 'Perfil digital' : 'Nival Pay'} · {order.design === 'custom' ? 'color de marca' : order.design === 'white' ? 'blanca' : 'negra'} · {order.back_style === 'custom' ? 'reverso personalizado' : 'reverso Nival'}{order.back_design_url ? ' · archivo recibido' : ''}</strong> · {order.delivery_method === 'shipping' ? 'Paquetería' : 'Entrega dominical'} · Pago: {payment?.status === 'paid' ? 'pagado' : payment?.status === 'pending_cash_confirmation' ? 'efectivo pendiente' : 'pendiente'} · Pedido: {order.fulfillment_status}</p>;
      })}</section> : null}
    </div>
  </main>;
}
