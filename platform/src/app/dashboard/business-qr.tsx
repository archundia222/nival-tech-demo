"use client";

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
  description = "Imprime este QR o úsalo como destino de tus tarjetas NFC. Cada cliente llegará al formulario público de este negocio.",
  fileSuffix = "qr",
}: BusinessQrProps) {
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

  return (
    <section className="businessQrCard">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
        <a className="qrUrl" href={url} target="_blank" rel="noreferrer">{url}</a>
        <button className="primaryButton" type="button" onClick={downloadQr}>Descargar QR</button>
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
    </section>
  );
}
