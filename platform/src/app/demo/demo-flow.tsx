"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PaymentPageView } from "../pay/[token]/payment-page-view";

type Step =
  | "intro"
  | "pay-about"
  | "pay-config"
  | "pay-use"
  | "points-about"
  | "points-config"
  | "points-use"
  | "reviews-about"
  | "reviews-use"
  | "done";

const steps: Step[] = [
  "intro",
  "pay-about",
  "pay-config",
  "pay-use",
  "points-about",
  "points-config",
  "points-use",
  "reviews-about",
  "reviews-use",
  "done",
];

export function DemoFlow() {
  const [step, setStep] = useState<Step>("intro");
  const [holder, setHolder] = useState("Café Nival");
  const [bank, setBank] = useState("BBVA");
  const [reward, setReward] = useState("Café gratis");
  const [points, setPoints] = useState(7);
  const [redeemed, setRedeemed] = useState(false);
  const index = steps.indexOf(step);
  const next = () => setStep(steps[Math.min(index + 1, steps.length - 1)]);
  const progress = Math.round(((index + 1) / steps.length) * 100);
  const clabe = useMemo(() => "000000000000000000", []);

  const payProfile = useMemo(() => ({
    business_name: holder || "Tu negocio",
    business_slug: null,
    points_enabled: false,
    logo_url: null,
    brand_color: "#cdae67",
    account_holder: holder || "Tu negocio",
    bank_name: bank || "Tu banco",
    clabe,
    concept: "Pago de consumo",
    payment_url: null,
    holder_visible: true,
    bank_visible: true,
    clabe_visible: true,
    concept_visible: true,
    payment_url_visible: false,
    custom_sections: [],
  }), [holder, bank, clabe]);

  const pointsReady = points >= 10 && !redeemed;
  const visiblePoints = redeemed ? 0 : Math.min(points, 10);

  function addPoint() {
    if (redeemed) setRedeemed(false);
    setPoints((value) => Math.min(10, value + 1));
  }

  function redeem() {
    setRedeemed(true);
    setPoints(0);
  }

  return <main className="guidedDemo">
    <header className="guidedDemoTop">
      <Link href="/" className="guidedDemoBrand"><span>N</span><b>Nival Tech</b></Link>
      <div className="guidedDemoProgress"><i style={{ width: `${progress}%` }} /></div>
      <small>{index + 1} / {steps.length}</small>
    </header>

    <section className="guidedDemoStage">
      {step === "intro" && <div className="guidedCopy">
        <span>DEMO GUIADA</span>
        <h1>Vas a probar Nival como si ya fuera tu negocio.</h1>
        <p>Primero Pay, después Puntos y al final Reseñas. Tú configuras; después verás exactamente lo que recibe tu cliente.</p>
        <button onClick={next}>Empezar demo →</button>
      </div>}

      {step === "pay-about" && <div className="guidedCopy">
        <span>NIVAL PAY</span>
        <h1>Una forma más simple de compartir cómo pagarte.</h1>
        <p>Tu tarjeta Pay abre en el celular una página con tus datos de transferencia. El cliente acerca su teléfono, copia la CLABE y paga sin pedirte que se la dictes.</p>
        <div className="guidedCardInstructions"><b>Cómo se usa</b><span>1. Configura tus datos.</span><span>2. El cliente acerca su teléfono.</span><span>3. Copia y paga.</span></div>
        <button onClick={next}>Continuar →</button>
      </div>}

      {step === "pay-config" && <div className="guidedDemoProductStage">
        <div className="guidedCopy compact">
          <span>PASO 1 · CONFIGURA TU NIVAL PAY</span>
          <h1>Edita directamente y mira cómo cambia.</h1>
          <p>Escribe el titular y el banco. La CLABE es falsa a propósito. Dentro de la vista puedes tocar los datos para copiarlos.</p>
          <div className="guidedInlineFields">
            <label>Titular<input value={holder} onChange={(e)=>setHolder(e.target.value)} maxLength={50}/></label>
            <label>Banco<input value={bank} onChange={(e)=>setBank(e.target.value)} maxLength={30}/></label>
          </div>
          <small className="guidedAutosave">● Los cambios se guardan automáticamente</small>
          <button onClick={next}>Publicar Nival Pay →</button>
        </div>
        <div className="guidedExactPreview">
          <PaymentPageView profile={payProfile} embedded />
        </div>
      </div>}

      {step === "pay-use" && <div className="guidedCopy">
        <span>PASO 2 · ÚSALO CON TUS CLIENTES</span>
        <h1>De “¿te dicto mi CLABE?” a acercar, copiar y listo.</h1>
        <p className="guidedFlowLead">La tarjeta hace que compartir tus datos de pago sea una acción visual y rápida.</p>
        <div className="guidedTapFlow">
          <article className="guidedOldWay"><span>ANTES</span><div className="guidedChat left">“¿Me dictas tu CLABE?”</div><div className="guidedChat right">“Sí, espera…”</div><strong>Buscar. Dictar. Repetir.</strong></article>
          <div className="guidedFlowArrow" aria-hidden="true">→</div>
          <article className="guidedNewWay"><span>CON TU TARJETA</span><div className="guidedTapPhone"><small>Tu negocio</small><b>Acerca tu teléfono</b><i>)))</i><button type="button">Copiar CLABE</button><em>✓ Copiado</em></div><strong>Acerca. Copia. Listo.</strong></article>
        </div>
        <button onClick={next}>Siguiente: Nival Puntos →</button>
      </div>}

      {step === "points-about" && <div className="guidedCopy">
        <span>NIVAL PUNTOS</span>
        <h1>Haz visible la razón para regresar.</h1>
        <p>Tu tarjeta de Puntos abre el programa de lealtad del negocio. El cliente ve sus puntos, su progreso y la recompensa que puede conseguir.</p>
        <div className="guidedCardInstructions"><b>Cómo se usa</b><span>1. El cliente se registra.</span><span>2. Registras cada visita.</span><span>3. Al llegar a la meta, canjea su premio.</span></div>
        <button onClick={next}>Continuar →</button>
      </div>}

      {step === "points-config" && <div className="guidedDemoProductStage">
        <div className="guidedCopy compact">
          <span>PASO 1 · CONFIGURA TU PROGRAMA</span>
          <h1>Define la recompensa y prueba el flujo.</h1>
          <label className="guidedRewardField">Recompensa<input value={reward} onChange={(e)=>setReward(e.target.value)} maxLength={60}/></label>
          <div className="guidedPointsActions">
            <button type="button" onClick={addPoint} disabled={pointsReady}>+ Agregar punto</button>
            {pointsReady && <button type="button" className="rewardAction" onClick={redeem}>Canjear premio</button>}
          </div>
          {redeemed && <div className="guidedRedeemed"><b>✓ Premio canjeado</b><span>{reward}</span></div>}
          <button onClick={next}>Entender cómo se usa →</button>
        </div>

        <div className="guidedExactPoints nivalDashboard">
          <div className="guidedCustomerHint">ASÍ LO VE TU CLIENTE</div>
          <section className="pointsCustomerCard">
            <div className="pointsCustomerCardTop">
              <div className="pointsBusinessIdentity"><span>C</span><div><p className="pointsCustomerProgram">Clientes frecuentes</p><h1>Café Nival</h1></div></div>
              <span className="pointsCustomerMemberBadge">MIEMBRO</span>
            </div>
            <div className="pointsCustomerGreeting"><span>Hola, Ana</span><small>Tu saldo actual</small></div>
            <div className="pointsBalance"><strong>{visiblePoints}</strong><span>puntos</span></div>
            <div className="pointsProgressBlock">
              <div className="pointsProgressMeta"><span>Progreso</span><b>{visiblePoints} / 10</b></div>
              <div className="pointsProgress"><i style={{ width: `${visiblePoints * 10}%` }} /></div>
            </div>
            <div className="pointsReward">
              <div><span>{pointsReady ? "PREMIO DISPONIBLE" : "PRÓXIMA RECOMPENSA"}</span><strong>{reward}</strong></div>
              {pointsReady ? <b>Lista para usar</b> : <b>Te faltan {Math.max(0,10-visiblePoints)} puntos</b>}
            </div>
            {pointsReady && <div className="pointsAvailableNotice"><span>✓</span><div><strong>1 recompensa disponible</strong><small>Ya puede canjearla en caja.</small></div></div>}
          </section>
        </div>
      </div>}

      {step === "points-use" && <div className="guidedCopy">
        <span>PASO 2 · CÓMO FUNCIONA EN EL NEGOCIO</span>
        <h1>Tu cliente ve el progreso. Tú registras lo que pasa.</h1>
        <div className="guidedUseGrid">
          <article><b>1</b><strong>Se registra</strong><p>Abre tu QR y obtiene su tarjeta digital.</p></article>
          <article><b>2</b><strong>Vuelve</strong><p>Registras la visita y su progreso aumenta.</p></article>
          <article><b>3</b><strong>Canjea</strong><p>Al llegar a la meta aparece la recompensa disponible.</p></article>
        </div>
        <button onClick={next}>Siguiente: Nival Reseñas →</button>
      </div>}

      {step === "reviews-about" && <div className="guidedCopy">
        <span>NIVAL RESEÑAS</span>
        <h1>Haz más fácil aprovechar una buena experiencia.</h1>
        <p>Tu tarjeta de Reseñas abre directamente las Reseñas de Google de tu negocio. Así el cliente no tiene que buscar tu perfil manualmente.</p>
        <div className="guidedCardInstructions"><b>Cómo se usa</b><span>1. Conecta tus Reseñas de Google.</span><span>2. El cliente acerca su teléfono.</span><span>3. Llega directo a dejar su reseña.</span></div>
        <button onClick={next}>Ver cómo funciona →</button>
      </div>}

      {step === "reviews-use" && <div className="guidedSplit">
        <div className="guidedCopy compact">
          <span>ASÍ SE USA</span>
          <h1>De “¿nos dejas una reseña?” a un acceso directo.</h1>
          <div className="guidedUseGrid single">
            <article><b>1</b><strong>Pides la reseña</strong><p>Después de una buena experiencia.</p></article>
            <article><b>2</b><strong>El cliente abre</strong><p>Escanea el QR o acerca el celular.</p></article>
            <article><b>3</b><strong>Llega a Google</strong><p>Sin buscar manualmente tu negocio.</p></article>
          </div>
        </div>
        <div className="guidedReviewCard">
          <span>★★★★★</span>
          <h2>¿Cómo fue tu experiencia?</h2>
          <p>Tu opinión ayuda a este negocio.</p>
          <button onClick={next}>Dejar reseña</button>
        </div>
      </div>}

      {step === "done" && <div className="guidedCopy">
        <span>DEMO TERMINADA</span>
        <h1>Ya viste cómo se configura y cómo lo usa tu cliente.</h1>
        <p>Puedes crear tu cuenta gratis y activar solo la herramienta que tenga sentido para tu negocio.</p>
        <Link className="guidedLinkButton" href="/#planes">Volver a la landing →</Link>
      </div>}
    </section>
  </main>;
}
