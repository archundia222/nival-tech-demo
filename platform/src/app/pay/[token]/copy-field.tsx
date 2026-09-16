"use client";

import { useState } from "react";

interface CopyFieldProps {
  label: string;
  value: string;
  prominent?: boolean;
}

export function CopyField({ label, value, prominent = false }: CopyFieldProps) {
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try { await navigator.clipboard.writeText(value); setError(false); }
    catch { setError(true); return; }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return <button className={`paymentField${prominent ? " paymentFieldProminent" : ""}`} type="button" onClick={copy}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{error ? "Selecciona el dato para copiarlo manualmente" : copied ? "Copiado" : "Toca para copiar"}</small>
  </button>;
}
