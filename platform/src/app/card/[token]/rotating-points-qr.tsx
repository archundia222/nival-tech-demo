"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { issueCustomerScanToken } from "@/app/points/actions";

export function RotatingPointsQr({ accountToken, purpose = "points", rewardId }: { accountToken: string; purpose?: "points" | "redeem"; rewardId?: string }) {
  const [raw, setRaw] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0);
 const [origin, setOrigin] = useState("https://nival-tech-platform.vercel.app");
  const refreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const result = await issueCustomerScanToken(accountToken, purpose === "points" ? "visit" : "redeem", rewardId);
      if (!result.ok || !result.raw || !result.expiresAt) {
        setError(result.error ?? "No pudimos generar el QR.");
        return;
      }
      setRaw(result.raw);
      setShortCode(result.shortCode ?? "");
      setExpiresAt(result.expiresAt);
      setRemaining(Math.max(0, Math.ceil((new Date(result.expiresAt).getTime() - Date.now()) / 1000)));
      setError("");
    } finally {
      refreshingRef.current = false;
    }
  }, [accountToken, purpose, rewardId]);

  useEffect(() => {
    setOrigin(window.location.origin);
    const firstRefresh = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(firstRefresh);
  }, [refresh]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) void refresh();
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, refresh]);

  return <section className="pointsCustomerQr" aria-live="polite">
    <div className="pointsQrHeading"><div><span>{purpose === "redeem" ? "CÓDIGO PARA CANJEAR" : "CÓDIGO PARA SUMAR PUNTOS"}</span><strong>{purpose === "redeem" ? "Canjea tu recompensa" : "Suma tus puntos"}</strong><small>{purpose === "redeem" ? "Muéstralo al personal para validar y confirmar tu canje." : "Muéstralo al personal después de tu compra o visita."}</small></div><b>{remaining}s</b></div>
    {error ? <div className="pointsErrorState"><strong>QR no disponible</strong><p>{error}</p><button className="nvSecondaryButton" type="button" onClick={() => void refresh()}>Intentar de nuevo</button></div>
      : raw ? <>
        <div className="pointsQrCanvas"><QRCodeSVG value={`${origin}/dashboard/points?view=${purpose === "points" ? "visits" : "redemptions"}&scan=${encodeURIComponent(raw)}`} size={220} level="M" /></div>
        <div className="pointsManualCode"><span>{purpose === "redeem" ? "CÓDIGO TEMPORAL DE CANJE" : "CÓDIGO TEMPORAL"}</span><strong className="pointsManualCodeValue">{shortCode}</strong></div><small className="pointsManualHint">Díctalo o muéstralo en caja si no pueden escanear el QR.</small>
      </>
      : <div className="pointsEmptyState">Generando QR seguro…</div>}
    <p>Por seguridad, este QR y código cambian automáticamente y son de un solo uso.</p>
  </section>;
}
