"use client";

import { useState } from "react";
import type { LocalDiagnostic } from "@/lib/local-growth/types";

export default function DiagnosticPage() {
  const [placeId, setPlaceId] = useState("");
  const [result, setResult] = useState<LocalDiagnostic | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function runDiagnostic() {
    setLoading(true);
    setError("");
    setResult(null);
    const response = await fetch("/api/local-diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "No se pudo generar el diagnóstico.");
    else setResult(data);
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 20px", fontFamily: "Arial, sans-serif" }}>
      <p style={{ fontWeight: 700 }}>HERRAMIENTA INTERNA</p>
      <h1>Diagnóstico local V1</h1>
      <p>Introduce un Google Place ID. La búsqueda por nombre se añadirá al conectar Places API.</p>
      <div style={{ display: "flex", gap: 8, margin: "24px 0" }}>
        <input
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          placeholder="Google Place ID"
          style={{ flex: 1, padding: 12 }}
        />
        <button disabled={!placeId || loading} onClick={runDiagnostic} style={{ padding: "12px 18px" }}>
          {loading ? "Analizando…" : "Analizar"}
        </button>
      </div>
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
        </section>
      )}
    </main>
  );
}
