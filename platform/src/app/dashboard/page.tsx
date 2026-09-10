import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBusiness, signOut } from "@/app/auth/actions";
import { recordVisit, redeemReward, updateLoyaltyProgram } from "./actions";
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
    .select("role, businesses(id, name, slug, subscription_status)")
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
    </main>
  );
}
