"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface BusinessQrProps {
  businessName: string;
  url: string;
  qrId?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  fileSuffix?: string;
}

function ActionIcon({ type }: { type: "copy" | "share" | "download" }) {
  if (type === "copy") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="10" height="10" rx="2"/><path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
  if (type === "share") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.2M8.7 13.3l6.6 4.2"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 20h14"/></svg>;
}

export function BusinessQr({
  businessName,
  url,
  qrId = "business-enrollment-qr",
  eyebrow = "QR DEL NEGOCIO",
  title = "Registro de clientes",
  description = "Imprime este QR o úsalo como destino de tus tarjetas NFC.",
  fileSuffix = "qr",
}: BusinessQrProps) {
  const [notice, setNotice] = useState("");

  function downloadQr() {
    const svg = document.getElementById(qrId);
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${fileSuffix}.svg`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Enlace copiado.");
    } catch {
      setNotice("No se pudo copiar automáticamente.");
    }
  }

  async function shareUrl() {
    try {
      if (navigator.share) {
        await navigator.share({ title: businessName, text: `Conoce ${businessName}`, url });
        setNotice("Perfil compartido.");
        return;
      }
      await copyUrl();
    } catch {
      setNotice("");
    }
  }

  return (
    <section className="businessQrCard businessQrRefined">
      <div className="businessQrCopy">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="businessQrUrlRow">
          <code className="qrUrl">{url}</code>
          <button className="businessQrIconButton" type="button" onClick={copyUrl} aria-label="Copiar enlace"><ActionIcon type="copy" /></button>
        </div>
        <div className="businessQrActions">
          <a className="businessQrPrimary" href={url} target="_blank" rel="noreferrer">Abrir perfil</a>
          <button className="businessQrSecondary" type="button" onClick={copyUrl}><ActionIcon type="copy" />Copiar enlace</button>
          <button className="businessQrSecondary" type="button" onClick={shareUrl}><ActionIcon type="share" />Compartir</button>
          <button className="businessQrSecondary" type="button" onClick={downloadQr}><ActionIcon type="download" />Descargar QR</button>
        </div>
      </div>
      <div className="qrCanvas">
        <QRCodeSVG
          id={qrId}
          value={url}
          size={220}
          level="H"
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#07100e"
          title={`${title} de ${businessName}`}
        />
      </div>
      <p className={`qrNotice ${notice ? "isVisible" : ""}`} role="status" aria-live="polite">{notice}</p>
    </section>
  );
}
