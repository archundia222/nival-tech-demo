"use client";

import { useMemo, useState } from "react";
import { buildDiagnostic } from "@/lib/local-growth/diagnostic";
import type {
  DiagnosticProspect,
  LocalDiagnostic,
  ProspectStatus,
  PublicBusinessSnapshot,
} from "@/lib/local-growth/types";

const STORAGE_KEY = "nival-local-growth-prospects-v1";
const statuses: ProspectStatus[] = ["nuevo", "contactado", "diagnostico", "seguimiento", "cliente", "descartado"];

function readProspects(): DiagnosticProspect[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function DiagnosticPage() {
  const [placeId, setPlaceId] = useState("");
  const [result, setResult] = useState<LocalDiagnostic | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [rating, setRating] = useState("");
  const [reviewCount, setReviewCount] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [competitorReviews, setCompetitorReviews] = useState("");
  const [prospects, setProspects] = useState<DiagnosticProspect[]>(readProspects);

  const canRunManual = useMemo(() => businessName.trim().length > 1, [businessName]);

  function persist(next: DiagnosticProspect[]) {
    setProspects(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function buildManualDiagnostic() {
    const business: PublicBusinessSnapshot = {
      placeId: "manual",
      name: businessName.trim(),
      address: address.trim(),
      rating: rating ? Number(rating) : null,
      reviewCount: reviewCount ? Number(reviewCount) : null,
      website: website.trim() || null,
      phone: phone.trim() || null,
      categories: [],
    };
    const competitors: PublicBusinessSnapshot[] = competitorReviews
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value >= 0)
      .slice(0, 5)
      .map((count, index) => ({
        placeId: `manual-competitor-${index + 1}`,
        name: `Comparable ${index + 1}`,
        address: "",
        rating: null,
        reviewCount: count,
        website: null,
        phone: null,
        categories: [],
      }));
    setError("");
    setResult(buildDiagnostic(business, competitors));
  }

  async function runDiagnostic() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/local-diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error ?? "No se pudo generar el diagnóstico.");
      else setResult(data);
    } catch {
      setError("No se pudo conectar con el servicio de diagnóstico.");
    } finally {
      setLoading(false);
    }
  }

  function saveProspect() {
    if (!result) return;
    const prospect: DiagnosticProspect = {
      id: crypto.randomUUID(),
      businessName: result.business.name,
      address: result.business.address,
      phone: result.business.phone ?? phone.trim(),
      website: result.business.website ?? website.trim(),
      notes: notes.trim(),
      status: "diagnostico",
      createdAt: new Date().toISOString(),
    };
    persist([prospect, ...prospects]);
    setNotes("");
  }

  function updateStatus(id: string, status: ProspectStatus) {
    persist(prospects.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "48px 20px", fontFamily: "Arial, sans-serif" }}>
      <p style={{ fontWeight: 700 }}>HERRAMIENTA INTERNA</p>
      <h1>Diagnóstico local V1</h1>
      <p>Genera un diagnóstico verificable y guarda el prospecto para seguimiento comercial.</p>

      <div style={{ display: "flex", gap: 8, margin: "24px 0" }}>
        <button onClick={() => setManualMode(false)} disabled={!manualMode}>Google Places</button>
        <button onClick={() => setManualMode(true)} disabled={manualMode}>Captura manual</button>
      </div>

      {manualMode ? (
        <section style={{ display: "grid", gap: 10, marginBottom: 24 }}>
          <strong>Captura manual — funciona sin Google Places</strong>
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Nombre del negocio *" style={{ padding: 12 }} />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección" style={{ padding: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <input value={rating} onChange={(e) => setRating(e.target.value)} placeholder="Calificación (ej. 4.6)" inputMode="decimal" style={{ flex: 1, padding: 12 }} />
            <input value={reviewCount} onChange={(e) => setReviewCount(e.target.value)} placeholder="Número de reseñas" inputMode="numeric" style={{ flex: 1, padding: 12 }} />
          </div>
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Sitio web" style={{ padding: 12 }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" style={{ padding: 12 }} />
          <input value={competitorReviews} onChange={(e) => setCompetitorReviews(e.target.value)} placeholder="Reseñas de comparables, separadas por coma (ej. 180, 240, 95)" style={{ padding: 12 }} />
          <small>Opcional: captura hasta 5 negocios comparables para detectar una brecha real de volumen de reseñas.</small>
          <button disabled={!canRunManual} onClick={buildManualDiagnostic} style={{ padding: 12 }}>Generar diagnóstico</button>
        </section>
      ) : (
        <section>
          <p>Introduce un Google Place ID. Este modo quedará listo al conectar la API.</p>
          <div style={{ display: "flex", gap: 8, margin: "24px 0" }}>
            <input value={placeId} onChange={(e) => setPlaceId(e.target.value)} placeholder="Google Place ID" style={{ flex: 1, padding: 12 }} />
            <button disabled={!placeId || loading} onClick={runDiagnostic} style={{ padding: "12px 18px" }}>
              {loading ? "Analizando…" : "Analizar"}
            </button>
          </div>
        </section>
      )}

      {error && <p>{error}</p>}
      {result && (
        <section>
          <h2>{result.business.name}</h2>
          <p>{result.business.address}</p>
          <p><strong>{result.business.rating ?? "—"}★</strong> · {result.business.reviewCount ?? "—"} reseñas</p>
          <h3>Fortalezas</h3>
          {result.strengths.length ? <ul>{result.strengths.map((x) => <li key={x}>{x}</li>)}</ul> : <p>Sin fortalezas concluyentes con los datos disponibles.</p>}
          <h3>Oportunidades</h3>
          {result.opportunities.length ? result.opportunities.map((o) => (
            <article key={o.id} style={{ borderTop: "1px solid #ddd", padding: "16px 0" }}>
              <strong>{o.title} · prioridad {o.priority}</strong>
              <p>{o.evidence}</p>
              <p>{o.recommendation}</p>
            </article>
          )) : <p>No encontramos evidencia suficiente para recomendar una mensualidad.</p>}
          <p><strong>Conclusión:</strong> {result.verdict.replaceAll("_", " ")}</p>
          <small>{result.disclaimer}</small>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas comerciales" style={{ width: "100%", minHeight: 80, marginTop: 16, padding: 12 }} />
          <button onClick={saveProspect} style={{ marginTop: 8, padding: 12 }}>Guardar prospecto</button>
        </section>
      )}

      <section style={{ marginTop: 48 }}>
        <h2>Prospectos</h2>
        {!prospects.length ? <p>Aún no hay prospectos guardados.</p> : prospects.map((p) => (
          <article key={p.id} style={{ borderTop: "1px solid #ddd", padding: "16px 0" }}>
            <strong>{p.businessName}</strong>
            <p>{p.address || "Sin dirección"} · {p.phone || "Sin teléfono"}</p>
            <select value={p.status} onChange={(e) => updateStatus(p.id, e.target.value as ProspectStatus)}>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {p.notes && <p>{p.notes}</p>}
          </article>
        ))}
      </section>
    </main>
  );
}
