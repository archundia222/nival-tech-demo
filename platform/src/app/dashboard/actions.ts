"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncGoogleWalletObject } from "@/lib/google-wallet";

export async function createTeamInvitation(formData: FormData) {
  const email = String(formData.get("inviteEmail") ?? "").trim().toLowerCase();
  const role = String(formData.get("inviteRole") ?? "staff");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`/dashboard?error=${encodeURIComponent("Ingresa un correo válido.")}`);
  }

  if (!['manager', 'staff'].includes(role)) {
    redirect(`/dashboard?error=${encodeURIComponent("Selecciona un rol válido.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_business_invitation", {
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

export async function updatePaymentProfile(formData: FormData) {
  const holder = String(formData.get("accountHolder") ?? "").trim();
  const bank = String(formData.get("bankName") ?? "").trim();
  const clabe = String(formData.get("clabe") ?? "").replace(/\D/g, "");
  const active = formData.get("active") === "on";

  if (holder.length < 2 || holder.length > 120) {
    redirect(`/dashboard?error=${encodeURIComponent("Ingresa el nombre completo del titular.")}`);
  }

  if (bank.length < 2 || bank.length > 80) {
    redirect(`/dashboard?error=${encodeURIComponent("Ingresa el nombre del banco.")}`);
  }

  if (!/^\d{18}$/.test(clabe)) {
    redirect(`/dashboard?error=${encodeURIComponent("La CLABE debe contener exactamente 18 dígitos.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("upsert_current_payment_profile", {
    holder_name: holder,
    financial_institution: bank,
    clabe_number: clabe,
    enabled: active,
  });

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard?message=${encodeURIComponent("Datos para transferencias actualizados.")}`);
}

export async function createSmartLink(formData: FormData) {
  const name = String(formData.get("linkName") ?? "").trim();
  const kind = String(formData.get("linkKind") ?? "").trim();
  const targetUrl = String(formData.get("targetUrl") ?? "").trim();

  if (name.length < 2 || name.length > 80) {
    redirect(`/dashboard?error=${encodeURIComponent("El nombre del enlace debe tener entre 2 y 80 caracteres.")}`);
  }

  if (!["google_review", "website", "custom"].includes(kind)) {
    redirect(`/dashboard?error=${encodeURIComponent("Selecciona un tipo de enlace válido.")}`);
  }

  if (!targetUrl.startsWith("https://")) {
    redirect(`/dashboard?error=${encodeURIComponent("El destino debe comenzar con https://")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_smart_link", {
    link_name: name,
    link_kind: kind,
    destination_url: targetUrl,
  });

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard?message=${encodeURIComponent("Enlace inteligente creado.")}`);
}

export async function updateSmartLink(formData: FormData) {
  const linkId = String(formData.get("linkId") ?? "");
  const name = String(formData.get("linkName") ?? "").trim();
  const targetUrl = String(formData.get("targetUrl") ?? "").trim();
  const active = formData.get("active") === "on";

  if (name.length < 2 || name.length > 80) {
    redirect(`/dashboard?error=${encodeURIComponent("El nombre del enlace debe tener entre 2 y 80 caracteres.")}`);
  }

  if (!targetUrl.startsWith("https://")) {
    redirect(`/dashboard?error=${encodeURIComponent("El destino debe comenzar con https://")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_smart_link", {
    link_id: linkId,
    link_name: name,
    destination_url: targetUrl,
    enabled: active,
  });

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard?message=${encodeURIComponent("Enlace inteligente actualizado.")}`);
}

export async function updateBusinessProfile(formData: FormData) {
  const name = String(formData.get("businessName") ?? "").trim();
  const phone = String(formData.get("businessPhone") ?? "").trim();
  const description = String(formData.get("businessDescription") ?? "").trim();
  const logoUrl = String(formData.get("businessLogoUrl") ?? "").trim();
  const brandColor = String(formData.get("businessBrandColor") ?? "").trim();
  const websiteUrl = String(formData.get("businessWebsiteUrl") ?? "").trim();

  if (name.length < 2 || name.length > 100) {
    redirect(`/dashboard?error=${encodeURIComponent("El nombre debe tener entre 2 y 100 caracteres.")}`);
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(brandColor)) {
    redirect(`/dashboard?error=${encodeURIComponent("Selecciona un color válido.")}`);
  }

  for (const url of [logoUrl, websiteUrl]) {
    if (url && !url.startsWith("https://")) {
      redirect(`/dashboard?error=${encodeURIComponent("Las direcciones del logo y sitio web deben comenzar con https://")}`);
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_current_business_profile", {
    business_name: name,
    business_phone: phone,
    business_description: description,
    business_logo_url: logoUrl,
    business_brand_color: brandColor,
    business_website_url: websiteUrl,
  });

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  revalidatePath("/b/[slug]", "page");
  redirect(`/dashboard?message=${encodeURIComponent("Perfil público actualizado.")}`);
}

export async function updateLoyaltyProgram(formData: FormData) {
  const programName = String(formData.get("programName") ?? "").trim();
  const pointsPerVisit = Number(formData.get("pointsPerVisit"));
  const rewardThreshold = Number(formData.get("rewardThreshold"));
  const rewardDescription = String(formData.get("rewardDescription") ?? "").trim();

  if (programName.length < 2 || programName.length > 80) {
    redirect(`/dashboard?error=${encodeURIComponent("El nombre debe tener entre 2 y 80 caracteres.")}`);
  }

  if (!Number.isInteger(pointsPerVisit) || pointsPerVisit < 1 || pointsPerVisit > 100) {
    redirect(`/dashboard?error=${encodeURIComponent("Los puntos por visita deben estar entre 1 y 100.")}`);
  }

  if (!Number.isInteger(rewardThreshold) || rewardThreshold < 1 || rewardThreshold > 1000) {
    redirect(`/dashboard?error=${encodeURIComponent("La meta debe estar entre 1 y 1000 puntos.")}`);
  }

  if (rewardDescription.length < 2 || rewardDescription.length > 160) {
    redirect(`/dashboard?error=${encodeURIComponent("La recompensa debe tener entre 2 y 160 caracteres.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_current_loyalty_program_v2", {
    program_name: programName,
    awarded_points: pointsPerVisit,
    target_reward_threshold: rewardThreshold,
    target_reward_description: rewardDescription,
  });

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard");
  redirect(`/dashboard?message=${encodeURIComponent("Programa de lealtad actualizado.")}`);
}

export async function recordVisit(formData: FormData) {
  const customerId = String(formData.get("customerId") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_customer_visit", {
    target_customer_id: customerId,
  });

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);

  const { data: customer } = await supabase
    .from("customers")
    .select("name, businesses(name), loyalty_accounts(points_balance, public_token), visits(id)")
    .eq("id", customerId)
    .single();

  if (customer) {
    const account = Array.isArray(customer.loyalty_accounts)
      ? customer.loyalty_accounts[0]
      : customer.loyalty_accounts;
    const business = Array.isArray(customer.businesses)
      ? customer.businesses[0]
      : customer.businesses;

    if (account?.public_token) {
      try {
        await syncGoogleWalletObject({
          token: account.public_token,
          businessName: business?.name ?? "Nival Tech",
          customerName: customer.name,
          points: Number(account.points_balance),
          visits: customer.visits?.length ?? 0,
        });
      } catch (walletError) {
        console.error("Google Wallet sync error", walletError);
      }
    }
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Visita registrada y puntos actualizados.");
}


export async function redeemReward(formData: FormData) {
  const customerId = String(formData.get("customerId") ?? "");
  const supabase = await createClient();
  const { data: redemption, error } = await supabase.rpc("redeem_customer_reward", {
    target_customer_id: customerId,
  });

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);

  const { data: customer } = await supabase
    .from("customers")
    .select("name, businesses(name), loyalty_accounts(points_balance, public_token), visits(id)")
    .eq("id", customerId)
    .single();

  if (customer) {
    const account = Array.isArray(customer.loyalty_accounts)
      ? customer.loyalty_accounts[0]
      : customer.loyalty_accounts;
    const business = Array.isArray(customer.businesses)
      ? customer.businesses[0]
      : customer.businesses;

    if (account?.public_token) {
      try {
        await syncGoogleWalletObject({
          token: account.public_token,
          businessName: business?.name ?? "Nival Tech",
          customerName: customer.name,
          points: Number(account.points_balance),
          visits: customer.visits?.length ?? 0,
        });
      } catch (walletError) {
        console.error("Google Wallet sync error after redemption", walletError);
      }
    }
  }

  const result = redemption?.[0];
  const reward = result?.redeemed_reward ?? "Recompensa";
  revalidatePath("/dashboard");
  redirect(`/dashboard?message=${encodeURIComponent(`${reward} canjeada correctamente.`)}`);
}
