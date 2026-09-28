import { redirect } from "next/navigation";
import { startMercadoPagoCheckout, startNivalReviewsCheckout, startNivalWifiCheckout, startNivalCardsBundleCheckout } from "@/app/checkout/actions";
import { CheckoutSubmitButton } from "@/app/checkout/submit-button";
import { PaymentStatusPoller } from "@/app/checkout/payment-status-poller";
import { NIVAL_CARDS_BUNDLE_PRODUCT, NIVAL_CARDS_BUNDLE_PRICE_CENTS } from "@/lib/orders";
import { reconcileLatestMercadoPagoProductOrder, cancelLatestTerminalMercadoPagoProductOrder } from "@/lib/reconcile-mercado-pago-order";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { createLoyaltyProgram, createSmartLink, createTeamInvitation, dismissRecommendation, recordVisit, redeemReward, refreshRecommendations, updateBusinessProfile, updateLoyaltyProgram } from "./actions";
import { BusinessQr } from "./business-qr";
import { SmartLinkQr } from "./smart-link-qr";
import { InvitationLink } from "./invitation-link";
import { BusinessOnboardingForm } from "./business-onboarding-form";
import { DashboardNavigation } from "./dashboard-navigation";
import { ProfilePublicView, type ProfileActionItem } from "@/app/p/[slug]/profile-public-view";
import { BusinessHealthCard } from "./business-health-card";
import { getActiveBusinessMembership } from "@/lib/active-business";

interface DashboardPageProps {
  searchParams: Promise<{ error?: string; message?: string; next?: string; section?: string; result?: string }>;
}

type DashboardSection = "resumen" | "inteligencia" | "clientes" | "nival-card" | "perfil-digital" | "perfil-compartir" | "configuracion";

interface TeamMember {
  member_email: string;
  member_name: string | null;
  member_role: "owner" | "manager" | "staff";
  joined_at: string;
}

interface IntelligenceRecommendation {
  id: string;
  title: string;
  explanation: string;
  evidence: Record<string, number>;
  suggested_action: { label?: string };
  created_at: string;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const dashboardSections: DashboardSection[] = ["resumen", "inteligencia", "clientes", "nival-card", "perfil-digital", "perfil-compartir", "configuracion"];
  const currentSection: DashboardSection = dashboardSections.includes(params.section as DashboardSection)
    ? params.section as DashboardSection
    : "resumen";
  const sectionTitles: Record<DashboardSection, string> = {
    resumen: "Resumen general",
    inteligencia: "Nival Growth",
    clientes: "Clientes",
    "nival-card": "Enlaces y reseñas",
    "perfil-digital": "Editar landing page",
    "perfil-compartir": "Compartir landing page",
    configuracion: "Configuración de tu perfil público",
  };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const membership = await getActiveBusinessMembership(user.id);

  if (!membership) {
    const requestedNext = params.next ?? "";
    const allowedProductDestinations = ["/dashboard/pay", "/dashboard/points", "/dashboard/intelligence", "/checkout"];
    const onboardingNext = allowedProductDestinations.some((prefix) =>
      requestedNext === prefix || requestedNext.startsWith(prefix + "/") || requestedNext.startsWith(prefix + "?")
    ) ? requestedNext : "/dashboard";
    return (
      <main className="dashboardShell">
        <header className="dashboardTopbar"><span className="brand"><span className="brandmark">N</span>NIVAL tech</span><form action={signOut}><button className="textButton">Cerrar sesión</button></form></header>
        <section className="onboardingCard">
          <p className="eyebrow">CONFIGURACIÓN INICIAL</p>
          <h1>Crea tu primer negocio</h1>
          <p>Este nombre aparecerá en las páginas y productos que configures para tu negocio.</p>
          {params.error && <div className="formMessage errorMessage">{params.error}</div>}
          <BusinessOnboardingForm next={onboardingNext} />
        </section>
      </main>
    );
  }

  if (membership.role === 'staff' && currentSection !== 'resumen') redirect('/dashboard');
  if (currentSection === "inteligencia") redirect('/dashboard/intelligence');
  if (currentSection === "clientes") redirect('/dashboard/points?view=customers');
  if (currentSection === "nival-card") redirect('/dashboard?section=perfil-digital');
  if (currentSection === "configuracion") redirect('/dashboard?section=perfil-digital');
  // Keep the legacy render union wide below while old sections remain in this file.
  // The redirects above make these branches unreachable at runtime.
  const legacySection = currentSection as DashboardSection;

  const businessId = membership.business_id;
  if (params.result === 'success' || params.result === 'pending') await reconcileLatestMercadoPagoProductOrder(businessId, { [NIVAL_CARDS_BUNDLE_PRODUCT]: NIVAL_CARDS_BUNDLE_PRICE_CENTS });
  if (params.result === 'failure') await cancelLatestTerminalMercadoPagoProductOrder(businessId, { [NIVAL_CARDS_BUNDLE_PRODUCT]: NIVAL_CARDS_BUNDLE_PRICE_CENTS });
  const publicOrigin = (process.env.NIVAL_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || 'https://nival-tech-platform.vercel.app').replace(/\/$/, '');
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, phone, description, logo_url, brand_color, website_url, subscription_status, product_level, nival_pay_free_enabled, nival_pay_trial_started_at")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) throw new Error("No se pudo cargar el negocio.");
  const productLevel: 'pay' | 'intelligence' = business?.product_level === 'intelligence' ? 'intelligence' : 'pay';
  const { data: entitlementRows } = businessId ? await supabase.from('business_product_entitlements')
    .select('product_code,status').eq('business_id', businessId) : { data: [] };
  const entitlementMap = new Map((entitlementRows ?? []).map((item) => [item.product_code, item.status]));
  const paidIntelligence = productLevel === 'intelligence' || entitlementMap.get('nival_intelligence') === 'active';
  const freeIntelligence = !paidIntelligence && entitlementMap.get('nival_intelligence') === 'free';
  const hasIntelligence = paidIntelligence || freeIntelligence;
  const paidPoints = productLevel === 'intelligence' || entitlementMap.get('nival_points') === 'active';
  const freePoints = !paidPoints && entitlementMap.get('nival_points') === 'free';
  const hasPoints = paidPoints || freePoints;
  const paidReviews = entitlementMap.get('nival_reviews') === 'active';
  const freeReviews = !paidReviews && entitlementMap.get('nival_reviews') === 'free';
  const hasReviews = paidReviews || freeReviews;
  if ((!hasPoints && legacySection === 'clientes') || (!hasIntelligence && legacySection === 'inteligencia')) redirect('/dashboard?section=resumen');
  const [{ count: customerCount }, { count: loyaltyCustomerCount }, { count: visitCount }] = businessId
    ? await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("loyalty_accounts").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("visits").select("id", { count: "exact", head: true }).eq("business_id", businessId),
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }];
  const { data: loyaltyPrograms } = businessId
    ? await supabase
        .from("loyalty_programs")
        .select("id, name, points_per_visit, reward_threshold, reward_description")
        .eq("business_id", businessId)
        .eq("active", true)
        .limit(1)
    : { data: [] };
  const loyaltyProgram = loyaltyPrograms?.[0];
  const { data: customers } = businessId
    ? await supabase
        .from("customers")
        .select("id, name, phone, email, created_at, loyalty_accounts(points_balance, public_token), visits(visited_at)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
    : { data: [] };
  const { data: redemptions } = businessId
    ? await supabase
        .from("reward_redemptions")
        .select("id, reward_description, points_spent, redeemed_at, customers(name)")
        .eq("business_id", businessId)
        .order("redeemed_at", { ascending: false })
        .limit(10)
    : { data: [] };
  const { data: smartLinks } = businessId
    ? await supabase
        .from("smart_links")
        .select("id, name, kind, target_url, public_token, click_count, active")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
    : { data: [] };
  const { data: paymentProfiles } = businessId
    ? await supabase
        .from("payment_profiles")
        .select("account_holder, bank_name, clabe, public_token, active, view_count, created_at")
        .eq("business_id", businessId)
        .order("active", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
    : { data: [] };
  const paymentProfile = paymentProfiles?.[0];
  const { data: wifiProfile } = await supabase.from("wifi_profiles").select("ssid").eq("business_id", businessId).maybeSingle();
  const { data: paidNivalPayOrder } = businessId
    ? await supabase
        .from("product_orders")
        .select("id")
        .eq("business_id", businessId)
        .in("product_code", ["nival_pay", NIVAL_CARDS_BUNDLE_PRODUCT])
        .eq("status", "paid")
        .limit(1)
        .maybeSingle()
    : { data: null };
  const { data: paidBundleOrder } = await supabase.from("product_orders").select("id").eq("business_id", businessId).eq("product_code", NIVAL_CARDS_BUNDLE_PRODUCT).eq("status", "paid").limit(1).maybeSingle();
  const paidBundle = Boolean(paidBundleOrder);
  const { data: paidWifiOrder } = await supabase.from("product_orders").select("id").eq("business_id", businessId).in("product_code", ["nival_wifi", NIVAL_CARDS_BUNDLE_PRODUCT]).eq("status", "paid").limit(1).maybeSingle();
  const paidWifi = Boolean(paidWifiOrder);
  const paidNivalPay = Boolean(paidNivalPayOrder);
  const freeNivalPay = !paidNivalPay && Boolean(business?.nival_pay_free_enabled);
  const hasNivalPay = paidNivalPay || freeNivalPay;
  const workspaceActive = hasNivalPay || hasReviews || hasPoints || business?.subscription_status === 'active';
  const trialEndsAt = business.nival_pay_trial_started_at ? new Date(business.nival_pay_trial_started_at).getTime() + 15 * 86400000 : null;
  const payTrialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt - Date.now()) / 86400000)) : null;
  const payStatusLabel = paidNivalPay ? 'Pay activo' : freeNivalPay && payTrialDaysLeft !== null
    ? payTrialDaysLeft > 0 ? `Prueba Pay · ${payTrialDaysLeft} días` : 'Prueba Pay en pausa'
    : workspaceActive ? 'Productos activos' : 'Configuración pendiente';
  const canManageProgram = membership.role === "owner" || membership.role === "manager";
  const [{ data: teamMembers }, { data: pendingInvitations }] = canManageProgram && businessId
    ? await Promise.all([
        supabase.rpc("get_business_team", { p_business_id: businessId }),
        supabase
          .from("business_invitations")
          .select("id, email, role, token, expires_at")
          .eq("business_id", businessId)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const { data: segmentRows } = businessId
    ? await supabase.rpc("get_business_segments", { p_business_id: businessId })
    : { data: [] };
  const segments = segmentRows?.[0];
  const recentVisits = Number(segments?.visits_last_30_days ?? 0);
  const previousVisits = Number(segments?.visits_previous_30_days ?? 0);
  const visitTrend = previousVisits === 0
    ? (recentVisits > 0 ? 100 : 0)
    : Math.round(((recentVisits - previousVisits) / previousVisits) * 100);
  const { data: recommendationRows } = businessId
    ? await supabase
        .from("intelligence_recommendations")
        .select("id, title, explanation, evidence, suggested_action, created_at")
        .eq("business_id", businessId)
        .is("dismissed_at", null)
        .order("created_at", { ascending: false })
    : { data: [] };
  const recommendations = recommendationRows as IntelligenceRecommendation[] | null;
  const reviewLink = smartLinks?.find((link) => link.kind === "google_review" && link.active);
  const profilePreviewActions: ProfileActionItem[] = business?.slug ? [
    ...(paymentProfile?.active ? [{ key: `payment-${paymentProfile.public_token}`, label: "Pagar", description: "Ver datos para transferir", href: `/pay/${paymentProfile.public_token}`, icon: "＄", featured: true }] : []),

    ...(business.phone ? [{ key: "contact", label: "Llamar", description: "Contactar al negocio", href: `tel:${business.phone}`, icon: "☎" }] : []),
    ...(reviewLink ? [{ key: "reviews", label: "Reseñas", description: "Califica tu experiencia", href: `/go/${reviewLink.public_token}`, icon: "☆", external: true }] : []),
    ...(business.website_url ? [{ key: "website", label: "Sitio web", description: "Información y servicios", href: business.website_url, icon: "↗", external: true }] : []),
    ...(smartLinks ?? []).filter((link) => link.active && (link.kind === "custom" || link.kind === "website")).map((link) => ({ key: `link-${link.public_token}`, label: link.name, description: "Abrir enlace", href: `/go/${link.public_token}`, icon: "↗", external: true })),
  ] : [];
  const businessHealthItems = [
    { label: "Página de cobro", complete: Boolean(paymentProfile?.active && paymentProfile.account_holder && paymentProfile.bank_name && paymentProfile.clabe), href: "/dashboard/pay", action: "Completa y activa tus datos de cobro" },
    { label: "Perfil del negocio", complete: Boolean(business?.description && business?.phone && business?.logo_url), href: "/dashboard?section=perfil-digital", action: "Agrega descripción, teléfono y logotipo" },
    { label: "Reseñas de Google", complete: Boolean(smartLinks?.some((link) => link.kind === "google_review" && link.active)), href: "/dashboard?section=perfil-digital#reviews", action: "Conecta tu enlace de reseñas" },
    { label: "Nival WiFi", complete: Boolean(wifiProfile?.ssid), href: "/dashboard/wifi", action: "Configura la red de invitados y descarga su QR" },
    { label: "Enlace público", complete: Boolean(business?.slug && profilePreviewActions.length), href: business?.slug ? `/p/${business.slug}` : "/dashboard?section=perfil-digital", action: "Prepara tu perfil público" },
  ];
  const payReady = Boolean(paymentProfile?.active && paymentProfile.account_holder && paymentProfile.bank_name && paymentProfile.clabe);
  const homeCards = [
    { key: "pay", name: "Nival Pay", active: hasNivalPay, views: Number(paymentProfile?.view_count ?? 0), href: hasNivalPay ? "/dashboard/pay" : "/dashboard/pay", cta: hasNivalPay ? "Administrar" : "Probar gratis" },
    { key: "reviews", name: "Nival Reseñas", active: hasReviews, views: Number(reviewLink?.click_count ?? 0), href: "/dashboard/reviews", cta: hasReviews ? "Administrar" : "Probar gratis" },
    { key: "wifi", name: "Nival WiFi", active: Boolean(wifiProfile?.ssid), views: 0, href: "/dashboard/wifi", cta: wifiProfile?.ssid ? "Administrar" : "Probar gratis" },
  ];

  return (
    <main className="dashboardApp">
      <DashboardNavigation businessName={business?.name ?? "Tu negocio"} active={currentSection} productLevel={productLevel} />
      <div className="dashboardContent">
      <header className={`dashboardContentTopbar ${currentSection === "perfil-digital" ? "profileDigitalTopbar" : ""}`}><div><span>{sectionTitles[currentSection]}</span><b>{new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "America/Mexico_City" }).format(new Date())}</b></div><span className="ready">{payStatusLabel}</span></header>
      {params.error && <div className="formMessage errorMessage dashboardMessage dashboardMessageTop">{params.error}</div>}
      {params.message && <div className="formMessage successMessage dashboardMessage dashboardMessageTop">{params.message}</div>}
      {currentSection === "resumen" && <>
      <section className="dashboardHero nivalHomeHero" id="resumen">
        <div><p className="eyebrow">PANEL DEL NEGOCIO</p><h1>{business?.name ?? "Tu negocio"}</h1><p>Consulta las aperturas de tus productos y entra directamente a administrar cada Nival Card.</p></div>
      </section>
      <section className="nivalProductOverview">
        {homeCards.map((item) => item.active ? <article key={item.key} className="nivalProductMetric"><span>{item.name}</span><strong>{item.views}</strong><small>aperturas del enlace</small><a href={item.href}>{item.cta} →</a></article> : <article key={item.key} className="nivalProductMetric trial"><span>{item.name}</span><strong>—</strong><small>Todavía no tienes este producto.</small><a href={item.href}>Probar gratis →</a></article>)}
      </section>
      {canManageProgram && <section className="nivalShop" aria-labelledby="nivalShopHeading">
        <div className="nivalShopHeading"><span>ELIGE CUANDO ESTÉS LISTO</span><h2 id="nivalShopHeading">Activa tus productos</h2><p>Tu cuenta es gratis. Compra cada acceso por separado o los tres en un paquete. Pago único con Mercado Pago.</p></div>
        {params.result === 'success' && !paidBundle && <><p className="formMessage">Estamos confirmando el pago del paquete. No vuelvas a pagar.</p><PaymentStatusPoller active /></>}
        {params.result === 'pending' && <p className="formMessage">Tu pago está pendiente de aprobación en Mercado Pago.</p>}
        {params.result === 'failure' && <p className="formMessage errorMessage">El pago no se completó. Puedes intentarlo de nuevo.</p>}
        <div className="nivalShopGrid">
          {[
            { key:'pay', title:'Nival Pay', price:'$199', detail:'Página de cobro, QR y tarjeta NFC', active:paidNivalPay, action:startMercadoPagoCheckout, href:'/dashboard/pay' },
            { key:'reviews', title:'Nival Reseñas', price:'$99', detail:'Reseñas de Google, QR y tarjeta NFC', active:paidReviews, action:startNivalReviewsCheckout, href:'/dashboard/reviews' },
            { key:'wifi', title:'Nival WiFi', price:'$99', detail:'Acceso WiFi, QR y tarjeta NFC', active:paidWifi, action:startNivalWifiCheckout, href:'/dashboard/wifi' },
            { key:'bundle', title:'Paquete completo', price:'$199', detail:'Pay + Reseñas + WiFi y una tarjeta NFC', active:paidBundle, action:startNivalCardsBundleCheckout, href:'/dashboard/pay' },
          ].map((item)=><article className={item.key==='bundle'?'nivalShopCard featured':'nivalShopCard'} key={item.key}><span>{item.key==='bundle'?'TRES ACCESOS':'UN ACCESO'}</span><h3>{item.title}</h3><p>{item.detail}</p><strong>{item.price} <small>MXN · pago único</small></strong>{item.active?<a className="nivalShopOwned" href={item.href}>Activo · Administrar →</a>:<form action={item.action}><CheckoutSubmitButton className="nivalShopBuy" pendingLabel="Abriendo Mercado Pago…">Comprar {item.key==='bundle'?'paquete':item.title} →</CheckoutSubmitButton></form>}</article>)}
        </div>
      </section>}
      <section className="nivalLandingIncluded"><div><span>INCLUIDA CON CUALQUIER PRODUCTO</span><h2>Landing page de tu negocio</h2><p>Al comprar cualquier Nival Card tienes una landing page para presentar tu negocio y compartir tus accesos desde un solo lugar.</p></div><div><a href="/dashboard?section=perfil-digital">Editar landing</a>{business?.slug && <a href={`/p/${business.slug}`} target="_blank" rel="noreferrer">Compartir ↗</a>}</div></section>
      </>}
      {legacySection === "inteligencia" && <>
      {!loyaltyProgram ? <section className="onboardingCard"><p className="eyebrow">NIVAL INTELLIGENCE</p><h1>Configura tu programa de lealtad</h1><p>Tu nivel Intelligence está activo, pero todavía necesitas un programa de lealtad activo para comenzar a registrar clientes, visitas, puntos y generar inteligencia con datos reales.</p><a className="primaryButton" href="/dashboard?section=configuracion">Ir a configuración</a></section> : <>
      <section className="intelligenceCard" id="inteligencia">
        <div className="intelligenceHeading">
          <div><p className="eyebrow">NIVAL INTELLIGENCE</p><h2>Segmentos automáticos</h2></div>
          <span className={`trendBadge ${visitTrend < 0 ? "negative" : ""}`}>{visitTrend >= 0 ? "+" : ""}{visitTrend}% visitas</span>
        </div>
        <p className="intelligenceIntro">Comparación de los últimos 30 días contra los 30 anteriores. Un cliente puede aparecer en más de un segmento.</p>
        <div className="segmentGrid">
          <article><span>Nuevos</span><strong>{Number(segments?.new_customers ?? 0)}</strong><p>Registrados en los últimos 30 días.</p></article>
          <article><span>Frecuentes</span><strong>{Number(segments?.frequent_customers ?? 0)}</strong><p>Con 3 o más visitas en 60 días.</p></article>
          <article><span>En riesgo</span><strong>{Number(segments?.at_risk_customers ?? 0)}</strong><p>Sin regresar durante más de 30 días.</p></article>
          <article><span>Premio disponible</span><strong>{Number(segments?.reward_ready_customers ?? 0)}</strong><p>Ya alcanzaron la meta de puntos.</p></article>
        </div>
        {Number(segments?.at_risk_customers ?? 0) > 0 && <div className="recommendation"><b>Acción recomendada</b><span>Prepara una campaña de regreso para los clientes en riesgo.</span></div>}
      </section>
      <section className="recommendationsCard">
        <div className="intelligenceHeading">
          <div><p className="eyebrow">ACCIONES SUGERIDAS</p><h2>Recomendaciones para hoy</h2></div>
          {canManageProgram && <form action={refreshRecommendations}><button className="visitButton">Actualizar análisis</button></form>}
        </div>
        {!recommendations?.length ? <p className="emptyState">Actualiza el análisis para generar recomendaciones con la actividad actual.</p> : (
          <div className="recommendationsList">{recommendations.map((item) => <article key={item.id} className="recommendationItem">
            <div><strong>{item.title}</strong><p>{item.explanation}</p><span>{item.suggested_action?.label ?? "Revisar actividad"}</span></div>
            {canManageProgram && <form action={dismissRecommendation}><input type="hidden" name="recommendationId" value={item.id} /><button className="textButton">Descartar</button></form>}
          </article>)}</div>
        )}
      </section>
      </>}
      </>}
      {legacySection === "nival-card" && <>
      <section className="profileDigitalHeading compactSectionHeading">
        <p className="eyebrow">ENLACES Y RESEÑAS</p>
        <h1>Configura destinos que puedas reutilizar.</h1>
        <p>Crea un enlace estable para reseñas, tu sitio o cualquier acción externa. Después puedes usarlo en tu perfil público, códigos QR y tarjetas NFC sin perder el control del destino.</p>
        <a className="nvSecondaryButton" href="/dashboard/pay/physical">Diseñar una tarjeta NFC →</a>
      </section>
      {canManageProgram && (
        <section className="settingsCard" id="nival-card">
          <div className="settingsIntro">
            <p className="eyebrow">NIVAL CARD · NFC Y RESEÑAS</p>
            <h2>Crea un enlace inteligente</h2>
            <p>Programa este enlace de Nival Tech en una tarjeta NFC. Podrás medir sus aperturas y conservar la misma tarjeta física.</p>
          </div>
          <form action={createSmartLink} className="settingsForm">
            <label>Nombre<input name="linkName" required minLength={2} maxLength={80} placeholder="Ej. Reseñas de Google" /></label>
            <label>Tipo<select name="linkKind" defaultValue="google_review"><option value="google_review">Reseña de Google</option><option value="website">Sitio web</option><option value="custom">Otro enlace</option></select></label>
            <label>Enlace de destino<input name="targetUrl" type="url" required placeholder="https://..." /></label>
            <button className="primaryButton" type="submit">Crear enlace NFC</button>
          </form>
        </section>
      )}
      {!!smartLinks?.length && <section className="smartLinksCard">
        <div><p className="eyebrow">ENLACES ACTIVOS</p><h2>Tarjetas y códigos QR</h2></div>
        <div className="smartLinksList">{smartLinks.map((link) => <SmartLinkQr
          key={link.id}
          id={link.id}
          name={link.name}
          kind={link.kind}
          targetUrl={link.target_url}
          url={`${publicOrigin}/go/${link.public_token}`}
          clicks={Number(link.click_count)}
          active={link.active}
          editable={canManageProgram}
        />)}</div>
      </section>}
      </>}
      {currentSection === "perfil-digital" && business?.slug && <section className="profileDigitalWorkspace landingEditOnly">
        <header className="profileDigitalHeading"><p className="eyebrow">EDITAR LANDING PAGE</p><h1>Así se presenta tu negocio.</h1><p>Edita la información y revisa la vista previa. Para QR, enlace y opciones de envío usa «Compartir» en el menú.</p></header>
        <div className="profileDashboardGrid landingEditorGrid"><form action={updateBusinessProfile} className="landingEditForm"><h2>Editar información</h2><p>Estos datos aparecen en la página pública de tu negocio.</p><label>Nombre del negocio<input name="businessName" defaultValue={business.name} required minLength={2} maxLength={100}/></label><label>Descripción<textarea name="businessDescription" defaultValue={business.description ?? ''} rows={4}/></label><label>Teléfono<input name="businessPhone" type="tel" defaultValue={business.phone ?? ''}/></label><label>Sitio web<input name="businessWebsiteUrl" type="url" defaultValue={business.website_url ?? ''} placeholder="https://..."/></label><label>Color de tu marca<input name="businessBrandColor" type="color" defaultValue={business.brand_color ?? '#18784c'}/></label><input name="businessLogoUrl" type="hidden" defaultValue={business.logo_url ?? ''}/><label>Logotipo<input name="businessLogoFile" type="file" accept="image/jpeg,image/png,image/webp"/></label><button type="submit" className="nvPrimaryButton">Guardar cambios</button></form><div className="profileDashboardPreview"><ProfilePublicView businessName={business.name} slug={business.slug} description={business.description} logoUrl={business.logo_url} brandColor={business.brand_color} actions={profilePreviewActions} verifiedLabel="PERFIL DEL NEGOCIO" embedded showQuickActions={false} showFooter={false}/><div className="profileDashboardFooter"><span>Vista previa</span><a href={`/p/${business.slug}`} target="_blank" rel="noreferrer">Ver landing ↗</a></div></div></div>
      </section>}
      {currentSection === "perfil-compartir" && business?.slug && <section className="landingShareOnly"><header className="profileDigitalHeading"><p className="eyebrow">COMPARTIR LANDING PAGE</p><h1>Tu enlace y QR, en un solo lugar.</h1><p>Esta sección es únicamente para compartir la landing de tu negocio.</p></header><BusinessQr businessName={business.name} url={`${publicOrigin}/p/${business.slug}`} qrId="business-digital-profile-qr" eyebrow="COMPARTE TU NEGOCIO" title="Un enlace para todo" description="Copia el enlace, compártelo o descarga el QR." fileSuffix="perfil-digital"/></section>}
      {legacySection === "clientes" && loyaltyProgram && <section className="redemptionHistoryCard">
        <div>
          <p className="eyebrow">HISTORIAL DE CANJES</p>
          <h2>Premios entregados</h2>
        </div>
        {!redemptions?.length ? <p className="emptyState">Aún no se ha canjeado ningún premio.</p> : (
          <div className="redemptionList">{redemptions.map((redemption) => {
            const customer = Array.isArray(redemption.customers) ? redemption.customers[0] : redemption.customers;
            return <article key={redemption.id} className="redemptionRow">
              <div><strong>{customer?.name ?? "Cliente"}</strong><span>{redemption.reward_description}</span></div>
              <div><b>{redemption.points_spent} puntos</b><time dateTime={redemption.redeemed_at}>{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(redemption.redeemed_at))}</time></div>
            </article>;
          })}</div>
        )}
      </section>}
      </div>
    </main>
  );
}
