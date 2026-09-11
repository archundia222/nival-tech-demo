import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptTeamInvitation } from "@/app/dashboard/actions";

interface InvitationPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}

const roleNames = { manager: "administrador", staff: "personal" } as const;

export default async function InvitationPage({ params, searchParams }: InvitationPageProps) {
  const { token } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: invitations } = await supabase.rpc("get_business_invitation", { invitation_token: token });
  const invitation = invitations?.[0];

  if (!invitation) redirect("/auth?error=La invitación no existe.");

  const { data: { user } } = await supabase.auth.getUser();
  const available = invitation.invitation_status === "pending" && new Date(invitation.expires_at) > new Date();
  const next = `/invite/${token}`;

  return (
    <main className="authShell">
      <Link className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</Link>
      <section className="authCard">
        <p className="eyebrow">INVITACIÓN DE EQUIPO</p>
        <h1>{invitation.business_name}</h1>
        <p className="authIntro">Te invitaron a colaborar como {roleNames[invitation.invited_role as keyof typeof roleNames] ?? "personal"}.</p>
        {query.error && <div className="formMessage errorMessage">{query.error}</div>}
        {!available ? <div className="formMessage errorMessage">Esta invitación venció o ya fue utilizada.</div> : user ? (
          <form action={acceptTeamInvitation} className="authForm">
            <input type="hidden" name="invitationToken" value={token} />
            <button className="primaryButton" type="submit">Aceptar y entrar al equipo</button>
          </form>
        ) : (
          <div className="inviteActions">
            <Link className="primaryButton" href={`/auth?next=${encodeURIComponent(next)}`}>Iniciar sesión</Link>
            <Link className="visitButton" href={`/auth?mode=signup&next=${encodeURIComponent(next)}`}>Crear cuenta</Link>
          </div>
        )}
      </section>
    </main>
  );
}
