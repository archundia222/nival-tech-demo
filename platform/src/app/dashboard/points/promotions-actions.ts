"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveBusinessMembership } from "@/lib/active-business";
import { sendGoogleWalletNotification } from "@/lib/google-wallet";

type WalletRecipient = {
  name: string;
  marketing_consent_at: string | null;
  loyalty_accounts: { public_token: string }[] | { public_token: string } | null;
};

export async function sendPointsWalletPromotion(input: { title: string; body: string }) {
  const title = input.title.trim().slice(0, 60);
  const body = input.body.trim().slice(0, 280);
  if (!title || !body) return { ok: false, sent: 0, failed: 0, error: "Escribe un título y un mensaje." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, sent: 0, failed: 0, error: "Tu sesión expiró." };

  const membership = await getActiveBusinessMembership(user.id);
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return { ok: false, sent: 0, failed: 0, error: "No tienes permiso para enviar promociones." };
  }

  const { data: entitlement } = await supabase
    .from("business_product_entitlements")
    .select("status,current_period_end")
    .eq("business_id", membership.business_id)
    .eq("product_code", "nival_points")
    .maybeSingle();

  const trialActive = entitlement?.status === "free"
    && Boolean(entitlement.current_period_end)
    && new Date(entitlement.current_period_end as string).getTime() > Date.now();
  if (entitlement?.status !== "active" && !trialActive) {
    return { ok: false, sent: 0, failed: 0, error: "Las promociones por Wallet son una función de Nival Puntos Pro." };
  }

  const { data, error } = await supabase
    .from("customers")
    .select("name,marketing_consent_at,loyalty_accounts!inner(public_token)")
    .eq("business_id", membership.business_id)
    .not("marketing_consent_at", "is", null)
    .limit(100);

  if (error) {
    console.error("[points-promotions] recipients failed", { code: error.code });
    return { ok: false, sent: 0, failed: 0, error: "No pudimos cargar los clientes autorizados." };
  }

  const recipients = (data ?? []) as WalletRecipient[];
  if (!["GOOGLE_WALLET_ISSUER_ID", "GOOGLE_WALLET_CLASS_SUFFIX", "GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL", "GOOGLE_WALLET_PRIVATE_KEY"].every((key) => Boolean(process.env[key]?.trim()))) {
    return { ok: false, sent: 0, failed: 0, error: "Google Wallet no está disponible en este momento. Inténtalo más tarde." };
  }
  if (!recipients.length) {
    return { ok: false, sent: 0, failed: 0, error: "Todavía no hay clientes con consentimiento para promociones." };
  }

  let sent = 0;
  let failed = 0;

  // Keep each request bounded so a larger audience does not time out the action.
  for (let index = 0; index < recipients.length; index += 5) {
    const results = await Promise.allSettled(recipients.slice(index, index + 5).map(async (recipient) => {
      const account = Array.isArray(recipient.loyalty_accounts)
        ? recipient.loyalty_accounts[0]
        : recipient.loyalty_accounts;
      if (!account?.public_token) throw new Error("Missing loyalty account token");
      const personalizedBody = body.replaceAll("{{nombre}}", recipient.name.split(" ")[0] || recipient.name);
      await sendGoogleWalletNotification(account.public_token, title, personalizedBody);
    }));
    for (const result of results) {
      if (result.status === "fulfilled") sent += 1;
      else {
        failed += 1;
        console.error("[points-promotions] wallet delivery failed", {
          message: result.reason instanceof Error ? result.reason.message.slice(0, 220) : "unknown",
        });
      }
    }
  }

  if (!sent) {
    return {
      ok: false,
      sent,
      failed,
      error: "No encontramos tarjetas de Google Wallet guardadas o Wallet todavía no está configurado.",
    };
  }

  return { ok: true, sent, failed, error: null };
}
