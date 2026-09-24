"use client";

import { useState } from "react";

const demoFields = [
  { label: "Titular", value: "Café Nival Demo" },
  { label: "Banco", value: "Banco Ejemplo" },
  { label: "CLABE", value: "000 000 000000000 000" },
  { label: "Concepto", value: "Pago de consumo" },
];

export function PayDemo() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value.replaceAll(" ", ""));
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="payDemoFrame">
      <header className="payDemoBrand">
        <div className="demoAvatar large">CN</div>
        <div><strong>Café Nival</strong><span>Página de demostración</span></div>
      </header>
      <div className="payDemoIntro">
        <p className="landingEyebrow">DATOS PARA TRANSFERENCIA</p>
        <h3>Copia los datos para pagar.</h3>
        <p>Verifica el nombre del titular antes de confirmar tu transferencia.</p>
      </div>
      <div className="payDemoFields">
        {demoFields.map((field) => (
          <button key={field.label} type="button" onClick={() => copy(field.label, field.value)}>
            <span>{field.label}</span>
            <strong>{field.value}</strong>
            <small>{copied === field.label ? "Copiado ✓" : "Toca para copiar"}</small>
          </button>
        ))}
      </div>
      <p className="payDemoSecurity">Nival Tech nunca solicitará NIP, CVV, contraseña ni códigos de seguridad.</p>
    </div>
  );
}
