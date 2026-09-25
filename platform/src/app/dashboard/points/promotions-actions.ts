"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveBusinessMembership } from "@/lib/active-business";
import { sendGoogleWalletNotification } from "@/lib/google-wallet";
import { appleWalletReady, notifyAppleWalletPass } from '@/lib/apple-wallet';
import { createPointsAdminClient } from '@/lib/supabase/points-admin';

type WalletRecipient = {
  name: string;
  marketing_consent_at: string | null;
  loyalty_accounts: { public_token: string }[] | { public_token: string } | null;
};

export async function sendPointsWalletPromotion(input: { title: string; body: string; recipient: string }) {
  const title = input.title.trim().slice(0, 60);
  const body = input.body.trim().slice(0, 280);
  if (!title || !body) return { ok: false, sent: 0, failed: 0, error: "Escribe un título y un mensaje." };
  if (input.recipient !== 'all' && !/^[a-f0-9-]{36}$/i.test(input.recipient)) return { ok: false, sent: 0, failed: 0, error: 'Selecciona a quién enviar el aviso.' };

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

  let recipientsQuery = supabase
    .from("customers")
    .select("name,marketing_consent_at,loyalty_accounts!inner(public_token)")
    .eq("business_id", membership.business_id)
    .not("marketing_consent_at", "is", null);
  if (input.recipient !== 'all') recipientsQuery = recipientsQuery.eq('id', input.recipient);
  const { data, error } = await recipientsQuery.limit(input.recipient === 'all' ? 100 : 1);

  if (error) {
    console.error("[points-promotions] recipients failed", { code: error.code });
    return { ok: false, sent: 0, failed: 0, error: "No pudimos cargar los clientes autorizados." };
  }

  const recipients = (data ?? []) as WalletRecipient[];
  const googleReady = ["GOOGLE_WALLET_ISSUER_ID", "GOOGLE_WALLET_CLASS_SUFFIX", "GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL", "GOOGLE_WALLET_PRIVATE_KEY"].every((key) => Boolean(process.env[key]?.trim()));
  if (!googleReady && !appleWalletReady()) return { ok: false, sent: 0, failed: 0, error: 'Las Wallet todavía no están configuradas.' };
  if (!recipients.length) {
    return { ok: false, sent: 0, failed: 0, error: "Todavía no hay clientes con consentimiento para promociones." };
  }

  let sent = 0;
  let failed = 0;
  let appleAccepted = 0;
  let appleFailed = 0;
  const appleReady = appleWalletReady();
  const admin = createPointsAdminClient();

  // Keep each request bounded so a larger audience does not time out the action.
  for (let index = 0; index < recipients.length; index += 5) {
    const results = await Promise.allSettled(recipients.slice(index, index + 5).map(async (recipient) => {
      const account = Array.isArray(recipient.loyalty_accounts)
        ? recipient.loyalty_accounts[0]
        : recipient.loyalty_accounts;
      if (!account?.public_token) throw new Error("Missing loyalty account token");
      const personalizedBody = body.replaceAll("{{nombre}}", recipient.name.split(" ")[0] || recipient.name);
      const serial = account.public_token;
      const { error: saveError } = await admin.from('loyalty_wallet_messages').upsert({ pass_serial: serial, title, body: personalizedBody, updated_at: new Date().toISOString() }, { onConflict: 'pass_serial' });
      if (saveError) throw saveError;
      const google = googleReady && await sendGoogleWalletNotification(serial, title, personalizedBody).then(() => true, (error) => {
        console.error('[points-promotions] Google Wallet rejected message', error instanceof Error ? error.message.slice(0, 160) : 'unknown');
        return false;
      });
      let apple = { accepted: 0, failed: 0 };
      if (appleReady) apple = await notifyAppleWalletPass(serial);
      return { google, apple };
    }));
    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.google) sent += 1;
        else if (googleReady) failed += 1;
        appleAccepted += result.value.apple.accepted;
        appleFailed += result.value.apple.failed;
      }
      else {
        failed += 1;
        console.error("[points-promotions] wallet delivery failed", {
          message: result.reason instanceof Error ? result.reason.message.slice(0, 220) : "unknown",
        });
      }
    }
  }

  if (!sent && !appleAccepted) {
    return {
      ok: false,
      sent,
      failed,
      error: "Ninguna Wallet aceptó el aviso. Revisa que las tarjetas estén guardadas y que no hayas alcanzado el límite de avisos.",
    };
  }

  return { ok: true, sent, failed, appleAccepted, appleFailed, error: null };
}
