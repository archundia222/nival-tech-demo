"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { updateSmartLink } from "./actions";

interface SmartLinkQrProps {
  id: string;
  name: string;
  kind: string;
  targetUrl: string;
  url: string;
  clicks: number;
  active: boolean;
  editable: boolean;
  returnTo?: "/dashboard?section=nival-card" | "/dashboard?section=perfil-digital";
}

const kindLabels: Record<string, string> = {
  google_review: "Reseña de Google",
  website: "Sitio web",
  custom: "Enlace personalizado",
};

export function SmartLinkQr({ id, name, kind, targetUrl, url, clicks, active, editable, returnTo = "/dashboard?section=nival-card" }: SmartLinkQrProps) {
  const qrId = `smart-link-${id}`;
  const [copied, setCopied] = useState(false);

  function downloadQr() {
    const svg = document.getElementById(qrId);
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.svg`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return <article className="smartLinkRow">
    <div className="smartLinkInfo">
      <div className="smartLinkHeading"><strong>{name}</strong><span className={active ? "linkStatus active" : "linkStatus"}>{active ? "Activo" : "Pausado"}</span></div>
      <span>{kindLabels[kind] ?? "Enlace"} · {clicks} aperturas</span>
      <a href={url} target="_blank" rel="noreferrer">{url}</a>
      <div className="smartLinkActions">
        <button className="visitButton" type="button" onClick={copyUrl}>{copied ? "Enlace copiado ✓" : "Copiar enlace NFC"}</button>
        <button className="visitButton" type="button" onClick={downloadQr}>Descargar QR</button>
      </div>
      {editable && <details className="smartLinkEditor">
        <summary>Editar destino</summary>
        <form action={updateSmartLink} className="compactForm">
          <input type="hidden" name="linkId" value={id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label>Nombre<input name="linkName" required minLength={2} maxLength={80} defaultValue={name} /></label>
          <label>Destino<input name="targetUrl" type="url" required defaultValue={targetUrl} /></label>
          <label className="checkLabel"><input name="active" type="checkbox" defaultChecked={active} /> Enlace activo</label>
          <button className="primaryButton" type="submit">Guardar cambios</button>
        </form>
      </details>}
    </div>
    <div className="miniQr">
      <QRCodeSVG id={qrId} value={url} size={132} level="H" marginSize={2} bgColor="#ffffff" fgColor="#07100e" title={`QR de ${name}`} />
    </div>
  </article>;
}
