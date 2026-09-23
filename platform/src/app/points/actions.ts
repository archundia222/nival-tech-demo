"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPointsAdminClient } from "@/lib/supabase/points-admin";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusinessMembership } from "@/lib/active-business";

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
    p_privacy_notice_version: "2026-09-23",
  });
  if (error || !data?.[0]) {
    const message = error?.message?.includes('free_customer_limit_reached')
      ? 'Este negocio llegó al límite de 30 clientes de Nival Puntos Gratis. El dueño puede pasar a Pro para seguir agregando clientes.'
      : error?.message?.includes('points_program_unavailable')
        ? 'Este programa de puntos no está disponible.'
        : error?.message ?? 'No pudimos crear tu tarjeta.';
    return { ok: false, error: message };
  }
  return { ok: true, token: data[0].account_token as string };
}

export async function getPublicLoyaltyRewards(token: string) {
  const admin = createPointsAdminClient();
  const { data, error } = await admin.rpc("get_public_loyalty_rewards", { p_account_token: token });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPublicLoyaltyCard(token: string) {
  await enforceRate("card", 60, 60);
  const admin = createPointsAdminClient();
  const { data, error } = await admin.rpc("get_public_loyalty_card_v4", { p_account_token: token });
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function issueCustomerScanToken(token: string, purpose: "visit" | "redeem" = "visit", rewardId?: string) {
  await enforceRate("scan_token", 12, 60);
  const raw = crypto.randomBytes(32).toString("base64url");
  const shortCode = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  const admin = createPointsAdminClient();
  const { data, error } = await admin.rpc("issue_customer_scan_token", {
    p_account_token: token,
    p_raw_token: raw,
    p_short_code: shortCode,
    p_purpose: purpose,
    p_reward_id: purpose === "redeem" ? rewardId ?? null : null,
  });
  if (error || !data?.[0]) return { ok: false, error: error?.message ?? "No pudimos generar el QR." };
  return { ok: true, raw, shortCode, expiresAt: data[0].expires_at as string };
}

export async function claimScanToken(raw: string, purpose: "visit" | "redeem") {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_customer_scan_token", { p_raw_token: raw.trim(), p_expected_purpose: purpose });
  if (error || !data?.[0]) return { ok: false, error: error?.message.includes("wrong_scan_purpose") ? (purpose === "visit" ? "Este código es para canjear una recompensa, no para sumar puntos." : "Este código es para sumar puntos, no para canjear.") : "QR expirado, usado o no pertenece a este negocio." };
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
    const message = error.message.includes("no_available_reward") ? "Este cliente no tiene recompensas disponibles."
      : error.message.includes("already_redeemed") ? "Este premio ya fue canjeado."
      : error.message.includes("wrong_scan_purpose") ? "Este código no sirve para canjear recompensas."
      : "No pudimos canjear el premio.";
    return { ok: false, error: message };
  }
  revalidatePath("/dashboard/points");
  return { ok: true, result: data?.[0] };
}


function normalizeSaleAmount(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().replace(/,/g, "");
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return null;
  return Math.round(amount * 100);
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(value.trim()); value = "";
    } else value += char;
  }
  cells.push(value.trim());
  return cells;
}

async function activeBusinessContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=%2Fdashboard%2Fpoints%3Fview%3Dregister");
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect("/dashboard");
  return { supabase, user, membership };
}

function captureReturn(formData: FormData, key: 'error' | 'saved', value: string) {
  const requested = String(formData.get("returnTo") ?? "").trim();
  const base = requested.startsWith("/dashboard/intelligence")
    ? requested
    : requested.startsWith("/dashboard/points")
      ? requested
      : "/dashboard/points?view=register";
  const url = new URL(base, "https://nival.local");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function normalizedPhoneKeys(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return [];
  return digits.length > 10 ? [digits, digits.slice(-10)] : [digits];
}

export async function registerQuickCustomer(formData: FormData) {
  const { supabase, membership } = await activeBusinessContext();
  if (formData.get("privacyAcknowledged") !== "on") {
    redirect(captureReturn(formData, "error", "Confirma que informaste al cliente sobre el uso de sus datos."));
  }
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const { data, error } = await supabase.rpc("register_business_customer_quick", {
    p_business_id: membership.business_id,
    p_name: name,
    p_phone: phone,
    p_email: email || null,
    p_marketing_consent: formData.get("marketingConsent") === "on",
  });
  if (error || !data?.[0]) {
    const message = error?.message?.includes("free_customer_limit_reached") ? "Llegaste al límite de 30 clientes del plan Gratis."
      : error?.message?.includes("invalid_phone") ? "Revisa el teléfono del cliente."
      : error?.message?.includes("invalid_name") ? "Escribe el nombre del cliente."
      : error?.message?.includes("points_program_unavailable") ? "Configura primero tu programa de Nival Puntos."
      : "No pudimos registrar al cliente.";
    redirect(captureReturn(formData, "error", message));
  }
  revalidatePath("/dashboard/points");
  revalidatePath("/dashboard/intelligence");
  redirect(captureReturn(formData, "saved", data[0].already_exists ? "existing" : "customer"));
}

export async function registerQuickSale(formData: FormData) {
  const { supabase, user, membership } = await activeBusinessContext();
  const amountCents = normalizeSaleAmount(formData.get("amount"));
  const paymentMethod = String(formData.get("paymentMethod") ?? "other");
  const customerId = String(formData.get("customerId") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  if (!amountCents) redirect(captureReturn(formData, "error", "Ingresa un monto válido."));
  if (!["cash","transfer","card","other"].includes(paymentMethod)) redirect(captureReturn(formData, "error", "Selecciona un método de pago válido."));

  if (customerId) {
    const { data: customer } = await supabase.from("customers").select("id")
      .eq("id", customerId).eq("business_id", membership.business_id).maybeSingle();
    if (!customer) redirect(captureReturn(formData, "error", "Ese cliente no pertenece a este negocio."));
  }

  const { error } = await supabase.from("business_sales").insert({
    business_id: membership.business_id,
    customer_id: customerId,
    amount_cents: amountCents,
    payment_method: paymentMethod,
    transactions_count: 1,
    source: "manual",
    note,
    created_by: user.id,
  });
  if (error) redirect(captureReturn(formData, "error", "No pudimos guardar la venta."));
  revalidatePath("/dashboard/points");
  revalidatePath("/dashboard/intelligence");
  redirect(captureReturn(formData, "saved", "sale"));
}

export async function registerDailySalesSummary(formData: FormData) {
  const { supabase, user, membership } = await activeBusinessContext();
  const amountCents = normalizeSaleAmount(formData.get("amount"));
  const transactions = Math.max(1, Math.min(100000, Number(formData.get("transactions") ?? 1) || 1));
  const saleDate = String(formData.get("saleDate") ?? "").trim();
  if (!amountCents) redirect(captureReturn(formData, "error", "Ingresa el total vendido."));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) redirect(captureReturn(formData, "error", "Selecciona la fecha del resumen."));

  const dayStart = `${saleDate}T00:00:00Z`;
  const nextDate = new Date(`${saleDate}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const dayEnd = nextDate.toISOString();

  const { data: existingSummary } = await supabase.from("business_sales")
    .select("id")
    .eq("business_id", membership.business_id)
    .eq("source", "summary")
    .gte("sold_at", dayStart)
    .lt("sold_at", dayEnd)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const summaryPayload = {
    amount_cents: amountCents,
    payment_method: "summary",
    transactions_count: transactions,
    sold_at: `${saleDate}T12:00:00Z`,
    source: "summary",
    note: "Resumen diario",
    created_by: user.id,
  };

  const { error } = existingSummary
    ? await supabase.from("business_sales").update(summaryPayload).eq("id", existingSummary.id).eq("business_id", membership.business_id)
    : await supabase.from("business_sales").insert({ business_id: membership.business_id, ...summaryPayload });
  if (error) redirect(captureReturn(formData, "error", "No pudimos guardar el resumen."));
  revalidatePath("/dashboard/points");
  revalidatePath("/dashboard/intelligence");
  redirect(captureReturn(formData, "saved", "summary"));
}

export async function importSalesCsv(formData: FormData) {
  const { supabase, user, membership } = await activeBusinessContext();
  if (formData.get("dataAuthorization") !== "on") {
    redirect(captureReturn(formData, "error", "Confirma que puedes utilizar los datos incluidos en este archivo."));
  }
  const entry = formData.get("salesFile");
  if (!(entry instanceof File) || !entry.size) redirect(captureReturn(formData, "error", "Selecciona un archivo CSV."));
  if (entry.size > 2_000_000) redirect(captureReturn(formData, "error", "El CSV debe pesar menos de 2 MB."));

  const text = await entry.text();
  const importReference = crypto.createHash("sha256").update(text).digest("hex");
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) redirect(captureReturn(formData, "error", "El CSV no tiene filas para importar."));

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
  const find = (...names: string[]) => headers.findIndex((h) => names.includes(h));
  const amountIndex = find("monto","amount","total","venta","importe");
  const dateIndex = find("fecha","date","sold_at");
  const phoneIndex = find("telefono","phone","customer_phone","celular");
  const methodIndex = find("metodo","payment_method","forma_de_pago","forma pago");
  if (amountIndex < 0) redirect(captureReturn(formData, "error", "El CSV necesita una columna Monto o Total."));

  const { data: knownCustomers } = await supabase.from("customers").select("id,phone").eq("business_id", membership.business_id).limit(5000);
  const byPhone = new Map<string,string>();
  for (const customer of knownCustomers ?? []) {
    for (const key of normalizedPhoneKeys(customer.phone)) byPhone.set(key, customer.id);
  }

  const rows = [];
  const maxRows = Math.min(lines.length - 1, 500);
  for (let index = 1; index <= maxRows; index += 1) {
    const cells = parseCsvLine(lines[index]);
    const amountCents = normalizeSaleAmount(cells[amountIndex] ?? "");
    if (!amountCents) continue;
    const rawDate = dateIndex >= 0 ? String(cells[dateIndex] ?? "").trim() : "";
    const soldAt = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? `${rawDate}T12:00:00Z` : new Date().toISOString();
    const rawPhone = phoneIndex >= 0 ? String(cells[phoneIndex] ?? "") : "";
    const customerId = normalizedPhoneKeys(rawPhone).map((key) => byPhone.get(key)).find(Boolean) ?? null;
    const rawMethod = methodIndex >= 0 ? String(cells[methodIndex] ?? "").toLowerCase().trim() : "";
    const paymentMethod = /efectivo|cash/.test(rawMethod) ? "cash" : /transfer/.test(rawMethod) ? "transfer" : /tarjeta|card/.test(rawMethod) ? "card" : "other";
    rows.push({
      business_id: membership.business_id,
      customer_id: customerId,
      amount_cents: amountCents,
      payment_method: paymentMethod,
      transactions_count: 1,
      sold_at: soldAt,
      source: "imported",
      source_reference: importReference,
      source_line: index,
      created_by: user.id,
    });
  }
  if (!rows.length) redirect(captureReturn(formData, "error", "No encontramos ventas válidas en el CSV."));
  const { error } = await supabase.from("business_sales").insert(rows);
  if (error?.code === "23505") redirect(captureReturn(formData, "error", "Ese mismo archivo ya fue importado. No duplicamos las ventas."));
  if (error) redirect(captureReturn(formData, "error", "No pudimos importar las ventas."));
  revalidatePath("/dashboard/points");
  revalidatePath("/dashboard/intelligence");
  redirect(captureReturn(formData, "saved", `import-${rows.length}`));
}

export async function updatePointsProgram(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };
  const membership = await getActiveBusinessMembership(user.id);
  if (!membership || !["owner", "manager"].includes(membership.role)) return { ok: false, error: "No tienes permiso para editar este programa." };

  const { error } = await supabase.rpc("update_points_program_for", {
    p_business_id: membership.business_id,
    p_name: String(formData.get("name") ?? "").trim(),
    p_reward_threshold: Number(formData.get("threshold")),
    p_reward_description: String(formData.get("reward") ?? "").trim(),
    p_cooldown_minutes: Number(formData.get("cooldown")),
    p_daily_cap: Number(formData.get("dailyCap")),
    p_review_url: String(formData.get("reviewUrl") ?? "").trim(),
    p_review_request_visit: Number(formData.get("reviewVisit") ?? 2),
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
