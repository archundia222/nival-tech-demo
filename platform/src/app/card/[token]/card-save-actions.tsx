"use client";

import { useState } from "react";

export function CardSaveActions() {
  const [copied, setCopied] = useState(false);

  async function saveOrShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Mi tarjeta de puntos", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // The user may cancel the native share sheet; no error state is needed.
    }
  }

  return <button type="button" className="pointsCardSaveButton" onClick={saveOrShare}>
    {copied ? "Enlace copiado" : "Guardar o compartir tarjeta →"}
  </button>;
}
