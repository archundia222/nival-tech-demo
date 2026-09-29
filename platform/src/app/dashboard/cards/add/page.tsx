import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { DashboardNavigation } from '@/app/dashboard/dashboard-navigation';
import { CheckoutSubmitButton } from '@/app/checkout/submit-button';
import { PaymentStatusPoller } from '@/app/checkout/payment-status-poller';
import { startMercadoPagoCheckout, startNivalReviewsCheckout, startNivalWifiCheckout, startNivalCardsBundleCheckout } from '@/app/checkout/actions';
import { NIVAL_CARDS_BUNDLE_PRICE_CENTS, NIVAL_CARDS_BUNDLE_PRODUCT, NIVAL_PAY_PRICE_CENTS, NIVAL_REVIEWS_PRICE_CENTS, NIVAL_WIFI_PRICE_CENTS, money } from '@/lib/orders';
import { reconcileLatestMercadoPagoProductOrder, cancelLatestTerminalMercadoPagoProductOrder } from '@/lib/reconcile-mercado-pago-order';

export default async function AddNivalCardPage({ searchParams }: { searchParams: Promise<{ result?: string; error?: string }> }) {
 const params=await searchParams; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/auth?mode=signup&next=%2Fdashboard%2Fcards%2Fadd'); const membership=await getActiveBusinessMembership(user.id); if(!membership)redirect('/dashboard?next=%2Fdashboard%2Fcards%2Fadd'); if(membership.role==='staff')redirect('/dashboard');
 if(params.result==='success'||params.result==='pending')await reconcileLatestMercadoPagoProductOrder(membership.business_id,{[NIVAL_CARDS_BUNDLE_PRODUCT]:NIVAL_CARDS_BUNDLE_PRICE_CENTS});
 if(params.result==='failure')await cancelLatestTerminalMercadoPagoProductOrder(membership.business_id,{[NIVAL_CARDS_BUNDLE_PRODUCT]:NIVAL_CARDS_BUNDLE_PRICE_CENTS});
 const [{data:business},{data:paidOrders},{data:reviewsEntitlement},{data:physicalOrders}]=await Promise.all([
  supabase.from('businesses').select('name').eq('id',membership.business_id).maybeSingle(),
  supabase.from('product_orders').select('product_code').eq('business_id',membership.business_id).eq('status','paid').in('product_code',['nival_pay','nival_reviews','nival_wifi',NIVAL_CARDS_BUNDLE_PRODUCT]),
  supabase.from('business_product_entitlements').select('status').eq('business_id',membership.business_id).eq('product_code','nival_reviews').maybeSingle(),
  supabase.from('physical_card_orders').select('id,fulfillment_status,design,delivery_method,tracking_code,created_at').eq('business_id',membership.business_id).order('created_at',{ascending:false}).limit(3),
 ]);
 const codes=new Set((paidOrders??[]).map(o=>o.product_code)); const bundle=codes.has(NIVAL_CARDS_BUNDLE_PRODUCT);
 const options=[
  {code:'pay',title:'Nival Pay',price:money(NIVAL_PAY_PRICE_CENTS),detail:'Comparte los datos de transferencia de tu negocio.',included:'Página de pago, QR dinámico y una tarjeta NFC física.',owned:bundle||codes.has('nival_pay'),action:startMercadoPagoCheckout},
  {code:'reviews',title:'Nival Reseñas',price:money(NIVAL_REVIEWS_PRICE_CENTS),detail:'Lleva a tus clientes al enlace de reseñas de Google.',included:'Enlace, QR dinámico y una tarjeta NFC física.',owned:bundle||reviewsEntitlement?.status==='active'||codes.has('nival_reviews'),action:startNivalReviewsCheckout},
  {code:'wifi',title:'Nival WiFi',price:money(NIVAL_WIFI_PRICE_CENTS),detail:'Comparte el acceso a la red de invitados.',included:'Enlace, QR dinámico y una tarjeta NFC física.',owned:bundle||codes.has('nival_wifi'),action:startNivalWifiCheckout},
  {code:'bundle',title:'Paquete completo',price:money(NIVAL_CARDS_BUNDLE_PRICE_CENTS),detail:'Activa Pay, Reseñas y WiFi en un solo pago.',included:'Tres accesos y una tarjeta NFC física incluida.',owned:bundle,action:startNivalCardsBundleCheckout},
 ];
 const hasAnyPaid=options.some(o=>o.owned);
 return <main className="dashboardApp nivalDashboard"><DashboardNavigation businessName={business?.name??'Tu negocio'} active="cards-add"/><div className="dashboardContent nivalCardsAddPage"><header className="dashboardContentTopbar"><div><span>Nival Cards</span><b>Agregar Nival Card</b></div><Link href="/dashboard">Volver a Inicio</Link></header>
 <section className="nivalAddHero"><span>COMPRA COMPLETA</span><h1>Elige, paga, diseña y dinos dónde entregarla.</h1><p>Todo empieza aquí. El pago activa el producto y después completas la tarjeta física: destino NFC, diseño, reverso, destinatario y dirección de entrega.</p></section>
 {params.error&&<p className="formMessage errorMessage" role="alert">{params.error}</p>}{params.result==='success'&&!bundle&&<p className="formMessage" role="status">Estamos confirmando tu pago. No vuelvas a pagar.<PaymentStatusPoller active/></p>}{params.result==='success'&&bundle&&<p className="formMessage successMessage">Pago confirmado. Ya puedes completar diseño y entrega.</p>}{params.result==='pending'&&<p className="formMessage">Tu pago está pendiente. La activación será automática.</p>}{params.result==='failure'&&<p className="formMessage errorMessage">El pago no se completó. Puedes intentarlo de nuevo.</p>}
 <section className="nivalShop"><div className="nivalShopGrid">{options.map(o=><article key={o.code} className={o.code==='bundle'?'nivalShopCard featured':'nivalShopCard'}><span>{o.code==='bundle'?'TRES ACCESOS':'UN ACCESO'}</span><h2>{o.title}</h2><p>{o.detail}</p><small>{o.included}</small><strong>{o.price} <small>MXN · pago único</small></strong>{o.owned?<Link className="nivalShopOwned" href="/dashboard/pay/physical">Comprado · completar diseño y entrega →</Link>:<form action={o.action}><CheckoutSubmitButton className="nivalShopBuy" pendingLabel="Abriendo Mercado Pago…">Comprar {o.code==='bundle'?'paquete':o.title} →</CheckoutSubmitButton></form>}</article>)}</div></section>
 <section id="tarjeta-fisica" className="nivalAddHero"><span>PASO 2 · TARJETA FÍSICA</span><h2>{hasAnyPaid?'Tu tarjeta está lista para configurarse.':'Después de pagar, completa la tarjeta.'}</h2><p>El frente usa la plantilla Nival con el logo de tu negocio, QR y la instrucción de acercar o escanear. El reverso Nival está incluido; el personalizado cuesta $10 MXN.</p><div className="nivalUseGrid"><article><b>1</b><strong>Destino NFC</strong><p>Elige Pay, Reseñas, WiFi, Puntos o perfil digital.</p></article><article><b>2</b><strong>Diseño</strong><p>Color, indicaciones, reverso y archivo personalizado.</p></article><article><b>3</b><strong>Entrega</strong><p>Destinatario, teléfono, dirección completa, C.P. y método de entrega.</p></article></div>{hasAnyPaid?<Link className="nvPrimaryButton" href="/dashboard/pay/physical">Completar diseño y dirección →</Link>:<p>Primero selecciona el producto que quieres comprar arriba.</p>}</section>
 {(physicalOrders?.length??0)>0&&<section className="nivalAddHero"><span>TUS PEDIDOS FÍSICOS</span><h2>Estado de fabricación y entrega.</h2>{physicalOrders?.map(o=><p key={o.id}><strong>{o.design==='custom'?'Diseño personalizado':`Diseño ${o.design}`}</strong> · {o.delivery_method==='shipping'?'Paquetería':'Entrega local'} · Estado: {o.fulfillment_status}{o.tracking_code?` · Guía ${o.tracking_code}`:''}</p>)}<Link className="nvSecondaryButton" href="/dashboard/pay/physical">Ver detalles de pedidos →</Link></section>}
 <p className="nivalAddFootnote">La prueba de 15 días usa enlace y QR. La tarjeta física se registra para producción únicamente después de confirmar la compra y guardar sus datos de diseño y entrega.</p></div></main>;
}
