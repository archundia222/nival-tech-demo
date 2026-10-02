"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusinessMembership } from "@/lib/active-business";

async function getActiveManagerContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership || !["owner", "manager"].includes(membership.role)) redirect("/dashboard?error=No+tienes+permiso+para+administrar+este+negocio.");
  return { supabase, user, businessId: membership.business_id, role: membership.role };
}


export async function createTeamInvitation(formData: FormData) {
  const email = String(formData.get("inviteEmail") ?? "").trim().toLowerCase();
  const role = String(formData.get("inviteRole") ?? "staff");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`/dashboard?error=${encodeURIComponent("Ingresa un correo válido.")}`);
  }

  if (!['manager', 'staff'].includes(role)) {
    redirect(`/dashboard?error=${encodeURIComponent("Selecciona un rol válido.")}`);
  }

  const { supabase, businessId, role: currentRole } = await getActiveManagerContext();
  if (role === "manager" && currentRole !== "owner") {
    redirect(`/dashboard?section=configuracion&error=${encodeURIComponent("Solo el propietario puede invitar a otro administrador.")}`);
  }
  const { error } = await supabase.rpc("create_business_invitation_for", {
    p_business_id: businessId,
    invitee_email: email,
    invited_role: role,
  });

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard?message=${encodeURIComponent("Invitación creada. Copia el enlace y compártelo con la persona.")}`);
}

export async function acceptTeamInvitation(formData: FormData) {
  const token = String(formData.get("invitationToken") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_business_invitation", {
    invitation_token: token,
  });

  if (error) redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard?message=${encodeURIComponent("Te uniste al equipo correctamente.")}`);
}
