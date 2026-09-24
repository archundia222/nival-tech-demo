export const LEGAL_VERSION = "2026-09-24";
export const SUPPORT_EMAIL = "rodrigoarchundia379@gmail.com";
export const TRADE_NAME = "Nival Tech";

export function legalBusinessInfo() {
  return {
    tradeName: TRADE_NAME,
    legalName: process.env.NEXT_PUBLIC_NIVAL_LEGAL_NAME?.trim() || TRADE_NAME,
    rfc: process.env.NEXT_PUBLIC_NIVAL_RFC?.trim() || null,
    address: process.env.NEXT_PUBLIC_NIVAL_LEGAL_ADDRESS?.trim() || null,
    phone: process.env.NEXT_PUBLIC_NIVAL_PHONE?.trim() || null,
    supportEmail: SUPPORT_EMAIL,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://nival-tech-platform.vercel.app",
  };
}

export function legalBusinessInfoComplete() {
  const info = legalBusinessInfo();
  return Boolean(info.legalName && info.rfc && info.address && info.phone);
}
