"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncGoogleWalletObject } from "@/lib/google-wallet";
import { getActiveBusinessMembership } from "@/lib/active-business";

async function getActiveManagerContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership || !["owner", "manager"].includes(membership.role)) redirect("/dashboard?error=No+tienes+permiso+para+administrar+este+negocio.");
  return { supabase, user, businessId: membership.business_id, role: membership.role };
}

export async function refreshRecommendations() {
  const { supabase, businessId } = await getActiveManagerContext();
  const { data, error } = await supabase.rpc("refresh_business_recommendations_for", { p_business_id: businessId });

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard?message=${encodeURIComponent(`${Number(data ?? 0)} recomendaciones actualizadas.`)}`);
}

export async function dismissRecommendation(formData: FormData) {
  const recommendationId = String(formData.get("recommendationId") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("dismiss_current_recommendation", {
    recommendation_id: recommendationId,
  });

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard?message=${encodeURIComponent("Recomendación descartada.")}`);
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

function smartLinkReturnPath(formData: FormData) {
  const requested = String(formData.get("returnTo") ?? "").trim();
  return requested === "/dashboard?section=perfil-digital"
    ? requested
    : "/dashboard?section=nival-card";
}

export async function createSmartLink(formData: FormData) {
  const returnPath = smartLinkReturnPath(formData);
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

  const { supabase, businessId } = await getActiveManagerContext();

  if (kind === "google_review") {
    const { data: existing } = await supabase.from("smart_links")
      .select("id")
      .eq("business_id", businessId)
      .eq("kind", "google_review")
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      const { error: updateError } = await supabase.rpc("update_smart_link_for", {
        p_business_id: businessId,
        link_id: existing.id,
        link_name: name,
        destination_url: targetUrl,
        enabled: true,
      });
      if (updateError) redirect(`${returnPath}&error=${encodeURIComponent(updateError.message)}`);
      revalidatePath("/dashboard");
      redirect(`${returnPath}&message=${encodeURIComponent("Enlace de reseñas actualizado.")}`);
    }
  }

  const { error } = await supabase.rpc("create_smart_link_for", {
    p_business_id: businessId,
    link_name: name,
    link_kind: kind,
    destination_url: targetUrl,
  });

  if (error) redirect(`${returnPath}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect(`${returnPath}&message=${encodeURIComponent("Enlace inteligente creado.")}`);
}

export async function updateSmartLink(formData: FormData) {
  const returnPath = smartLinkReturnPath(formData);
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

  const { supabase, businessId } = await getActiveManagerContext();
  const { error } = await supabase.rpc("update_smart_link_for", {
    p_business_id: businessId,
    link_id: linkId,
    link_name: name,
    destination_url: targetUrl,
    enabled: active,
  });

  if (error) redirect(`${returnPath}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect(`${returnPath}&message=${encodeURIComponent("Enlace inteligente actualizado.")}`);
}

export async function updateBusinessProfile(formData: FormData) {
  const name = String(formData.get("businessName") ?? "").trim();
  const phone = String(formData.get("businessPhone") ?? "").trim();
  const description = String(formData.get("businessDescription") ?? "").trim();
  let logoUrl = String(formData.get("businessLogoUrl") ?? "").trim();
  const logoFile = formData.get("businessLogoFile");
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

  const { supabase, businessId } = await getActiveManagerContext();

  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.size > 4 * 1024 * 1024) {
      redirect(`/dashboard?section=configuracion&error=${encodeURIComponent("El logotipo debe pesar menos de 4 MB.")}`);
    }
    const bytes = new Uint8Array(await logoFile.arrayBuffer());
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const pngSignature = [137,80,78,71,13,10,26,10];
    const png = bytes.length >= 8 && pngSignature.every((value,index) => bytes[index] === value);
    const decoder = new TextDecoder();
    const webp = bytes.length >= 12 && decoder.decode(bytes.slice(0,4)) === "RIFF" && decoder.decode(bytes.slice(8,12)) === "WEBP";
    const contentType = jpeg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : null;
    if (!contentType || logoFile.type !== contentType) {
      redirect(`/dashboard?section=configuracion&error=${encodeURIComponent("Sube un logotipo JPG, PNG o WebP válido.")}`);
    }
    const extension = contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";
    const path = `${businessId}/logo-${crypto.randomUUID()}.${extension}`;
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage.from("business-assets").upload(path, bytes, { contentType, upsert: false });
    if (uploadError) {
      redirect(`/dashboard?section=configuracion&error=${encodeURIComponent("No pudimos subir el logotipo.")}`);
    }
    logoUrl = admin.storage.from("business-assets").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.rpc("update_business_profile_for", {
    p_business_id: businessId,
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
  redirect(`/dashboard?section=perfil-digital&message=${encodeURIComponent("Perfil del negocio actualizado.")}`);
}

export async function createLoyaltyProgram(formData: FormData) {
  const programName = String(formData.get("programName") ?? "").trim();
  const pointsPerVisit = Number(formData.get("pointsPerVisit"));
  const rewardThreshold = Number(formData.get("rewardThreshold"));
  const rewardDescription = String(formData.get("rewardDescription") ?? "").trim();
  if (programName.length < 2 || programName.length > 80 || !Number.isInteger(pointsPerVisit) || pointsPerVisit < 1 || pointsPerVisit > 100 || !Number.isInteger(rewardThreshold) || rewardThreshold < 1 || rewardThreshold > 1000 || rewardDescription.length < 2 || rewardDescription.length > 160) {
    redirect(`/dashboard?section=configuracion&error=${encodeURIComponent("Revisa los datos del programa de lealtad.")}`);
  }
  const { supabase, businessId } = await getActiveManagerContext();
  const { data: business } = await supabase.from("businesses").select("product_level").eq("id", businessId).maybeSingle();
  const { data: pointsEntitlement } = await supabase.from("business_product_entitlements")
    .select("status")
    .eq("business_id", businessId)
    .eq("product_code", "nival_points")
    .in("status", ["active","free"])
    .maybeSingle();
  if (business?.product_level !== "intelligence" && !pointsEntitlement) redirect("/dashboard?section=resumen");
  const { data: existing } = await supabase.from("loyalty_programs").select("id").eq("business_id", businessId).eq("active", true).limit(1).maybeSingle();
  if (existing) redirect("/dashboard?section=configuracion");
  const { error } = await supabase.from("loyalty_programs").insert({ business_id: businessId, name: programName, points_per_visit: pointsPerVisit, reward_threshold: rewardThreshold, reward_description: rewardDescription, active: true });
  if (error) redirect(`/dashboard?section=configuracion&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard?section=configuracion&message=${encodeURIComponent("Programa de lealtad activado.")}`);
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

  const { supabase, businessId } = await getActiveManagerContext();
  const { error } = await supabase.rpc("update_loyalty_program_for", {
    p_business_id: businessId,
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
