"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { awardPoint, claimScanToken, redeemPointReward } from "@/app/points/actions";

type ScanCustomer = {
  scan_session_id: string;
  customer_first_name: string;
  points_balance: number;
  reward_threshold: number;
  reward_description: string;
  expires_at: string;
  available_rewards: number;
};

type BarcodeDetectorLike = {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

export function PointsEmployeeScanner({ mode = "visit" }: { mode?: "visit" | "redeem" }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [manual, setManual] = useState("");
  const [customer, setCustomer] = useState<ScanCustomer | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [reviewUrl, setReviewUrl] = useState("");
  const [reviewPrompt, setReviewPrompt] = useState(false);

  async function claim(value: string) {
    const raw = value.trim().replace(/^nivalpoints:/, "");
    if (!raw || pending) return;
    const result = await claimScanToken(raw);
    if (!result.ok || !result.customer) {
      setCustomer(null); setMessage(result.error ?? "QR expirado."); return;
    }
    setCustomer(result.customer as ScanCustomer);
    setMessage("");
    setCameraOn(false);
  }

  useEffect(() => {
    if (!cameraOn) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!videoRef.current || stopped) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
        if (!Detector) { setMessage("Tu navegador no permite escaneo automático. Pega el código manualmente."); return; }
        const detector = new Detector({ formats: ["qr_code"] });
        timer = window.setInterval(async () => {
          if (!videoRef.current) return;
          const found = await detector.detect(videoRef.current).catch(() => []);
          if (found[0]?.rawValue) void claim(found[0].rawValue);
        }, 700);
      } catch { setMessage("No pudimos abrir la cámara. Revisa el permiso del navegador."); setCameraOn(false); }
    })();
    return () => { stopped = true; window.clearInterval(timer); stream?.getTracks().forEach(track => track.stop()); };
  }, [cameraOn]);

  function addPoint() {
    if (!customer) return;
    startTransition(async () => {
      const result = await awardPoint(customer.scan_session_id);
      if (!result.ok) { setMessage(result.error ?? "No pudimos sumar el punto."); return; }
      setCustomer({ ...customer, points_balance: result.result?.new_points_balance ?? customer.points_balance + 1 });
      setReviewPrompt(Boolean(result.result?.review_prompt));
      setReviewUrl(result.result?.review_url ?? "");
      setMessage("Punto registrado.");
    });
  }

  function redeem() {
    if (!customer) return;
    startTransition(async () => {
      const result = await redeemPointReward(customer.scan_session_id);
      if (!result.ok) { setMessage(result.error ?? "No pudimos canjear."); return; }
      setCustomer({ ...customer, points_balance: result.result?.new_points_balance ?? customer.points_balance, available_rewards: Math.max(0, customer.available_rewards - 1) });
      setMessage("Premio canjeado.");
    });
  }

  return <section className="pointsScannerCard">
    <div className="pointsSectionHeading"><div><span>{mode === "redeem" ? "CANJES" : "VISITAS"}</span><h2>{mode === "redeem" ? "Canjear recompensa" : "Registrar visita"}</h2></div><p>Escanea el QR temporal del cliente para {mode === "redeem" ? "validar y entregar su recompensa" : "registrar su visita y sumar el punto correspondiente"}.</p></div>
    {!customer && <>
      <button className="nvPrimaryButton pointsScanButton" type="button" onClick={() => setCameraOn(value => !value)}>{cameraOn ? "Cerrar cámara" : "Abrir cámara"}</button>
      {cameraOn && <div className="pointsCamera"><video ref={videoRef} playsInline muted /><span>Centra el QR dentro del recuadro</span></div>}
      <div className="pointsManualScan"><input value={manual} onChange={e => setManual(e.target.value)} placeholder="Código temporal" aria-label="Código temporal" /><button className="nvSecondaryButton" type="button" onClick={() => void claim(manual)}>Validar</button></div>
    </>}
    {customer && <div className="pointsScannedCustomer">
      <div><span>CLIENTE</span><h3>{customer.customer_first_name}</h3><p>{customer.points_balance} de {customer.reward_threshold} puntos · {customer.available_rewards > 0 ? `${customer.available_rewards} recompensa${customer.available_rewards === 1 ? "" : "s"} disponible${customer.available_rewards === 1 ? "" : "s"}` : customer.reward_description}</p></div>
      <div className="pointsCashActions">
        {mode === "visit" ? <button className="nvPrimaryButton" disabled={pending} type="button" onClick={addPoint}>Registrar visita</button> : <button className="nvPrimaryButton" disabled={pending || customer.available_rewards < 1} type="button" onClick={redeem}>Canjear recompensa</button>}
        <button className="nvTertiaryButton" type="button" onClick={() => { setCustomer(null); setMessage(""); setReviewPrompt(false); setReviewUrl(""); setManual(""); }}>Otro cliente</button>
      </div>
    </div>}
    {message && <p className={message.includes("registrado") || message.includes("canjeado") ? "pointsStatus" : "pointsStatus pointsStatusError"}>{message}</p>}
    {mode === "visit" && message === "Punto registrado." && reviewPrompt && reviewUrl && <div className="pointsReviewPrompt">
      <div><span>RESEÑA RECOMENDADA</span><h3>Este es un buen momento para pedir una reseña</h3><p>Pídele al cliente, sin condicionar su opinión, que comparta su experiencia. Puede escanear este QR o usar tu tarjeta NFC de Nival Reseñas.</p></div>
      <div className="pointsQrCanvas"><QRCodeSVG value={reviewUrl} size={180} level="M" /></div>
      <a className="nvSecondaryButton" href={reviewUrl} target="_blank" rel="noreferrer">Abrir enlace de reseña ↗</a>
    </div>}
    {mode === "visit" && message === "Punto registrado." && <button className="nvPrimaryButton" type="button" onClick={() => { setCustomer(null); setMessage(""); setReviewPrompt(false); setReviewUrl(""); setManual(""); }}>Regresar al registro de visitas</button>}
  </section>;
}
