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
      <strong>Lista para enviar o mostrar</strong>
      <p>Un solo enlace para WhatsApp, QR y tu tarjeta NFC.</p>
      <div className="paymentQrMeta"><span>{views} aperturas</span><a href={url} target="_blank" rel="noreferrer">Abrir página ↗</a></div>
      <code className="paymentQrUrl">{url}</code>
      <p className="paymentQrNotice" role="status">{notice}</p>
      <div className="smartLinkActions paymentShareActions">
        <button className="visitButton primaryShareAction" type="button" onClick={copyUrl}>Copiar enlace</button>
        <button className="visitButton" type="button" onClick={shareUrl}>Compartir</button>
        <button className="visitButton" type="button" onClick={downloadQr}>Descargar QR</button>
      </div>
    </div>
    <div className="miniQr refinedQr"><QRCodeSVG id={qrId} value={url} size={156} level="H" marginSize={2} bgColor="#fff" fgColor="#07100e" title="QR de Nival Pay" /></div>
  </div>;
}
