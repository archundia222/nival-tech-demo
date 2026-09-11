"use client";

import { useState } from "react";

interface CopyFieldProps {
  label: string;
  value: string;
}

export function CopyField({ label, value }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return <button className="paymentField" type="button" onClick={copy}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{copied ? "Copiado" : "Toca para copiar"}</small>
  </button>;
}
