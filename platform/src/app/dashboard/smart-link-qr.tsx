"use client";

import { QRCodeSVG } from "qrcode.react";

interface SmartLinkQrProps {
  id: string;
  name: string;
  url: string;
  clicks: number;
}

export function SmartLinkQr({ id, name, url, clicks }: SmartLinkQrProps) {
  const qrId = `smart-link-${id}`;

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
  }

  return <article className="smartLinkRow">
    <div className="smartLinkInfo">
      <strong>{name}</strong>
      <span>{clicks} aperturas</span>
      <a href={url} target="_blank" rel="noreferrer">{url}</a>
      <div className="smartLinkActions">
        <button className="visitButton" type="button" onClick={copyUrl}>Copiar enlace NFC</button>
        <button className="visitButton" type="button" onClick={downloadQr}>Descargar QR</button>
      </div>
    </div>
    <div className="miniQr">
      <QRCodeSVG id={qrId} value={url} size={132} level="H" marginSize={2} bgColor="#ffffff" fgColor="#07100e" title={`QR de ${name}`} />
    </div>
  </article>;
}
