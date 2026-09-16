import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isNivalAdmin } from '@/lib/admin';
import { money } from '@/lib/orders';
import { confirmCashPayment } from './actions';

export default async function SalesAdmin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fadmin%2Fventas');
  if (!isNivalAdmin(user.email)) redirect('/dashboard');
  const admin = createAdminClient();
  const { data: orders } = await admin.from('product_orders')
    .select('id, amount_cents, payment_method, status, created_at, paid_at, businesses(name, slug)')
    .order('created_at', { ascending: false }).limit(100);
  return <main className="adminSales">
    <nav className="payNav"><Link href="/" className="brand">NIVAL tech</Link><Link href="/dashboard">Panel</Link></nav>
    <header><p className="eyebrow">ADMINISTRACIÓN</p><h1>Ventas de Nival Pay</h1><p>Confirma únicamente el efectivo que ya recibiste físicamente.</p></header>
    {params.error && <p className="formMessage errorMessage">{params.error}</p>}
    <section className="salesTable">
      <div className="salesHead"><span>Negocio</span><span>Método</span><span>Importe</span><span>Estado</span><span>Acción</span></div>
      {orders?.map((order) => { const business = Array.isArray(order.businesses) ? order.businesses[0] : order.businesses; return <article key={order.id}>
        <span><strong>{business?.name ?? 'Negocio'}</strong><small>{new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(order.created_at))}</small></span>
        <span>{order.payment_method === 'cash' ? 'Efectivo' : 'Mercado Pago'}</span><span>{money(order.amount_cents)}</span>
        <span>{order.status === 'pending_cash_confirmation' ? 'Por confirmar' : order.status === 'paid' ? 'Pagado' : order.status}</span>
        <span>{order.status === 'pending_cash_confirmation' ? <form action={confirmCashPayment}><input type="hidden" name="orderId" value={order.id} /><button className="primaryButton">Confirmar efectivo</button></form> : '—'}</span>
      </article>; })}
    </section>
  </main>;
}

