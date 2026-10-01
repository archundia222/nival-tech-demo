export type DiagnosticOpportunity = {
  id: string;
  title: string;
  evidence: string;
  recommendation: string;
  priority: "alta" | "media" | "baja";
};

export type PublicBusinessSnapshot = {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number | null;
  website: string | null;
  phone: string | null;
  categories: string[];
};

export type LocalDiagnostic = {
  business: PublicBusinessSnapshot;
  competitors: PublicBusinessSnapshot[];
  strengths: string[];
  opportunities: DiagnosticOpportunity[];
  verdict: "oportunidad_clara" | "oportunidad_limitada" | "sin_evidencia_suficiente";
  disclaimer: string;
};

export type ProspectStatus = "nuevo" | "contactado" | "diagnostico" | "seguimiento" | "cliente" | "descartado";

export type DiagnosticProspect = {
  id: string;
  businessName: string;
  address: string;
  phone: string;
  website: string;
  notes: string;
  status: ProspectStatus;
  createdAt: string;
};
