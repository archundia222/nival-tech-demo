'use client';

import { useId, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function WifiQr({ ssid, password, security, url, guest = false }: { ssid: string; password: string; security: string; url: string; guest?: boolean }) {
  const id = `wifi-${useId().replace(/:/g, '')}`;
  const [notice, setNotice] = useState('');
  const escape = (value: string) => value.replace(/([\\;,:"'])/g, '\\$1');
  const wifiValue = `WIFI:T:${security === 'nopass' ? 'nopass' : 'WPA'};S:${escape(ssid)};P:${escape(password)};;`;
  function download() {
    const element = document.getElementById(id);
    if (!element) return;
    const blob = new Blob([new XMLSerializer().serializeToString(element)], { type: 'image/svg+xml;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'nival-wifi.svg';
    link.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setNotice('Enlace copiado.'); }
    catch { setNotice('No pudimos copiar el enlace.'); }
  }
  return <div className="wifiSharePanel">
    <div className="qrCanvas"><QRCodeSVG id={id} value={guest ? wifiValue : url} size={220} level="H" marginSize={2} title={`Conectar a ${ssid}`} /></div>
    <strong>{guest ? `Escanea para conectarte a ${ssid}` : 'QR de acceso a tu Nival WiFi'}</strong>
    <p>{guest ? 'Este QR contiene los datos de la red; compártelo solo con tus invitados.' : 'El QR abre tu página de acceso. El teléfono puede pedir confirmación antes de conectarse.'}</p>
    <div className="businessQrActions"><button className="businessQrPrimary" type="button" onClick={download}>Descargar QR WiFi</button><button className="businessQrSecondary" type="button" onClick={copy}>Copiar página para invitados</button><a className="businessQrSecondary" href={url} target="_blank" rel="noreferrer">Abrir página ↗</a></div>
    <p role="status">{notice}</p>
  </div>;
}
