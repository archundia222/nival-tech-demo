import { NextRequest, NextResponse } from "next/server";
import { buildDiagnostic } from "@/lib/local-growth/diagnostic";
import type { PublicBusinessSnapshot } from "@/lib/local-growth/types";

const PLACES_BASE = "https://places.googleapis.com/v1";

async function placeDetails(placeId: string, apiKey: string): Promise<PublicBusinessSnapshot> {
  const fields = [
    "id",
    "displayName",
    "formattedAddress",
    "rating",
    "userRatingCount",
    "websiteUri",
    "nationalPhoneNumber",
    "types",
  ].join(",");

  const response = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fields,
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("No se pudo consultar Google Places.");
  const p = await response.json();

  return {
    placeId: p.id,
    name: p.displayName?.text ?? "Negocio",
    address: p.formattedAddress ?? "",
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    website: p.websiteUri ?? null,
    phone: p.nationalPhoneNumber ?? null,
    categories: p.types ?? [],
  };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY no está configurada." },
      { status: 503 },
    );
  }

  const body = await request.json();
  if (!body?.placeId || typeof body.placeId !== "string") {
    return NextResponse.json({ error: "placeId es obligatorio." }, { status: 400 });
  }

  try {
    const business = await placeDetails(body.placeId, apiKey);
    const competitors: PublicBusinessSnapshot[] = Array.isArray(body.competitorPlaceIds)
      ? await Promise.all(
          body.competitorPlaceIds.slice(0, 5).map((id: string) => placeDetails(id, apiKey)),
        )
      : [];

    return NextResponse.json(buildDiagnostic(business, competitors));
  } catch {
    return NextResponse.json(
      { error: "No fue posible generar el diagnóstico." },
      { status: 502 },
    );
  }
}
