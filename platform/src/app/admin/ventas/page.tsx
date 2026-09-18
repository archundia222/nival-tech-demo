import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isNivalAdmin } from '@/lib/admin';
import { money } from '@/lib/orders';
import { AdminNavigation, type AdminSection } from './admin-navigation';
import { ClientsTable, SalesTable, type AdminClientRow, type AdminSaleRow } from './admin-tables';

const sections: AdminSection[] = ['nival-pay', 'clientes', 'resumen', 'nival-card', 'configuracion', 'inteligencia'];

export default async function SalesAdmin({ searchParams }: { searchParams: Promise<{ error?: string; section?: string }> }) {
  const params = await searchParams;
  const currentSection: AdminSection = sections.includes(params.section as AdminSection) ? params.section as AdminSection : 'nival-pay';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fadmin%2Fventas');
  if (!isNivalAdmin(user.email)) redirect('/dashboard');

  const admin = createAdminClient();
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
      {currentSection === 'nival-card' && <section className="adminEmpty"><span>▣</span><h2>Inventario de tarjetas</h2><p>Aquí se registrarán números de serie, programación, asignación y entrega. No mostraremos existencias hasta que el primer lote esté capturado.</p></section>}
      {currentSection === 'configuracion' && <div className="adminSettingsGrid">
        <article><span>PRECIO ACTUAL</span><strong>{money(19900)}</strong><p>Pago único por Nival Pay.</p></article>
        <article><span>MERCADO PAGO</span><strong>{process.env.MERCADO_PAGO_ACCESS_TOKEN ? 'Conectado' : 'Requiere configuración'}</strong><p>Estado de la integración de cobro.</p></article>
      </div>}
      {currentSection === 'inteligencia' && <section className="adminEmpty"><span>✦</span><h2>Disponible cuando tengas más clientes activos</h2><p>La inteligencia se habilitará cuando exista información suficiente para producir recomendaciones útiles.</p></section>}
    </section>
  </main>;
}
