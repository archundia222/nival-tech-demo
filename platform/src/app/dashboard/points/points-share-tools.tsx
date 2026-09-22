'use client';

import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function PointsShareTools({ url }: { url: string }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  function downloadQr() {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href; a.download = 'nival-puntos-qr.svg'; a.click();
    URL.revokeObjectURL(href);
  }
  return <section className="pointsShareCard">
    <div ref={qrRef} className="pointsQrBox"><QRCodeSVG value={url} size={190} level="H" includeMargin /></div>
    <div className="pointsShareCopy"><span>REGISTRO DE CLIENTES</span><h2>Comparte tu programa</h2><p>Este QR abre directamente el registro de Nival Puntos. Puedes imprimirlo, ponerlo en mostrador o programarlo en NFC.</p>
      <label>Enlace público</label><div className="pointsShareLink"><input value={url} readOnly /><button type="button" onClick={copyLink}>{copied ? 'Copiado' : 'Copiar'}</button></div>
      <div className="pointsShareActions"><button type="button" className="nvPrimaryButton" onClick={downloadQr}>Descargar QR</button><a className="nvSecondaryButton" href={url} target="_blank" rel="noreferrer">Abrir enlace</a></div>
    </div>
  </section>;
}
