export type BusinessRole = "owner" | "manager" | "staff";
export type WalletProvider = "apple" | "google";
export type CustomerStatus =
  | "new"
  | "active"
  | "frequent"
  | "at_risk"
  | "inactive"
  | "vip";

export interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  subscriptionStatus: "trial" | "active" | "past_due" | "cancelled";
}

export interface CustomerSummary {
  id: string;
  businessId: string;
  name: string;
  visits: number;
  points: number;
  status: CustomerStatus;
  lastVisitAt: string | null;
}

export const platformModules = [
  { name: "Lealtad", detail: "Clientes, visitas, puntos y recompensas" },
  { name: "Wallet", detail: "Apple Wallet y Google Wallet" },
  { name: "Intelligence", detail: "Segmentos y recomendaciones accionables" },
  { name: "WhatsApp", detail: "Consultas privadas y alertas proactivas" },
  { name: "Suscripción", detail: "Alta, cobro recurrente y estado del servicio" },
] as const;
