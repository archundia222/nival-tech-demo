import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBusiness, signOut } from "@/app/auth/actions";
import { recordVisit, redeemReward, updateBusinessProfile, updateLoyaltyProgram } from "./actions";
import { BusinessQr } from "./business-qr";

interface DashboardPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: memberships } = await supabase
    .from("business_members")
    .select("role, businesses(id, name, slug, phone, description, logo_url, brand_color, website_url, subscription_status)")
    .eq("user_id", user.id);
  const membership = memberships?.[0];

  if (!membership) {
    return (
      <main className="dashboardShell">
        <header className="dashboardTopbar"><span className="brand"><span className="brandmark">N</span>NIVAL tech</span><form action={signOut}><button className="textButton">Cerrar sesión</button></form></header>
        <section className="onboardingCard">
          <p className="eyebrow">CONFIGURACIÓN INICIAL</p>
          <h1>Crea tu primer negocio</h1>
          <p>Este nombre identificará el espacio privado donde vivirán tus clientes, puntos y campañas.</p>
          {params.error && <div className="formMessage errorMessage">{params.error}</div>}
          <form action={createBusiness} className="authForm">
            <label>Nombre del negocio<input name="businessName" required minLength={2} maxLength={100} placeholder="Ej. Barbería Norte" /></label>
            <label>Dirección web<input name="businessSlug" required minLength={2} maxLength={60} placeholder="barberia-norte" pattern="[A-Za-z0-9ÁÉÍÓÚáéíóúÑñ -]+" /></label>
            <button className="primaryButton" type="submit">Crear negocio</button>
          </form>
        </section>
      </main>
    );
  }

  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const businessId = business?.id;
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
  const canManageProgram = membership.role === "owner" || membership.role === "manager";

  return (
    <main className="dashboardShell">
      <header className="dashboardTopbar"><span className="brand"><span className="brandmark">N</span>NIVAL tech</span><form action={signOut}><button className="textButton">Cerrar sesión</button></form></header>
      <section className="dashboardHero">
        <div><p className="eyebrow">NIVAL INTELLIGENCE</p><h1>{business?.name ?? "Tu negocio"}</h1><p>El espacio privado ya está conectado a Supabase.</p></div>
        <span className="ready">{business?.subscription_status ?? "trial"}</span>
      </section>
      <section className="metricGrid">
        <article><span>Clientes</span><strong>{customerCount ?? 0}</strong></article>
        <article><span>Visitas</span><strong>{visitCount ?? 0}</strong></article>
        <article><span>Campañas</span><strong>{campaignCount ?? 0}</strong></article>
        <article><span>Estado</span><strong>Inicial</strong></article>
      </section>
      {business?.slug && <BusinessQr businessName={business.name} url={`https://nival-tech-platform.vercel.app/b/${business.slug}`} />}
      {canManageProgram && business && (
        <section className="settingsCard">
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
            <label>Color de marca<span className="colorField"><input name="businessBrandColor" type="color" defaultValue={business.brand_color ?? "#b9ff74"} /><code>{business.brand_color ?? "#b9ff74"}</code></span></label>
            <button className="primaryButton" type="submit">Guardar perfil</button>
          </form>
        </section>
      )}
      {canManageProgram && loyaltyProgram && (
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
      {params.error && <div className="formMessage errorMessage dashboardMessage">{params.error}</div>}
      {params.message && <div className="formMessage successMessage dashboardMessage">{params.message}</div>}
      <section className="customerTableCard">
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
      </section>
      <section className="redemptionHistoryCard">
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
      </section>
    </main>
  );
}
