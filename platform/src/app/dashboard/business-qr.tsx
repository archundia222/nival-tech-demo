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
        <code className="qrUrl">{url}</code>
        <p className="qrNotice" role="status">{notice}</p>
        <div className="businessQrActions">
          <a className="primaryButton" href={url} target="_blank" rel="noreferrer">Abrir perfil</a>
          <button className="secondaryButton" type="button" onClick={copyUrl}>Copiar enlace</button>
          <button className="secondaryButton" type="button" onClick={shareUrl}>Compartir</button>
          <button className="secondaryButton" type="button" onClick={downloadQr}>Descargar QR</button>
        </div>
      </div>
      <div className="qrCanvas">
        <QRCodeSVG
          id={qrId}
          value={url}
          size={190}
          level="H"
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#07100e"
          title={`${title} de ${businessName}`}
        />
      </div>
    </section>
  );
}
