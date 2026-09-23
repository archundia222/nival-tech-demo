import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isNivalAdmin } from '@/lib/admin';
import { money } from '@/lib/orders';
import { AdminNavigation, type AdminSection } from './admin-navigation';
import { ClientsTable, SalesTable, type AdminClientRow, type AdminSaleRow } from './admin-tables';
import { updatePhysicalCardFulfillment } from './actions';

const sections: AdminSection[] = ['nival-pay', 'clientes', 'resumen', 'nival-card', 'configuracion', 'inteligencia'];

export default async function SalesAdmin({ searchParams }: { searchParams: Promise<{ error?: string; section?: string }> }) {
  const params = await searchParams;
  const currentSection: AdminSection = sections.includes(params.section as AdminSection) ? params.section as AdminSection : 'nival-pay';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fadmin%2Fventas');
  if (!isNivalAdmin(user.email)) redirect('/dashboard');

  const admin = createAdminClient();
  const { data: physicalCards } = await admin.from('physical_card_orders')
    .select('id, business_id, front_template, back_style, design, design_notes, back_design_notes, target_url, recipient_name, phone, delivery_method, requested_delivery_date, fulfillment_status, tracking_code, created_at, businesses(name), product_orders!physical_card_orders_product_order_id_fkey(status, payment_method, amount_cents)')
    .order('created_at', { ascending: false })
    .limit(250);

  const { data: orders } = await admin.from('product_orders')
    .select('id, business_id, amount_cents, payment_method, status, created_at, paid_at, businesses(name, phone)')
    .eq('product_code', 'nival_pay')
    .in('status', ['paid', 'pending_cash_confirmation'])
    .order('created_at', { ascending: false })
    .limit(500);
  const businessIds = [...new Set((orders ?? []).map((order) => order.business_id))];
  const { data: profiles } = businessIds.length
    ? await admin.from('payment_profiles').select('business_id, account_holder, bank_name, clabe, public_token').in('business_id', businessIds)
    : { data: [] };
  const profileByBusiness = new Map((profiles ?? []).map((profile) => [profile.business_id, profile]));

  const saleRows: AdminSaleRow[] = (orders ?? []).map((order) => {
    const business = Array.isArray(order.businesses) ? order.businesses[0] : order.businesses;
    const profile = profileByBusiness.get(order.business_id);
    return {
      id: order.id, businessName: business?.name ?? 'Negocio sin nombre', phone: business?.phone ?? null,
      activatedAt: order.paid_at ?? order.created_at, paymentMethod: order.payment_method, status: order.status,
      amountCents: order.amount_cents,
      publicUrl: profile?.public_token ? `https://nival-tech-platform.vercel.app/pay/${profile.public_token}` : null,
    };
  });

  const paidOrders = saleRows.filter((order) => order.status === 'paid');
  const seenBusinesses = new Set<string>();
  const clientRows: AdminClientRow[] = [];
  for (const order of orders ?? []) {
    if (order.status !== 'paid' || seenBusinesses.has(order.business_id)) continue;
    seenBusinesses.add(order.business_id);
    const business = Array.isArray(order.businesses) ? order.businesses[0] : order.businesses;
    const profile = profileByBusiness.get(order.business_id);
    clientRows.push({
      id: order.business_id, holder: profile?.account_holder ?? null, businessName: business?.name ?? 'Negocio sin nombre',
      clabe: profile?.clabe ?? null, bank: profile?.bank_name ?? null, phone: business?.phone ?? null,
      purchasedAt: order.paid_at ?? order.created_at,
    });
  }

  const now = new Date();
  const mexicoDate = (value: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(value);
  const today = mexicoDate(now);
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const soldToday = paidOrders.filter((order) => mexicoDate(new Date(order.activatedAt)) === today).length;
  const soldThisWeek = paidOrders.filter((order) => new Date(order.activatedAt) >= weekStart).length;
  const mercadoPagoIncome = paidOrders.filter((order) => order.paymentMethod === 'mercado_pago').reduce((sum, order) => sum + order.amountCents, 0);
  const cashIncome = paidOrders.filter((order) => order.paymentMethod === 'cash').reduce((sum, order) => sum + order.amountCents, 0);
  const pendingCash = saleRows.filter((order) => order.status === 'pending_cash_confirmation').length;

  return <main className="adminApp">
    <AdminNavigation active={currentSection} email={user.email ?? 'Administrador'} />
    <section className="adminWorkspace">
      <header className="adminTopbar"><div><p>OPERACIÓN NIVAL TECH</p><h1>{currentSection === 'nival-pay' ? 'Nival Pay' : currentSection === 'nival-card' ? 'Nival Card' : currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}</h1></div><span>Administrador</span></header>
      {params.error && <p className="adminAlert" role="alert">{params.error}</p>}
      {currentSection === 'nival-pay' && <SalesTable rows={saleRows} />}
      {currentSection === 'clientes' && <ClientsTable rows={clientRows} />}
      {currentSection === 'resumen' && <div className="adminMetricGrid">
        <article><span>TARJETAS VENDIDAS</span><strong>{paidOrders.length}</strong><p>{soldToday} hoy · {soldThisWeek} últimos 7 días</p></article>
        <article><span>INGRESOS CONFIRMADOS</span><strong>{money(mercadoPagoIncome + cashIncome)}</strong><p>Mercado Pago {money(mercadoPagoIncome)} · Efectivo {money(cashIncome)}</p></article>
        <article><span>EFECTIVO PENDIENTE</span><strong>{pendingCash}</strong><p>{pendingCash === 1 ? 'venta requiere confirmación' : 'ventas requieren confirmación'}</p></article>
      </div>}
      {currentSection === 'nival-card' && <section className="adminCardQueue">
        <header><div><span>PRODUCCIÓN Y ENTREGA</span><h2>Pedidos de tarjetas NFC</h2><p>Cada pedido conserva el diseño, destino programado, pago y estado de producción.</p></div><strong>{(physicalCards ?? []).filter(card => !['delivered','cancelled'].includes(card.fulfillment_status)).length} pendientes</strong></header>
        {(physicalCards ?? []).length ? <div className="adminCardList">{physicalCards!.map(card => {
          const business = Array.isArray(card.businesses) ? card.businesses[0] : card.businesses;
          const payment = Array.isArray(card.product_orders) ? card.product_orders[0] : card.product_orders;
          const front = card.front_template === 'points' ? 'Puntos' : card.front_template === 'reviews' ? 'Reseñas' : card.front_template === 'profile' ? 'Perfil digital' : 'Nival Pay';
          return <article key={card.id}>
            <div className="adminCardIdentity"><span>{front}</span><strong>{business?.name ?? 'Negocio'}</strong><small>{card.back_style === 'custom' ? 'Reverso personalizado' : 'Reverso Nival'} · {card.design === 'custom' ? 'color de marca' : card.design}</small></div>
            <div className="adminCardMeta"><span>Recibe <b>{card.recipient_name}</b></span><span>{card.phone}</span><span>{card.delivery_method === 'shipping' ? 'Paquetería' : 'Entrega local'}{card.requested_delivery_date ? ` · ${card.requested_delivery_date}` : ''}</span><span>Pago <b>{payment?.status === 'paid' ? 'confirmado' : payment?.status === 'pending_cash_confirmation' ? 'efectivo pendiente' : 'pendiente'}</b> · {money(Number(payment?.amount_cents ?? 0))}</span></div>
            <div className="adminCardTarget"><small>DESTINO NFC / QR</small>{card.target_url ? <a href={card.target_url} target="_blank" rel="noreferrer">{card.target_url.replace(/^https?:\/\//,'')}</a> : <span>Pendiente de definir</span>}</div>
            <form action={updatePhysicalCardFulfillment} className="adminCardStatusForm">
              <input type="hidden" name="cardId" value={card.id}/>
              <select name="status" defaultValue={card.fulfillment_status}><option value="new">Nuevo</option><option value="confirmed">Confirmado</option><option value="producing">En producción</option><option value="ready">Listo</option><option value="shipped">Enviado</option><option value="delivered">Entregado</option><option value="cancelled">Cancelado</option></select>
              <input name="trackingCode" defaultValue={card.tracking_code ?? ''} placeholder="Guía / referencia opcional" maxLength={120}/>
              <button type="submit">Guardar estado</button>
            </form>
          </article>;
        })}</div> : <div className="adminEmpty"><span>▣</span><h2>Aún no hay pedidos físicos</h2><p>Los pedidos aparecerán aquí en cuanto un cliente solicite su tarjeta incluida o compre una adicional.</p></div>}
      </section>}
      {currentSection === 'configuracion' && <div className="adminSettingsGrid">
        <article><span>PRECIO ACTUAL</span><strong>{money(19900)}</strong><p>Pago único por Nival Pay.</p></article>
        <article><span>MERCADO PAGO</span><strong>{process.env.MERCADO_PAGO_ACCESS_TOKEN ? 'Conectado' : 'Requiere configuración'}</strong><p>Estado de la integración de cobro.</p></article>
      </div>}
      {currentSection === 'inteligencia' && <section className="adminEmpty"><span>✦</span><h2>Disponible cuando tengas más clientes activos</h2><p>La inteligencia se habilitará cuando exista información suficiente para producir recomendaciones útiles.</p></section>}
    </section>
  </main>;
}
