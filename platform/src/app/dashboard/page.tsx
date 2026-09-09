import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBusiness, signOut } from "@/app/auth/actions";

interface DashboardPageProps {
  searchParams: Promise<{ error?: string }>;
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
    </main>
  );
}
