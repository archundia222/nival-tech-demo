"use client";

import { QRCodeSVG } from "qrcode.react";

interface PaymentProfileQrProps {
  businessName: string;
  url: string;
  views: number;
}

export function PaymentProfileQr({ businessName, url, views }: PaymentProfileQrProps) {
  function downloadQr() {
    const svg = document.getElementById("payment-profile-qr");
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-datos-bancarios.svg`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
  }

  return <div className="paymentQrPanel">
    <div>
      <strong>Enlace para tarjeta NFC</strong>
      <span>{views} aperturas</span>
      <a href={url} target="_blank" rel="noreferrer">{url}</a>
      <div className="smartLinkActions">
        <button className="visitButton" type="button" onClick={copyUrl}>Copiar enlace NFC</button>
        <button className="visitButton" type="button" onClick={downloadQr}>Descargar QR</button>
      </div>
    </div>
    <div className="miniQr"><QRCodeSVG id="payment-profile-qr" value={url} size={132} level="H" marginSize={2} bgColor="#fff" fgColor="#07100e" title="QR de datos bancarios" /></div>
  </div>;
}
