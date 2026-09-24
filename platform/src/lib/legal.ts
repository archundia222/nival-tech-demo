import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const LEGAL_VERSION = "2026-09-24";
export const SUPPORT_EMAIL = "rodrigoarchundia379@gmail.com";
export const TRADE_NAME = "Nival Tech";

export type LegalBusinessInfo = {
  tradeName: string;
  legalName: string;
  rfc: string | null;
  address: string | null;
  phone: string | null;
  supportEmail: string;
  siteUrl: string;
  configured: boolean;
};

function environmentLegalInfo(): LegalBusinessInfo {
  const legalName = process.env.NEXT_PUBLIC_NIVAL_LEGAL_NAME?.trim() || null;
  const address = process.env.NEXT_PUBLIC_NIVAL_LEGAL_ADDRESS?.trim() || null;
  const phone = process.env.NEXT_PUBLIC_NIVAL_PHONE?.trim() || null;
  return {
    tradeName: TRADE_NAME,
    legalName: legalName || TRADE_NAME,
    rfc: process.env.NEXT_PUBLIC_NIVAL_RFC?.trim() || null,
    address,
    phone,
    supportEmail: SUPPORT_EMAIL,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://nival-tech-platform.vercel.app",
    configured: Boolean(legalName && address && SUPPORT_EMAIL),
  };
}

export async function legalBusinessInfo(): Promise<LegalBusinessInfo> {
  const fallback = environmentLegalInfo();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("site_legal_settings")
      .select("legal_name,trade_name,legal_address,phone,support_email,rfc")
      .eq("id", "default")
      .maybeSingle();

    if (!error && data) {
      const legalName = String(data.legal_name ?? "").trim();
      const address = String(data.legal_address ?? "").trim();
      const supportEmail = String(data.support_email ?? "").trim() || SUPPORT_EMAIL;
      return {
        tradeName: String(data.trade_name ?? "").trim() || TRADE_NAME,
        legalName: legalName || fallback.legalName,
        rfc: data.rfc ? String(data.rfc).trim() : fallback.rfc,
        address: address || fallback.address,
        phone: String(data.phone ?? "").trim() || fallback.phone,
        supportEmail,
        siteUrl: fallback.siteUrl,
        configured: Boolean(legalName && address && supportEmail),
      };
    }
  } catch (error) {
    console.error("[legal] Could not load server-side legal settings", error);
  }
  return fallback;
}

export async function privacyDisclosuresReady() {
  const info = await legalBusinessInfo();
  return Boolean(info.configured && info.legalName && info.address && info.supportEmail);
}

export async function commerceDisclosuresReady() {
  const info = await legalBusinessInfo();
  return Boolean(info.configured && info.legalName && info.address && info.phone && info.supportEmail);
}

export async function legalBusinessInfoComplete() {
  const info = await legalBusinessInfo();
  return Boolean(info.configured && info.phone && info.rfc);
}
