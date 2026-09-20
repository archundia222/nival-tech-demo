import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { createLoyaltyProgram, createSmartLink, createTeamInvitation, dismissRecommendation, recordVisit, redeemReward, refreshRecommendations, updateBusinessProfile, updateLoyaltyProgram } from "./actions";
import { BusinessQr } from "./business-qr";
import { SmartLinkQr } from "./smart-link-qr";
import { PaymentProfileQr } from "./payment-profile-qr";
import { InvitationLink } from "./invitation-link";
import { BusinessOnboardingForm } from "./business-onboarding-form";
import { DashboardNavigation } from "./dashboard-navigation";

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
    "nival-card": "Nival Card",
    "perfil-digital": "Perfil digital",
    configuracion: "Configuración",
  };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: memberships } = await supabase
    .from("business_members")
    .select("role, businesses(id, name, slug, phone, description, logo_url, brand_color, website_url, subscription_status, product_level)")
    .eq("user_id", user.id);
  const membership = memberships?.[0];

  if (!membership) {
    return (
      <main className="dashboardShell">
        <header className="dashboardTopbar"><span className="brand"><span className="brandmark">N</span>NIVAL tech</span><form action={signOut}><button className="textButton">Cerrar sesión</button></form></header>
        <section className="onboardingCard">
          <p className="eyebrow">CONFIGURACIÓN INICIAL</p>
          <h1>Crea tu primer negocio</h1>
          <p>Este nombre aparecerá en las páginas y productos que configures para tu negocio.</p>
          {params.error && <div className="formMessage errorMessage">{params.error}</div>}
          <BusinessOnboardingForm next={params.next === "/dashboard/pay" ? params.next : "/products"} />
        </section>
      </main>
    );
  }

  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const businessId = business?.id;
  const productLevel: 'pay' | 'intelligence' = business?.product_level === 'intelligence' ? 'intelligence' : 'pay';
  const { data: entitlementRows } = businessId ? await supabase.from('business_product_entitlements')
    .select('product_code').eq('business_id', businessId).eq('status', 'active') : { data: [] };
  const activeProducts = new Set((entitlementRows ?? []).map((item) => item.product_code));
  const hasIntelligence = productLevel === 'intelligence' || activeProducts.has('nival_intelligence');
  const hasPoints = hasIntelligence || activeProducts.has('nival_points');
  if ((!hasPoints && currentSection === 'clientes') || (!hasIntelligence && currentSection === 'inteligencia')) redirect('/dashboard?section=resumen');
  const [{ count: customerCount }, { count: visitCount }, { count: campaignCount }] = businessId
    ? await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("visits").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("business_id", businessId),
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
  const hasNivalPay = Boolean(paidNivalPayOrder);
  const canManageProgram = membership.role === "owner" || membership.role === "manager";
  const [{ data: teamMembers }, { data: pendingInvitations }] = canManageProgram && businessId
    ? await Promise.all([
        supabase.rpc("get_current_business_team"),
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
    ? await supabase.rpc("get_current_business_segments")
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
  const segmentMetrics = [
    { label: "Nuevos", value: Number(segments?.new_customers ?? 0) },
    { label: "Frecuentes", value: Number(segments?.frequent_customers ?? 0) },
    { label: "En riesgo", value: Number(segments?.at_risk_customers ?? 0) },
    { label: "Con premio", value: Number(segments?.reward_ready_customers ?? 0) },
  ];
  const maxSegmentValue = Math.max(...segmentMetrics.map((segment) => segment.value), 1);
  const maxVisitValue = Math.max(recentVisits, previousVisits, 1);

  return (
    <main className="dashboardApp">
      <DashboardNavigation businessName={business?.name ?? "Tu negocio"} active={currentSection} productLevel={productLevel} />
      <div className="dashboardContent">
      <header className="dashboardContentTopbar"><div><span>{sectionTitles[currentSection]}</span><b>{new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "America/Mexico_City" }).format(new Date())}</b></div><span className="ready">{business?.subscription_status === 'active' ? 'Activo' : business?.subscription_status === 'trial' ? 'Configuración pendiente' : 'Acceso pausado'}</span></header>
      {currentSection === "resumen" && <>
      <section className="dashboardHero" id="resumen">
        <div>
          <p className="eyebrow">OPERACIÓN NIVAL TECH</p>
          <h1>{business?.name ?? "Tu negocio"}</h1>
          <p>Consulta lo esencial de tu cuenta y entra directamente a los productos que ya utilizas.</p>
          <a className="loginLink" href={hasNivalPay ? "/dashboard/pay" : "/checkout"}>{hasNivalPay ? "Abrir Nival Pay" : "Activar Nival Pay"}</a>
        </div>
      </section>
      <section className="metricGrid">
        <article><span>Nival Pay</span><strong>{hasNivalPay ? "Activo" : "Sin activar"}</strong></article>
        {hasIntelligence && <article><span>Clientes</span><strong>{customerCount ?? 0}</strong></article>}
        <article><span>Vistas de cobro</span><strong>{paymentProfile ? Number(paymentProfile.view_count) : 0}</strong></article>
        <article><span>Cuenta</span><strong>{business?.subscription_status === "active" ? "Activa" : "Configuración"}</strong></article>
      </section>
      <section className="analyticsGrid" aria-label="Accesos rápidos">
        <article className="chartCard">
          <div className="chartHeading"><div><span>NIVAL PAY</span><h2>Página de cobro</h2></div></div>
          <p>{hasNivalPay ? "Tu producto está activado. Desde aquí puedes revisar y actualizar los datos que verá el cliente al acercar la tarjeta." : "Activa Nival Pay para preparar la página de cobro que abrirá tu tarjeta NFC."}</p>
          <a className="loginLink" href={hasNivalPay ? "/dashboard/pay" : "/checkout"}>{hasNivalPay ? "Administrar Nival Pay" : "Activar por $10 MXN (prueba)"}</a>
        </article>
        <article className="chartCard">
          <div className="chartHeading"><div><span>NIVAL CARD</span><h2>Tarjetas y enlaces</h2></div></div>
          <p>Precio temporal para pruebas reales: activa Nival Pay y agrega nuevos links con QR por $10 MXN. La tarjeta física conserva su precio porque aún no se cobra en línea.</p>
          <a className="loginLink" href="/dashboard?section=nival-card">Abrir Nival Card</a>
        </article>
      </section>
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
      <section className="nivalAssetsIntro">
        <div className="assetsHeading"><p className="eyebrow">TARJETAS Y LINKS</p><h1>Tus puntos de cobro</h1><p>Tu Nival Pay principal y todo lo que puedes agregar, presentado como productos reales.</p></div>
        <div className="nivalProductShelf">
          <article className="nivalProductItem">
            <div className="productItemHeading"><div><small>TU TARJETA</small><h2>Nival Pay</h2></div><span className={hasNivalPay ? "productActive" : "productInactive"}>{hasNivalPay ? "Activa" : "Sin activar"}</span></div>
            <a className="nivalCardPedestal" href={hasNivalPay ? "/dashboard/pay" : "/checkout"} aria-label={hasNivalPay ? "Administrar Nival Pay" : "Activar Nival Pay"}>
              <div className="nivalPhysicalCard" aria-label="Representación de tarjeta Nival Pay">
                <div className="nivalCardMark">N</div>
                <div className="nivalCardCopy"><strong>NIVAL</strong><span>PAY</span></div>
                <small>NFC · PÁGINA DE COBRO</small>
              </div>
              <div className="nivalCardBase" aria-hidden="true" />
            </a>
            <p>Página de cobro, QR y tarjeta NFC principal. <a className="productManageLink" href={hasNivalPay ? "/dashboard/pay" : "/checkout"}>{hasNivalPay ? "Administrar" : "Activar"} →</a></p>
          </article>
          <article className="nivalAddProduct">
            <span className="nivalAddIcon" aria-hidden="true">+</span>
            <div><h2>Agregar Nival Pay</h2><p>Otra página de cobro independiente</p><strong>$10 MXN · prueba</strong><a className="nivalProductAction" href="/dashboard/pay?new=1">Crear otra</a></div>
            <div className="nivalAddDivider" />
            <div><p>Comprar plástico NFC</p><strong>$99 MXN</strong><a className="nivalProductAction secondary" href="/products">Ver tarjetas</a></div>
          </article>
        </div>
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
        <section className="nivalAssetsIntro profileDigitalIntro">
          <div className="assetsHeading"><p className="eyebrow">PERFIL DIGITAL</p><h1>Todo tu negocio en un enlace</h1><p>Comparte contacto, reseñas, pagos y enlaces desde una sola página.</p></div>
        </section>
        <BusinessQr
          businessName={business.name}
          url={`https://nival-tech-platform.vercel.app/p/${business.slug}`}
          qrId="business-digital-profile-qr"
          eyebrow="TU ENLACE PÚBLICO"
          title="Perfil digital del negocio"
          description="Comparte este enlace o descarga el QR para mostrar toda la información pública de tu negocio."
          fileSuffix="perfil-digital"
        />
      </>}
      {currentSection === "configuracion" && <>
      {canManageProgram && business && <section className="settingsCard">
        <div className="settingsIntro">
          <p className="eyebrow">NFC PARA COBROS</p>
          <h2>Comparte datos para transferencias</h2>
          <p>El cliente podrá copiar el titular, banco y CLABE desde una página segura. No guardes NIP, CVV, contraseñas ni códigos.</p>
          {hasNivalPay && paymentProfile && <PaymentProfileQr businessName={business.name} url={`https://nival-tech-platform.vercel.app/pay/${paymentProfile.public_token}`} views={Number(paymentProfile.view_count)} />}
        </div>
        <a className="primaryButton" href={hasNivalPay ? "/dashboard/pay" : "/checkout"}>{hasNivalPay ? "Configurar mi página Nival Pay" : "Activar Nival Pay"}</a>
      </section>}
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
            <label>URL del logo<input name="businessLogoUrl" type="url" defaultValue={business.logo_url ?? ""} placeholder="https://..." /></label>
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
      {params.error && <div className="formMessage errorMessage dashboardMessage">{params.error}</div>}
      {params.message && <div className="formMessage successMessage dashboardMessage">{params.message}</div>}
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
