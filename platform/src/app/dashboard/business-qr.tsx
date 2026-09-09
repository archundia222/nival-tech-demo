"use client";

import { QRCodeSVG } from "qrcode.react";

interface BusinessQrProps {
  businessName: string;
  url: string;
}

export function BusinessQr({ businessName, url }: BusinessQrProps) {
  function downloadQr() {
    const svg = document.getElementById("business-enrollment-qr");
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.svg`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <section className="businessQrCard">
      <div>
        <p className="eyebrow">QR DEL NEGOCIO</p>
        <h2>Registro de clientes</h2>
        <p>Imprime este QR o úsalo como destino de tus tarjetas NFC. Cada cliente llegará al formulario público de este negocio.</p>
        <a className="qrUrl" href={url} target="_blank" rel="noreferrer">{url}</a>
        <button className="primaryButton" type="button" onClick={downloadQr}>Descargar QR</button>
      </div>
      <div className="qrCanvas">
        <QRCodeSVG
          id="business-enrollment-qr"
          value={url}
          size={220}
          level="H"
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#07100e"
          title={`QR de registro de ${businessName}`}
        />
      </div>
    </section>
  );
}
