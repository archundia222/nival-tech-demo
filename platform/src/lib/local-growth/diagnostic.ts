import type { LocalDiagnostic, PublicBusinessSnapshot } from "./types";

export function buildDiagnostic(
  business: PublicBusinessSnapshot,
  competitors: PublicBusinessSnapshot[],
): LocalDiagnostic {
  const strengths: string[] = [];
  const opportunities: LocalDiagnostic["opportunities"] = [];

  if (business.rating && business.rating >= 4.5) {
    strengths.push(`Buena reputación pública: ${business.rating.toFixed(1)}★.`);
  }

  const comparable = competitors.filter((c) => c.reviewCount !== null);
  const avgReviews = comparable.length
    ? comparable.reduce((sum, c) => sum + (c.reviewCount ?? 0), 0) / comparable.length
    : null;

  if (
    business.reviewCount !== null &&
    avgReviews !== null &&
    business.reviewCount < avgReviews * 0.6
  ) {
    opportunities.push({
      id: "review-volume",
      title: "Menor volumen de reseñas que negocios comparables",
      evidence: `El negocio tiene ${business.reviewCount} reseñas frente a un promedio cercano de ${Math.round(avgReviews)} en la muestra comparada.`,
      recommendation: "Facilitar la solicitud constante de reseñas reales a clientes satisfechos, sin incentivos ni reseñas falsas.",
      priority: "alta",
    });
  }

  if (!business.website) {
    opportunities.push({
      id: "website",
      title: "No detectamos sitio web en los datos públicos",
      evidence: "La ficha pública consultada no devuelve un sitio web.",
      recommendation: "Confirmar si existe un sitio oficial y, si corresponde, vincularlo correctamente al Perfil de Empresa.",
      priority: "media",
    });
  }

  if (!business.phone) {
    opportunities.push({
      id: "phone",
      title: "No detectamos teléfono público",
      evidence: "La ficha pública consultada no devuelve un teléfono.",
      recommendation: "Verificar que los datos de contacto estén completos y actualizados.",
      priority: "media",
    });
  }

  const verdict =
    opportunities.some((o) => o.priority === "alta")
      ? "oportunidad_clara"
      : opportunities.length
        ? "oportunidad_limitada"
        : "sin_evidencia_suficiente";

  return {
    business,
    competitors,
    strengths,
    opportunities,
    verdict,
    disclaimer:
      "Este diagnóstico identifica oportunidades observables; no garantiza una posición específica en Google.",
  };
}
