import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { DashboardNavigation } from '../../dashboard-navigation';
import { startAdditionalNivalPayCheckout } from '@/app/checkout/actions';
import { CheckoutSubmitButton } from '@/app/checkout/submit-button';
import { NIVAL_PAY_ADDITIONAL_PRICE_CENTS, money } from '@/lib/orders';
export default async function AddPay(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/auth?next=%2Fcheckout');
 const membership=await getActiveBusinessMembership(user.id);if(!membership)redirect('/dashboard?next=%2Fcheckout');if(membership.role==='staff')redirect('/dashboard');
 const {data:paid}=await supabase.from('product_orders').select('id').eq('business_id',membership.business_id).in('product_code',['nival_pay','nival_cards_bundle']).eq('status','paid').limit(1).maybeSingle();
 if(!paid)redirect('/checkout');
 const {data:business}=await supabase.from('businesses').select('name').eq('id',membership.business_id).maybeSingle();
 return <main className="dashboardApp nivalDashboard"><DashboardNavigation businessName={business?.name??'Mi negocio'} active="cards-add"/><div className="dashboardContent dashboardPayContent"><section className="nivalAddHero"><p className="eyebrow">NIVAL PAY</p><h1>Agrega otra página de cobro.</h1><p>Configura otra Nival Pay para tu negocio. Cada compra incluye su tarjeta NFC; el envío por paquetería se cobra aparte.</p><strong>{money(NIVAL_PAY_ADDITIONAL_PRICE_CENTS)} MXN · pago único</strong><form action={startAdditionalNivalPayCheckout}><CheckoutSubmitButton className="nvPrimaryButton" pendingLabel="Abriendo Mercado Pago…">Comprar otra Nival Pay</CheckoutSubmitButton></form><Link href="/dashboard/pay/physical">Diseño y entrega de tarjetas físicas →</Link></section></div></main>;
}
