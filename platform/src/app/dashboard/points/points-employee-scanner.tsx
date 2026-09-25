"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { awardPoint, claimScanToken, claimWalletCard, redeemPointReward, redeemRewardAfterVisit } from "@/app/points/actions";

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

type JsQrResult = { data: string } | null;
type JsQrFn = (data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst" }) => JsQrResult;

declare global {
  interface Window {
    jsQR?: JsQrFn;
  }
}

let jsQrLoader: Promise<JsQrFn> | null = null;

function loadJsQr() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  if (jsQrLoader) return jsQrLoader;
  jsQrLoader = new Promise<JsQrFn>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-nival-jsqr="1"]');
    const finish = () => window.jsQR ? resolve(window.jsQR) : reject(new Error("QR decoder unavailable"));
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("QR decoder failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.nivalJsqr = "1";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => reject(new Error("QR decoder failed")), { once: true });
    document.head.appendChild(script);
  });
  return jsQrLoader;
}

export function PointsEmployeeScanner({ mode = "visit", initialScanToken = "", initialWalletToken = "" }: { mode?: "visit" | "redeem"; initialScanToken?: string; initialWalletToken?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [manual, setManual] = useState("");
  const [customer, setCustomer] = useState<ScanCustomer | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [reviewUrl, setReviewUrl] = useState("");
  const [reviewPrompt, setReviewPrompt] = useState(false);
  const [confirmRedeem, setConfirmRedeem] = useState(false);
  const [visitConfirmed, setVisitConfirmed] = useState(false);
  const [flowMode, setFlowMode] = useState<"visit" | "redeem">(mode);
  const claimingRef = useRef(false);

  const claim = useCallback(async (value: string) => {
    let cleaned = value.trim();
    if (!cleaned || claimingRef.current) return;

    let walletToken = "";
    let detectedMode: "visit" | "redeem" = flowMode;
    try {
      const parsed = new URL(cleaned);
      const walletMatch = parsed.pathname.match(/^\/card\/([0-9a-f-]{36})/i);
      if (walletMatch?.[1]) walletToken = walletMatch[1];

      const linkedView = parsed.searchParams.get("view");
      if (linkedView === "redemptions") detectedMode = "redeem";
      if (linkedView === "visits") detectedMode = "visit";

      const urlScan = parsed.searchParams.get("scan");
      if (urlScan) cleaned = urlScan;
    } catch {
      const walletMatch = cleaned.match(/^wallet:([0-9a-f-]{36})$/i);
      if (walletMatch?.[1]) walletToken = walletMatch[1];
    }

    const prefixedPurpose = cleaned.match(/^nivalpoints:(visit|redeem):/i)?.[1]?.toLowerCase();
    if (prefixedPurpose === "visit" || prefixedPurpose === "redeem") detectedMode = prefixedPurpose;

    cleaned = cleaned.replace(/^nivalpoints:/, "");
    const raw = cleaned.replace(/^(visit|redeem):/, "");
    if (!walletToken && !raw) return;

    claimingRef.current = true;
    try {
      const result = walletToken
        ? await claimWalletCard(walletToken, detectedMode)
        : await claimScanToken(raw, detectedMode);
      if (!result.ok || !result.customer) {
        setCustomer(null);
        setMessage(walletToken
          ? (result.error ?? (detectedMode === "redeem" ? "No pudimos preparar el canje con esta tarjeta." : "No pudimos reconocer esta tarjeta de Google Wallet."))
          : (result.error ?? "Este QR temporal ya expiró o ya fue usado. Pide al cliente que genere uno nuevo."));
        return;
      }
      setCustomer(result.customer as ScanCustomer);
      setFlowMode(detectedMode);
      setConfirmRedeem(false);
      setVisitConfirmed(false);
      setMessage("");
      setCameraOn(false);
    } finally {
      claimingRef.current = false;
    }
  }, [flowMode]);

  useEffect(() => {
    if (initialWalletToken && flowMode === "visit") {
      void claim(`wallet:${initialWalletToken}`);
      return;
    }
    if (initialScanToken) void claim(initialScanToken);
  }, [claim, initialScanToken, initialWalletToken, mode]);

  useEffect(() => {
    if (!cameraOn) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;

    void (async () => {
      try {
        setMessage("");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!videoRef.current || stopped) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
        if (Detector) {
          const detector = new Detector({ formats: ["qr_code"] });
          timer = window.setInterval(async () => {
            if (!videoRef.current || claimingRef.current) return;
            const found = await detector.detect(videoRef.current).catch(() => []);
            if (found[0]?.rawValue) void claim(found[0].rawValue);
          }, 450);
          return;
        }

        const decoder = await loadJsQr();
        if (stopped) return;
        timer = window.setInterval(() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || claimingRef.current || video.readyState < 2) return;
          const width = video.videoWidth;
          const height = video.videoHeight;
          if (!width || !height) return;
          const targetWidth = Math.min(720, width);
          const scale = targetWidth / width;
          const targetHeight = Math.round(height * scale);
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          const image = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const result = decoder(image.data, targetWidth, targetHeight, { inversionAttempts: "attemptBoth" });
          if (result?.data) void claim(result.data);
        }, 280);
      } catch (error) {
        console.error("Nival QR scanner failed", error);
        setMessage("No pudimos usar la cámara dentro de Nival. Revisa que el navegador tenga permiso de cámara y vuelve a intentar.");
        setCameraOn(false);
      }
    })();

    return () => {
      stopped = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [cameraOn, claim]);

  function addPoint() {
    if (!customer) return;
    startTransition(async () => {
      const result = await awardPoint(customer.scan_session_id);
      if (!result.ok) { setMessage(result.error ?? "No pudimos sumar el punto."); return; }
      const earnedReward = Boolean(result.result?.reward_earned);
      setCustomer({
        ...customer,
        points_balance: result.result?.new_points_balance ?? customer.points_balance + 1,
        available_rewards: customer.available_rewards + (earnedReward ? 1 : 0),
      });
      setReviewPrompt(Boolean(result.result?.review_prompt));
      setReviewUrl(result.result?.review_url ?? "");
      setVisitConfirmed(true);
      setMessage("Punto registrado.");
    });
  }

  function redeem() {
    if (!customer) return;
    startTransition(async () => {
      const result = flowMode === "visit"
        ? await redeemRewardAfterVisit(customer.scan_session_id)
        : await redeemPointReward(customer.scan_session_id);
      if (!result.ok) { setMessage(result.error ?? "No pudimos canjear."); return; }
      setCustomer({ ...customer, points_balance: result.result?.new_points_balance ?? customer.points_balance, available_rewards: Math.max(0, customer.available_rewards - 1) });
      setMessage("Canje confirmado. Entrega la recompensa al cliente.");
      setConfirmRedeem(false);
    });
  }

  return <section className="pointsScannerCard">
    <div className="pointsSectionHeading"><div><span>{flowMode === "redeem" ? "CANJE" : "VISITA"}</span><h2>{flowMode === "redeem" ? "Canjear recompensa" : "Registrar visita"}</h2></div><p>{flowMode === "redeem" ? "Nival detectó un código de recompensa. Revisa el premio y confirma cuando vayas a entregarlo." : "Escanea cualquier QR de Nival: el sistema detecta automáticamente si es una visita o un canje."}</p></div>
    <div className="pointsFlowSteps"><span className={!customer ? "active" : "done"}><b>1</b> Validar código</span><i>→</i><span className={customer && !message ? "active" : customer ? "done" : ""}><b>2</b> Revisar</span><i>→</i><span className={message ? "active" : ""}><b>3</b> Confirmar</span></div>
    {!customer && <>
      <button className="nvPrimaryButton pointsScanButton" type="button" onClick={() => setCameraOn(value => !value)}>{cameraOn ? "Cerrar cámara" : "Abrir cámara"}</button>
      {cameraOn && <div className="pointsCamera"><video ref={videoRef} playsInline muted /><canvas ref={canvasRef} hidden aria-hidden="true" /><span>Centra el QR de Google Wallet o el QR temporal dentro del recuadro</span></div>}
      <p className="pointsDataSourceNote">Escanea la tarjeta de Google Wallet para visitas. Si el cliente abrió una recompensa, Nival reconocerá automáticamente su QR de canje.</p>
      <details className="pointsScanFallback">
        <summary>¿La cámara no lee el código?</summary>
        <p>Pega el código o enlace como respaldo. No necesitas cambiar de pantalla entre visita y canje.</p>
        <div className="pointsManualScan"><input value={manual} onChange={e => setManual(e.target.value)} placeholder="Código o enlace de Nival" aria-label="Código o enlace de Nival" /><button className="nvSecondaryButton" type="button" onClick={() => void claim(manual)}>Validar</button></div>
      </details>
    </>}
    {customer && <div className="pointsScannedCustomer">
      <div><span>CLIENTE</span><h3>{customer.customer_first_name}</h3><p>{customer.points_balance} de {customer.reward_threshold} puntos · {customer.available_rewards > 0 ? `${customer.available_rewards} recompensa${customer.available_rewards === 1 ? "" : "s"} disponible${customer.available_rewards === 1 ? "" : "s"}` : customer.reward_description}</p></div>
      <div className="pointsCashActions">
        {flowMode === "visit" && !visitConfirmed && <button className="nvPrimaryButton" disabled={pending} type="button" onClick={addPoint}>{pending ? "Registrando…" : "Confirmar visita y sumar punto"}</button>}
        {flowMode === "visit" && visitConfirmed && customer.available_rewards > 0 && !confirmRedeem && <div className="pointsRedeemConfirm">
          <span>PREMIO DISPONIBLE</span>
          <strong>Este cliente tiene {customer.available_rewards === 1 ? "un premio acumulado" : customer.available_rewards + " premios acumulados"}</strong>
          <p>{customer.reward_description}. Pregúntale si quiere canjearlo ahora o guardarlo para después.</p>
          <button className="nvPrimaryButton" disabled={pending} type="button" onClick={() => setConfirmRedeem(true)}>Canjear ahora</button>
          <button className="nvTertiaryButton" type="button" onClick={() => { setCustomer(null); setMessage(""); setReviewPrompt(false); setReviewUrl(""); setManual(""); setVisitConfirmed(false); setFlowMode(mode); }}>Guardar para después</button>
        </div>}
        {flowMode === "visit" && visitConfirmed && customer.available_rewards > 0 && confirmRedeem && <div className="pointsRedeemConfirm">
          <span>CONFIRMAR CANJE</span>
          <strong>{customer.reward_description}</strong>
          <p>Confirma solo cuando vayas a entregar el premio al cliente.</p>
          <button className="nvPrimaryButton" disabled={pending} type="button" onClick={redeem}>{pending ? "Canjeando…" : "Confirmar canje"}</button>
          <button className="nvTertiaryButton" type="button" onClick={() => setConfirmRedeem(false)}>Volver</button>
        </div>}
        {flowMode === "redeem" && (customer.available_rewards < 1 ? <div className="pointsNoReward"><strong>Sin recompensas disponibles</strong><span>Este cliente todavía no tiene un premio listo para canjear.</span></div> : !confirmRedeem ? <button className="nvPrimaryButton" disabled={pending} type="button" onClick={() => setConfirmRedeem(true)}>Revisar canje</button> : <div className="pointsRedeemConfirm"><span>VAS A CANJEAR</span><strong>{customer.reward_description}</strong><p>Confirma solo cuando estés listo para entregar la recompensa.</p><button className="nvPrimaryButton" disabled={pending} type="button" onClick={redeem}>{pending ? "Canjeando…" : "Confirmar canje"}</button><button className="nvTertiaryButton" type="button" onClick={() => setConfirmRedeem(false)}>Cancelar</button></div>)}
        {(flowMode === "redeem" || (flowMode === "visit" && (!visitConfirmed || customer.available_rewards === 0))) && <button className="nvTertiaryButton" type="button" onClick={() => { setCustomer(null); setMessage(""); setReviewPrompt(false); setReviewUrl(""); setManual(""); setConfirmRedeem(false); setVisitConfirmed(false); setFlowMode(mode); }}>Otro cliente</button>}
      </div>
    </div>}
    {message && <p className={message.includes("registrado") || message.includes("canjeado") || message.includes("Canje confirmado") ? "pointsStatus" : "pointsStatus pointsStatusError"}>{message}</p>}
    {flowMode === "visit" && message === "Punto registrado." && reviewPrompt && reviewUrl && <div className="pointsReviewPrompt">
      <div><span>RESEÑA RECOMENDADA</span><h3>Este es un buen momento para pedir una reseña</h3><p>Pídele al cliente, sin condicionar su opinión, que comparta su experiencia. Puede escanear este QR o usar tu tarjeta NFC de Nival Reseñas.</p></div>
      <div className="pointsQrCanvas"><QRCodeSVG value={reviewUrl} size={180} level="M" /></div>
      <a className="nvSecondaryButton" href={reviewUrl} target="_blank" rel="noreferrer">Abrir enlace de reseña ↗</a>
    </div>}
    {flowMode === "visit" && message === "Punto registrado." && customer?.available_rewards === 0 && <button className="nvPrimaryButton" type="button" onClick={() => { setCustomer(null); setMessage(""); setReviewPrompt(false); setReviewUrl(""); setManual(""); setConfirmRedeem(false); setVisitConfirmed(false); setFlowMode(mode); }}>Registrar otro cliente</button>}
  </section>;
}
