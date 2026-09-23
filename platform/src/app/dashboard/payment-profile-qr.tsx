"use client";

import { useId, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface PaymentProfileQrProps {
  businessName: string;
  url: string;
  views: number;
}

export function PaymentProfileQr({ businessName, url, views }: PaymentProfileQrProps) {
  const [notice, setNotice] = useState("");
  const qrId = `payment-profile-${useId().replace(/:/g, "")}`;

  function downloadQr() {
    const svg = document.getElementById(qrId);
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-nival-pay.svg`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }


  function downloadSticker() {
    const svg = document.getElementById(qrId);
    if (!svg) return;
    const qrMarkup = new XMLSerializer().serializeToString(svg)
      .replace('<svg', '<svg x="52" y="66" width="156" height="156"');
    const safeName = businessName.replace(/[<>&"]/g, "").slice(0, 42);
    const sticker = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="320" viewBox="0 0 260 320">
      <rect width="260" height="320" rx="28" fill="#ffffff"/>
      <rect x="12" y="12" width="236" height="296" rx="22" fill="none" stroke="#171717" stroke-width="2"/>
      <text x="130" y="38" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="800" fill="#171717">NIVAL PAY</text>
      <text x="130" y="56" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#6f6f73">${safeName}</text>
      ${qrMarkup}
      <text x="130" y="248" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="800" fill="#171717">ESCANEA PARA PAGAR</text>
      <text x="130" y="269" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#6f6f73">o acerca tu celular a la tarjeta NFC</text>
      <text x="130" y="294" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="700" fill="#9b7b3e">nival tech</text>
    </svg>`;
    const blob = new Blob([sticker], { type: "image/svg+xml;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-sticker-nival-pay.svg`;
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
        await navigator.share({ title: "Nival Pay", text: "Abre mi página de cobro", url });
        setNotice("Página compartida.");
        return;
      }
      await copyUrl();
    } catch {
      setNotice("");
    }
  }

  return <div className="paymentQrPanel paymentQrPanelRefined">
    <div className="paymentQrCopy">
      <span className="paymentQrEyebrow">PÁGINA DE COBRO</span>
      <strong>Un mismo destino para QR, NFC y enlace</strong>
      <p>Descarga el QR solo o un diseño listo para imprimir y pegar en tu tarjeta física.</p>
      <div className="paymentQrMeta"><span>{views} aperturas</span><a href={url} target="_blank" rel="noreferrer">Abrir página ↗</a></div>
      <code className="paymentQrUrl">{url}</code>
      <p className="paymentQrNotice" role="status">{notice}</p>
      <div className="smartLinkActions paymentShareActions">
        <button className="nvPrimaryButton" type="button" onClick={copyUrl}>Copiar enlace</button>
        <button className="nvSecondaryButton" type="button" onClick={shareUrl}>Compartir</button>
        <button className="nvSecondaryButton" type="button" onClick={downloadQr}>Descargar QR</button>
        <button className="nvSecondaryButton" type="button" onClick={downloadSticker}>Descargar sticker</button>
      </div>
    </div>
    <div className="miniQr refinedQr"><QRCodeSVG id={qrId} value={url} size={156} level="H" marginSize={2} bgColor="#fff" fgColor="#07100e" title="QR de Nival Pay" /></div>
  </div>;
}
