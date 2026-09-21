"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createPointsAdminClient } from "@/lib/supabase/points-admin";
import { createClient } from "@/lib/supabase/server";

async function rateKey(endpoint: "enroll" | "card" | "scan_token") {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return crypto.createHash("sha256").update(`${endpoint}:${ip}`).digest("hex");
}

async function enforceRate(endpoint: "enroll" | "card" | "scan_token", limit: number, windowSeconds: number) {
  const admin = createPointsAdminClient();
  const { data, error } = await admin.rpc("consume_points_rate_limit", {
    p_endpoint: endpoint,
    p_identifier_hash: await rateKey(endpoint),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error || data !== true) throw new Error("Demasiados intentos. Espera un momento y vuelve a intentar.");
}

export async function getPublicPointsProgram(slug: string) {
  await enforceRate("card", 30, 60);
  const admin = createPointsAdminClient();
  const { data, error } = await admin.rpc("get_public_points_program", { p_business_slug: slug });
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function enrollPointsCustomer(formData: FormData) {
  await enforceRate("enroll", 8, 60);
  const slug = String(formData.get("slug") ?? "").trim();
  const admin = createPointsAdminClient();
  const { data, error } = await admin.rpc("enroll_points_customer", {
    p_business_slug: slug,
    p_customer_name: String(formData.get("name") ?? "").trim(),
    p_customer_phone: String(formData.get("phone") ?? "").trim(),
    p_marketing_consent: formData.get("marketingConsent") === "on",
    p_origin: formData.get("origin") === "nfc" ? "nfc" : "qr",
    p_privacy_notice_version: "2026-09-21",
  });
  if (error || !data?.[0]) return { ok: false, error: error?.message ?? "No pudimos crear tu tarjeta." };
  return { ok: true, token: data[0].account_token as string };
}

export async function getPublicLoyaltyCard(token: string) {
  await enforceRate("card", 60, 60);
  const admin = createPointsAdminClient();
  const { data, error } = await admin.rpc("get_public_loyalty_card_v3", { p_account_token: token });
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function issueCustomerScanToken(token: string) {
  await enforceRate("scan_token", 12, 60);
  const raw = crypto.randomBytes(32).toString("base64url");
  const admin = createPointsAdminClient();
  const { data, error } = await admin.rpc("issue_customer_scan_token", {
    p_account_token: token,
    p_raw_token: raw,
  });
  if (error || !data?.[0]) return { ok: false, error: error?.message ?? "No pudimos generar el QR." };
  return { ok: true, raw, expiresAt: data[0].expires_at as string };
}

export async function claimScanToken(raw: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_customer_scan_token", { p_raw_token: raw.trim() });
  if (error || !data?.[0]) return { ok: false, error: "QR expirado, usado o no pertenece a este negocio." };
  return { ok: true, customer: data[0] };
}

export async function awardPoint(scanSessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("award_point", { p_scan_session_id: scanSessionId });
  if (error) {
    const message = error.message.includes("cooldown") ? "Ya sumaste un punto recientemente."
      : error.message.includes("daily_points_cap") ? "Este cliente alcanzó su límite diario."
      : error.message.includes("already_awarded") ? "Este punto ya fue registrado."
      : "No pudimos sumar el punto.";
    return { ok: false, error: message };
  }
  revalidatePath("/dashboard/points");
  return { ok: true, result: data?.[0] };
}

export async function redeemPointReward(scanSessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_reward", { p_scan_session_id: scanSessionId });
  if (error) {
    const message = error.message.includes("insufficient") ? "El cliente todavía no tiene puntos suficientes."
      : error.message.includes("already_redeemed") ? "Este premio ya fue canjeado."
      : "No pudimos canjear el premio.";
    return { ok: false, error: message };
  }
  revalidatePath("/dashboard/points");
  return { ok: true, result: data?.[0] };
}

export async function updatePointsProgram(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_points_program", {
    p_name: String(formData.get("name") ?? "").trim(),
    p_reward_threshold: Number(formData.get("threshold")),
    p_reward_description: String(formData.get("reward") ?? "").trim(),
    p_cooldown_minutes: Number(formData.get("cooldown")),
    p_daily_cap: Number(formData.get("dailyCap")),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/points");
  return { ok: true };
}

export async function reversePoint(ledgerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reverse_point_movement", { p_ledger_id: ledgerId, p_reason: "Anulación desde panel" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/points");
  return { ok: true, result: data?.[0] };
}


export async function reversePointForm(formData: FormData) {
  const ledgerId = String(formData.get("ledgerId") ?? "");
  if (!ledgerId) return;
  await reversePoint(ledgerId);
}
