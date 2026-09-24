import { redirect } from "next/navigation";
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
  searchParams: Promise<{ error?: string; message?: string; next?: string; section?: string }>;
}

type DashboardSection = "resumen" | "inteligencia" | "clientes" | "nival-card" | "perfil-digital" | "configuracion";

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
  const dashboardSections: DashboardSection[] = ["resumen", "inteligencia", "clientes", "nival-card", "perfil-digital", "configuracion"];
  const currentSection: DashboardSection = dashboardSections.includes(params.section as DashboardSection)
    ? params.section as DashboardSection
    : "resumen";
  const sectionTitles: Record<DashboardSection, string> = {
    resumen: "Resumen general",
    inteligencia: "Nival Intelligence",
    clientes: "Clientes",
    "nival-card": "Enlaces y reseñas",
    "perfil-digital": "Página del negocio",
    configuracion: "Configuración",
  };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const membership = await getActiveBusinessMembership(user.id);

  if (!membership) {
    const onboardingNext = ["/dashboard/pay", "/dashboard/points", "/dashboard/intelligence", "/checkout"].includes(params.next ?? "")
      ? params.next!
      : "/products";
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

  const businessId = membership.business_id;
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, phone, description, logo_url, brand_color, website_url, subscription_status, product_level, nival_pay_free_enabled")
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
  if ((!hasPoints && currentSection === 'clientes') || (!hasIntelligence && currentSection === 'inteligencia')) redirect('/dashboard?section=resumen');
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
        .select("account_holder, bank_name, clabe, public_token, active, view_count")
        .eq("business_id", businessId)
        .limit(1)
    : { data: [] };
  const paymentProfile = paymentProfiles?.[0];
  const { data: paidNivalPayOrder } = businessId
    ? await supabase
        .from("product_orders")
        .select("id")
        .eq("business_id", businessId)
        .eq("product_code", "nival_pay")
        .eq("status", "paid")
        .limit(1)
        .maybeSingle()
    : { data: null };
  const paidNivalPay = Boolean(paidNivalPayOrder);
  const freeNivalPay = !paidNivalPay && Boolean(business?.nival_pay_free_enabled);
  const hasNivalPay = paidNivalPay || freeNivalPay;
  const workspaceActive = hasNivalPay || hasPoints || hasIntelligence || business?.subscription_status === 'active';
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
    ...(hasPoints ? [{ key: "loyalty", label: "Mis puntos", description: "Ver puntos y recompensas", href: `/b/${business.slug}`, icon: "★" }] : []),
    ...(business.phone ? [{ key: "contact", label: "Llamar", description: "Contactar al negocio", href: `tel:${business.phone}`, icon: "☎" }] : []),
    ...(reviewLink ? [{ key: "reviews", label: "Reseñas", description: "Califica tu experiencia", href: `/go/${reviewLink.public_token}`, icon: "☆", external: true }] : []),
    ...(business.website_url ? [{ key: "website", label: "Sitio web", description: "Información y servicios", href: business.website_url, icon: "↗", external: true }] : []),
    ...(smartLinks?.some((link) => link.kind === "custom" && link.active) ? [{ key: "links", label: "Más enlaces", description: "Redes, menú y otros accesos", href: `/p/${business.slug}`, icon: "+" }] : []),
  ] : [];
  const businessHealthItems = [
    { label: "Página de cobro", complete: Boolean(paymentProfile?.active && paymentProfile.account_holder && paymentProfile.bank_name && paymentProfile.clabe), href: "/dashboard/pay", action: "Completa y activa tus datos de cobro" },
    { label: "Perfil del negocio", complete: Boolean(business?.description && business?.phone && business?.logo_url), href: "/dashboard?section=perfil-digital", action: "Agrega descripción, teléfono y logotipo" },
    { label: "Reseñas de Google", complete: Boolean(smartLinks?.some((link) => link.kind === "google_review" && link.active)), href: "/dashboard?section=perfil-digital#reviews", action: "Conecta tu enlace de reseñas" },
    { label: "Enlace público", complete: Boolean(business?.slug && profilePreviewActions.length), href: business?.slug ? `/p/${business.slug}` : "/dashboard?section=perfil-digital", action: "Prepara tu perfil público" },
  ];
  const payReady = Boolean(paymentProfile?.active && paymentProfile.account_holder && paymentProfile.bank_name && paymentProfile.clabe);
  const homeNextAction = !hasNivalPay
    ? { eyebrow: "EMPIEZA GRATIS", title: "Crea tu primera Nival Pay", text: "Publica un QR y enlace de cobro sin pagar. Si después quieres NFC física y más herramientas, activas la versión completa sin cambiar tu QR.", href: "/dashboard/pay", cta: "Crear Nival Pay Gratis" }
    : !payReady
      ? { eyebrow: "TE FALTA UN PASO", title: "Termina tu página de cobro", text: "Completa beneficiario, banco y CLABE para que tu Nival Pay quede lista para compartir.", href: "/dashboard/pay", cta: "Terminar configuración" }
      : Number(paymentProfile?.view_count ?? 0) === 0
        ? { eyebrow: "YA ESTÁ LISTA", title: "Ahora pon tu Nival Pay frente a un cliente", text: "Comparte el link, descarga el QR o usa la tarjeta NFC. La primera apertura te confirma que el flujo ya está en la calle.", href: "/dashboard/pay?view=share", cta: "Compartir mi Nival Pay" }
        : hasIntelligence
          ? (Number(customerCount ?? 0) === 0 && Number(visitCount ?? 0) === 0
            ? { eyebrow: "INTELLIGENCE NECESITA UNA PRIMERA SEÑAL", title: "Registra lo que ya sabes de tu negocio", text: "Empieza con un cliente, una venta, el cierre del día o un CSV. No necesitas cambiar tu forma de trabajar para que Nival empiece a aprender.", href: "/dashboard/intelligence?view=imports", cta: "Registrar datos" }
            : { eyebrow: "NIVAL YA TIENE ACTIVIDAD PARA REVISAR", title: "Mira qué vale la pena hacer hoy", text: "Intelligence usa clientes, visitas y ventas registradas para priorizar recuperación, recurrencia y campañas sin hacerte interpretar tablas.", href: "/dashboard/intelligence", cta: "Abrir Intelligence" })
          : hasPoints
            ? { eyebrow: "HAZ QUE EL PROGRAMA SE USE", title: "Registra lo que acaba de pasar", text: "Una visita, un cliente o una venta pueden registrarse en segundos. También puedes dejar que el cliente se dé de alta solo desde tu QR.", href: "/dashboard/points?view=register", cta: "Abrir registro rápido" }
            : { eyebrow: "TU NIVAL PAY YA ESTÁ RECIBIENDO VISITAS", title: "El siguiente paso es hacer que esas personas vuelvan", text: "Nival Puntos convierte visitas repetidas en una experiencia de lealtad sencilla para el cliente y el negocio.", href: "/dashboard/points", cta: "Conocer Nival Puntos" };

  return (
    <main className="dashboardApp">
      <DashboardNavigation businessName={business?.name ?? "Tu negocio"} active={currentSection} productLevel={productLevel} />
      <div className="dashboardContent">
      <header className={`dashboardContentTopbar ${currentSection === "perfil-digital" ? "profileDigitalTopbar" : ""}`}><div><span>{sectionTitles[currentSection]}</span><b>{new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "America/Mexico_City" }).format(new Date())}</b></div><span className="ready">{workspaceActive ? 'Activo' : business?.subscription_status === 'trial' ? 'Configuración pendiente' : 'Acceso pausado'}</span></header>
      {params.error && <div className="formMessage errorMessage dashboardMessage dashboardMessageTop">{params.error}</div>}
      {params.message && <div className="formMessage successMessage dashboardMessage dashboardMessageTop">{params.message}</div>}
      {currentSection === "resumen" && <>
      <section className="dashboardHero nivalHomeHero" id="resumen">
        <div>
          <p className="eyebrow">TU NEGOCIO EN NIVAL</p>
          <h1>{business?.name ?? "Tu negocio"}</h1>
          <p>Cobra, haz que tus clientes vuelvan y decide qué hacer después desde un solo lugar.</p>
        </div>
      </section>
      <section className="nivalTodayCard">
        <div><span>{homeNextAction.eyebrow}</span><h2>{homeNextAction.title}</h2><p>{homeNextAction.text}</p></div>
        <a href={homeNextAction.href}>{homeNextAction.cta} <b>→</b></a>
      </section>
      <section className="nivalProductHub" aria-label="Productos Nival">
        <article className={hasNivalPay ? "activeProduct" : ""}>
          <div><span>COBRAR</span><b>{paidNivalPay ? "COMPLETO" : freeNivalPay ? "GRATIS" : "EMPIEZA GRATIS"}</b></div>
          <h2>Nival Pay</h2>
          <p>Una página de cobro clara para NFC y QR. Tu cliente abre, copia y paga sin pedirte datos por mensaje.</p>
          <a href="/dashboard/pay">{hasNivalPay ? "Administrar cobros →" : "Crear gratis →"}</a>
        </article>
        <article className={hasPoints ? "activeProduct" : ""}>
          <div><span>HACER QUE VUELVAN</span><b>{paidPoints ? "PRO" : freePoints ? "GRATIS" : "EMPIEZA GRATIS"}</b></div>
          <h2>Nival Puntos</h2>
          <p>Registra visitas, recompensa recurrencia y crea una razón sencilla para que tus clientes regresen.</p>
          <a href="/dashboard/points">{hasPoints ? "Abrir mi programa →" : "Conocer Nival Puntos →"}</a>
        </article>
        <article className={"intelligenceProduct " + (hasIntelligence ? "activeProduct" : "")}>
          <div><span>CRECER</span><b>{paidIntelligence ? "PRO" : freeIntelligence ? "GRATIS" : "EMPIEZA GRATIS"}</b></div>
          <h2>Nival Intelligence</h2>
          <p>Te dice a quién recuperar, qué campaña probar y qué funcionó. Menos análisis; más decisiones listas para ejecutar.</p>
          <a href="/dashboard/intelligence">{hasIntelligence ? "Ver qué hacer hoy →" : "Conocer Intelligence →"}</a>
        </article>
      </section>
      <section className="nivalSignals">
        <div><span>Vistas de Nival Pay</span><strong>{paymentProfile ? Number(paymentProfile.view_count) : 0}</strong><small>personas abrieron tu página de cobro</small></div>
        <div><span>{hasPoints ? "Clientes en Puntos" : "Clientes registrados"}</span><strong>{hasPoints ? (loyaltyCustomerCount ?? 0) : (customerCount ?? 0)}</strong><small>{hasPoints ? "personas inscritas al programa" : "en la base del negocio"}</small></div>
        <div><span>Visitas registradas</span><strong>{visitCount ?? 0}</strong><small>actividad que puede alimentar decisiones</small></div>
      </section>
      <BusinessHealthCard items={businessHealthItems} />
      </>}
      {currentSection === "inteligencia" && <>
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
      {currentSection === "nival-card" && <>
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
          url={`https://nival-tech-platform.vercel.app/go/${link.public_token}`}
          clicks={Number(link.click_count)}
          active={link.active}
          editable={canManageProgram}
        />)}</div>
      </section>}
      </>}
      {currentSection === "perfil-digital" && business?.slug && <>
        <section className="profileDigitalWorkspace">
          <header className="profileDigitalHeading"><p className="eyebrow">TU PÁGINA DEL NEGOCIO</p><h1>Una sola liga para todo lo importante.</h1><p>Cobro, puntos, contacto, reseñas y enlaces del negocio en una página lista para compartir por QR, NFC o WhatsApp.</p></header>
          <div className="profileDashboardGrid">
            <div className="profileDashboardPreview">
              <ProfilePublicView
                businessName={business.name}
                slug={business.slug}
                description={business.description}
                logoUrl={business.logo_url}
                brandColor={business.brand_color}
                actions={profilePreviewActions}
                verifiedLabel="PERFIL DEL NEGOCIO"
                embedded
                showQuickActions={false}
                showFooter={false}
              />
              <div className="profileDashboardFooter"><span>Vista previa del perfil público</span><a href={`/p/${business.slug}`} target="_blank" rel="noreferrer">Ver perfil completo ↗</a></div>
            </div>
            <BusinessQr
              businessName={business.name}
              url={`https://nival-tech-platform.vercel.app/p/${business.slug}`}
              qrId="business-digital-profile-qr"
              eyebrow="COMPARTE TU NEGOCIO"
              title="Un enlace para todo"
              description="Copia el enlace, compártelo por WhatsApp o descarga el QR para mostrador, redes e impresos."
              fileSuffix="perfil-digital"
            />
          </div>
        </section>
        <section className="profileReviewSetup" id="reviews">
          <div className="settingsIntro">
            <p className="eyebrow">RESEÑAS</p>
            <h2>Haz que dejar una reseña tome un toque.</h2>
            <p>Guarda aquí el enlace de reseñas de tu negocio. Nival crea un destino estable para tu perfil, QR y tarjetas NFC; si cambias el enlace más adelante, no necesitas reimprimir la tarjeta.</p>
            {reviewLink ? <div className="reviewStatus"><span>ACTIVO</span><strong>{reviewLink.name}</strong><small>{Number(reviewLink.click_count ?? 0)} aperturas registradas</small></div> : <div className="reviewStatus pending"><span>PENDIENTE</span><strong>Aún no conectas reseñas</strong><small>Agrega el enlace que Google u otra plataforma te da para recibir opiniones.</small></div>}
          </div>
          {canManageProgram ? <form action={createSmartLink} className="settingsForm">
            <input type="hidden" name="returnTo" value="/dashboard?section=perfil-digital" />
            <input type="hidden" name="linkKind" value="google_review" />
            <input type="hidden" name="linkName" value="Reseñas del negocio" />
            <label>Enlace de reseñas<input name="targetUrl" type="url" required defaultValue={reviewLink?.target_url ?? ""} placeholder="https://..." /></label>
            <button className="primaryButton" type="submit">{reviewLink ? "Actualizar enlace de reseñas" : "Conectar reseñas"}</button>
          </form> : <p className="formMessage">Solo el propietario o un gerente puede cambiar el enlace de reseñas.</p>}
        </section>
        {!!smartLinks?.filter((link) => link.kind !== "google_review").length && <section className="smartLinksCard profileSmartLinks">
          <div><p className="eyebrow">OTROS ENLACES</p><h2>Accesos del negocio</h2></div>
          <div className="smartLinksList">{smartLinks.filter((link) => link.kind !== "google_review").map((link) => <SmartLinkQr
            key={link.id}
            id={link.id}
            name={link.name}
            kind={link.kind}
            targetUrl={link.target_url}
            url={`https://nival-tech-platform.vercel.app/go/${link.public_token}`}
            clicks={Number(link.click_count)}
            active={link.active}
            editable={canManageProgram}
          />)}</div>
        </section>}
      </>}
      {currentSection === "configuracion" && <>
      {hasIntelligence && canManageProgram && business && (
        <section className="settingsCard teamCard">
          <div className="settingsIntro">
            <p className="eyebrow">EQUIPO</p>
            <h2>Invita a quienes atienden tu negocio</h2>
            <p>Cada persona entra con su propia cuenta. Los administradores configuran el programa; el personal registra visitas y canjes.</p>
            <div className="teamList">
              {(teamMembers as TeamMember[] | null)?.map((member) => <div className="teamMember" key={member.member_email}>
                <div><strong>{member.member_name || member.member_email}</strong><span>{member.member_name ? member.member_email : "Cuenta activa"}</span></div>
                <b>{member.member_role === "owner" ? "Propietario" : member.member_role === "manager" ? "Administrador" : "Personal"}</b>
              </div>)}
              {pendingInvitations?.map((invitation) => <div className="teamMember" key={invitation.id}>
                <div><strong>{invitation.email}</strong><span>Invitación pendiente · vence {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(invitation.expires_at))}</span></div>
                <InvitationLink url={`https://nival-tech-platform.vercel.app/invite/${invitation.token}`} />
              </div>)}
            </div>
          </div>
          <form action={createTeamInvitation} className="settingsForm">
            <label>Correo de la persona<input name="inviteEmail" type="email" required autoComplete="email" placeholder="persona@negocio.com" /></label>
            <label>Rol<select name="inviteRole" defaultValue="staff">
              {membership.role === "owner" && <option value="manager">Administrador</option>}
              <option value="staff">Personal</option>
            </select></label>
            <button className="primaryButton" type="submit">Crear invitación</button>
          </form>
        </section>
      )}
      {canManageProgram && business && (
        <section className="settingsCard" id="configuracion">
          <div className="settingsIntro">
            <p className="eyebrow">PERFIL PÚBLICO</p>
            <h2>Personaliza la experiencia de tu negocio</h2>
            <p>Estos datos aparecerán en la página que tus clientes abren mediante el QR o la tarjeta NFC.</p>
          </div>
          <form action={updateBusinessProfile} className="settingsForm">
            <label>Nombre comercial<input name="businessName" required minLength={2} maxLength={100} defaultValue={business.name} /></label>
            <label>Descripción<textarea name="businessDescription" minLength={2} maxLength={240} defaultValue={business.description ?? ""} placeholder="Explica brevemente qué ofrece tu negocio." /></label>
            <label>Teléfono<input name="businessPhone" type="tel" minLength={10} maxLength={18} defaultValue={business.phone ?? ""} /></label>
            <label>Sitio web<input name="businessWebsiteUrl" type="url" defaultValue={business.website_url ?? ""} placeholder="https://..." /></label>
            <label>Sube tu logotipo <small>JPG, PNG o WebP · máximo 4 MB</small><input name="businessLogoFile" type="file" accept="image/jpeg,image/png,image/webp" /></label>
            <label>URL alternativa del logo <small>opcional</small><input name="businessLogoUrl" type="url" defaultValue={business.logo_url ?? ""} placeholder="https://..." /></label>
            <label>Color de marca<span className="colorField"><input name="businessBrandColor" type="color" defaultValue={business.brand_color ?? "#b59a61"} /><code>{business.brand_color ?? "#b59a61"}</code></span></label>
            <button className="primaryButton" type="submit">Guardar perfil</button>
          </form>
        </section>
      )}
      {hasPoints && canManageProgram && !loyaltyProgram && (
        <section className="settingsCard">
          <div className="settingsIntro"><p className="eyebrow">NIVAL PUNTOS</p><h2>Configura tu programa de lealtad</h2><p>Define cómo se acumulan puntos y qué recompensa recibirán tus clientes.</p></div>
          <form action={createLoyaltyProgram} className="settingsForm">
            <label>Nombre del programa<input name="programName" required minLength={2} maxLength={80} defaultValue="Programa de lealtad" /></label>
            <label>Puntos por visita<input name="pointsPerVisit" type="number" required min={1} max={100} step={1} defaultValue={1} /></label>
            <label>Meta de puntos<input name="rewardThreshold" type="number" required min={1} max={1000} step={1} defaultValue={10} /></label>
            <label>Recompensa<textarea name="rewardDescription" required minLength={2} maxLength={160} defaultValue="Recompensa disponible" /></label>
            <button className="primaryButton" type="submit">Activar programa de lealtad</button>
          </form>
        </section>
      )}
      {hasPoints && canManageProgram && loyaltyProgram && (
        <section className="settingsCard">
          <div className="settingsIntro">
            <p className="eyebrow">PROGRAMA DE LEALTAD</p>
            <h2>Configura cómo ganas clientes frecuentes</h2>
            <p>Los cambios se aplican a las próximas visitas. Los puntos que tus clientes ya acumularon no se modifican.</p>
          </div>
          <form action={updateLoyaltyProgram} className="settingsForm">
            <label>Nombre del programa<input name="programName" required minLength={2} maxLength={80} defaultValue={loyaltyProgram.name} /></label>
            <label>Puntos por visita<input name="pointsPerVisit" type="number" required min={1} max={100} step={1} defaultValue={loyaltyProgram.points_per_visit} /></label>
            <label>Meta de puntos<input name="rewardThreshold" type="number" required min={1} max={1000} step={1} defaultValue={loyaltyProgram.reward_threshold} /></label>
            <label>Recompensa<textarea name="rewardDescription" required minLength={2} maxLength={160} defaultValue={loyaltyProgram.reward_description} /></label>
            <button className="primaryButton" type="submit">Guardar configuración</button>
          </form>
        </section>
      )}
      </>}
      {currentSection === "clientes" && <>
      {!loyaltyProgram ? <section className="onboardingCard"><p className="eyebrow">CLIENTES</p><h1>Configura tu programa de lealtad</h1><p>Antes de registrar clientes, visitas y puntos, configura y activa el programa de lealtad de este workspace.</p><a className="primaryButton" href="/dashboard?section=configuracion">Ir a configuración</a></section> : <section className="customerTableCard" id="clientes">
        <div><p className="eyebrow">CLIENTES</p><h2>Visitas y puntos</h2></div>
        {!customers?.length ? <p className="emptyState">Aún no hay clientes registrados.</p> : (
          <div className="customerList">{customers.map((customer) => {
            const account = Array.isArray(customer.loyalty_accounts) ? customer.loyalty_accounts[0] : customer.loyalty_accounts;
            const visits = customer.visits ?? [];
            return <article key={customer.id} className="customerRow">
              <div><strong>{customer.name}</strong><span>{customer.phone ?? customer.email}</span></div>
              <div className="customerStats"><span>{visits.length} visitas</span><b>{account?.points_balance ?? 0} / {loyaltyProgram?.reward_threshold ?? "—"} puntos</b></div>
              <div className="customerActions">
                {account?.public_token && <a className="visitButton" href={`/card/${account.public_token}`}>Ver tarjeta</a>}
                <form action={recordVisit}><input type="hidden" name="customerId" value={customer.id} /><button className="visitButton">Registrar visita</button></form>
                {loyaltyProgram && Number(account?.points_balance ?? 0) >= loyaltyProgram.reward_threshold && (
                  <form action={redeemReward}><input type="hidden" name="customerId" value={customer.id} /><button className="redeemButton">Canjear premio</button></form>
                )}
              </div>
            </article>;
          })}</div>
        )}
      </section>}
      </>}
      {currentSection === "clientes" && loyaltyProgram && <section className="redemptionHistoryCard">
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
