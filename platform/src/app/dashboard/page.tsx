import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBusiness, signOut } from "@/app/auth/actions";
import { createSmartLink, createTeamInvitation, recordVisit, redeemReward, updateBusinessProfile, updateLoyaltyProgram, updatePaymentProfile } from "./actions";
import { BusinessQr } from "./business-qr";
import { SmartLinkQr } from "./smart-link-qr";
import { PaymentProfileQr } from "./payment-profile-qr";
import { InvitationLink } from "./invitation-link";

interface DashboardPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

interface TeamMember {
  member_email: string;
  member_name: string | null;
  member_role: "owner" | "manager" | "staff";
  joined_at: string;
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
      {business?.slug && <BusinessQr
        businessName={business.name}
        url={`https://nival-tech-platform.vercel.app/p/${business.slug}`}
        qrId="business-digital-profile-qr"
        eyebrow="LANDING PAGE"
        title="Perfil digital del negocio"
        description="Comparte todos tus enlaces, contacto, reseñas, pagos y programa de lealtad desde una sola página."
        fileSuffix="perfil-digital"
      />}
      {business?.slug && <BusinessQr businessName={business.name} url={`https://nival-tech-platform.vercel.app/b/${business.slug}`} />}
      {canManageProgram && (
        <section className="settingsCard">
          <div className="settingsIntro">
            <p className="eyebrow">NFC Y RESEÑAS</p>
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
      {canManageProgram && business && <section className="settingsCard">
        <div className="settingsIntro">
          <p className="eyebrow">NFC PARA COBROS</p>
          <h2>Comparte datos para transferencias</h2>
          <p>El cliente podrá copiar el titular, banco y CLABE desde una página segura. No guardes NIP, CVV, contraseñas ni códigos.</p>
          {paymentProfile && <PaymentProfileQr businessName={business.name} url={`https://nival-tech-platform.vercel.app/pay/${paymentProfile.public_token}`} views={Number(paymentProfile.view_count)} />}
        </div>
        <form action={updatePaymentProfile} className="settingsForm">
          <label>Titular de la cuenta<input name="accountHolder" required minLength={2} maxLength={120} defaultValue={paymentProfile?.account_holder ?? ""} /></label>
          <label>Banco<input name="bankName" required minLength={2} maxLength={80} defaultValue={paymentProfile?.bank_name ?? ""} /></label>
          <label>CLABE<input name="clabe" required inputMode="numeric" pattern="[0-9 ]{18,23}" defaultValue={paymentProfile?.clabe ?? ""} placeholder="18 dígitos" /></label>
          <label className="checkLabel"><input name="active" type="checkbox" defaultChecked={paymentProfile?.active ?? true} /> Página disponible</label>
          <button className="primaryButton" type="submit">Guardar datos bancarios</button>
        </form>
      </section>}
      {canManageProgram && business && (
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
