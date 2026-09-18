import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { publicSiteUrl } from '@/lib/payment-profile';
import { PaymentEditor } from './payment-editor';
import { DashboardNavigation } from '../dashboard-navigation';

export default async function PaySettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpay');
  const { data: membership, error } = await supabase.from('business_members')
    .select('business_id, role, businesses(name, logo_url, subscription_status)').eq('user_id', user.id)
    .order('created_at').limit(1).maybeSingle();
  if (error) throw new Error('No se pudo cargar el negocio.');
  if (!membership) redirect('/dashboard?next=%2Fdashboard%2Fpay');
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const [{ data: paidOrder }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from('product_orders').select('id')
      .eq('business_id', membership.business_id).eq('product_code', 'nival_pay').eq('status', 'paid').limit(1).maybeSingle(),
    supabase.from('payment_profiles')
      .select('account_holder, bank_name, clabe, concept, payment_url, image_url, public_token, active, view_count')
      .eq('business_id', membership.business_id).maybeSingle(),
  ]);
  if (profileError) throw new Error('No se pudo cargar Nival Pay.');
  if (!paidOrder) redirect('/checkout');
  return <main className="dashboardApp">
    <DashboardNavigation businessName={business?.name ?? 'Mi negocio'} active="nival-pay" />
    <div className="dashboardContent dashboardPayContent">
      <header className="dashboardContentTopbar"><div><span>Nival Pay</span><b>{new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'America/Mexico_City' }).format(new Date())}</b></div><span className="ready">Activo</span></header>
      <header className="payHeading"><p className="eyebrow">NIVAL PAY</p><h1>Tus datos. Un solo enlace.</h1><p>Configura tu página para compartirla con QR o tarjeta NFC.</p></header>
      {!['trial','active'].includes(business?.subscription_status ?? '') && <p role="status" className="formMessage">Tu servicio está suspendido. Puedes editar los datos, pero la página pública no estará disponible hasta reactivar el servicio.</p>}
      {['owner','manager'].includes(membership.role)
        ? <PaymentEditor businessId={membership.business_id} businessName={business?.name ?? 'Mi negocio'} businessLogo={business?.logo_url ?? null} profile={profile} siteUrl={publicSiteUrl()} />
        : <p>Solo el propietario o un administrador puede configurar Nival Pay.</p>}
    </div>
  </main>;
}
