"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { issueCustomerScanToken } from "@/app/points/actions";

export function RotatingPointsQr({ accountToken }: { accountToken: string }) {
  const [raw, setRaw] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0);



  const refresh = useCallback(async () => {
    const result = await issueCustomerScanToken(accountToken);
    if (!result.ok || !result.raw || !result.expiresAt) {
      setError(result.error ?? "No pudimos generar el QR.");
      return;
    }
    setRaw(result.raw);
    setShortCode(result.shortCode ?? "");
    setExpiresAt(result.expiresAt);
    setError("");
  }, [accountToken]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) void refresh();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, refresh]);

  return <section className="pointsCustomerQr" aria-live="polite">
    <div className="pointsQrHeading"><div><span>QR PARA SUMAR PUNTOS</span><strong>Muéstralo en caja</strong></div><b>{remaining}s</b></div>
    {error ? <div className="pointsErrorState"><strong>QR no disponible</strong><p>{error}</p><button className="nvSecondaryButton" type="button" onClick={() => void refresh()}>Intentar de nuevo</button></div>
      : raw ? <>
        <div className="pointsQrCanvas"><QRCodeSVG value={`nivalpoints:${raw}`} size={220} level="M" /></div>
        <div className="pointsManualCode"><span>CÓDIGO TEMPORAL</span><strong className="pointsManualCodeValue">{shortCode}</strong></div><small className="pointsManualHint">Díctalo o muéstralo en caja si no pueden escanear el QR.</small>
      </>
      : <div className="pointsEmptyState">Generando QR seguro…</div>}
    <p>El QR y el código cambian automáticamente y solo pueden usarse una vez.</p>
  </section>;
}
