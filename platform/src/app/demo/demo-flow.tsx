"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Step = "intro" | "pay-about" | "pay-config" | "pay-live" | "pay-use" | "points-about" | "points-config" | "points-live" | "reviews-about" | "reviews-live" | "done";
const steps: Step[] = ["intro","pay-about","pay-config","pay-live","pay-use","points-about","points-config","points-live","reviews-about","reviews-live","done"];

export function DemoFlow() {
  const [step, setStep] = useState<Step>("intro");
  const [holder, setHolder] = useState("Café Nival");
  const [bank, setBank] = useState("BBVA");
  const [reward, setReward] = useState("Café de la casa gratis");
  const [goal, setGoal] = useState(10);
  const index = steps.indexOf(step);
  const next = () => setStep(steps[Math.min(index + 1, steps.length - 1)]);
  const progress = Math.round(((index + 1) / steps.length) * 100);
  const clabe = useMemo(() => "000 000 000000000 000", []);

  return <main className="guidedDemo">
    <header className="guidedDemoTop">
      <Link href="/" className="guidedDemoBrand"><span>N</span><b>Nival Tech</b></Link>
      <div className="guidedDemoProgress"><i style={{ width: `${progress}%` }} /></div>
      <small>{index + 1} / {steps.length}</small>
    </header>

    <section className="guidedDemoStage">
      {step === "intro" && <div className="guidedCopy">
        <span>DEMO GUIADA</span>
        <h1>Tres herramientas. Tres problemas cotidianos.</h1>
        <p><b>Nival Pay</b> facilita que te paguen. <b>Nival Puntos</b> ayuda a que tus clientes regresen. <b>Nival Reseñas</b> hace más fácil pedir una reseña después de una buena experiencia.</p>
        <button onClick={next}>Empezar demo →</button>
      </div>}

      {step === "pay-about" && <div className="guidedCopy">
        <span>NIVAL PAY</span><h1>Que pagar no dependa de que tú dictes la CLABE.</h1>
        <p>Creas una página simple con los datos que tu cliente necesita para pagarte y la compartes desde un QR, un enlace o un acceso físico en tu negocio.</p>
        <button onClick={next}>Continuar →</button>
      </div>}

      {step === "pay-config" && <div className="guidedSplit">
        <div className="guidedCopy compact"><span>PASO 1 · CONFIGURA</span><h1>Personaliza tu Nival Pay.</h1><p>En esta demo solo edita el titular y el banco. Los demás datos son falsos a propósito.</p></div>
        <div className="guidedForm">
          <label>Nombre del titular<input value={holder} onChange={(e)=>setHolder(e.target.value)} maxLength={50}/></label>
          <label>Banco<input value={bank} onChange={(e)=>setBank(e.target.value)} maxLength={30}/></label>
          <div className="guidedLocked"><span>CLABE de demostración</span><strong>{clabe}</strong><small>No es una cuenta real</small></div>
          <button onClick={next}>Publicar Nival Pay →</button>
        </div>
      </div>}

      {step === "pay-live" && <div className="guidedSplit">
        <div className="guidedCopy compact"><span>PASO 2 · ASÍ LO VE TU CLIENTE</span><h1>Sin instrucciones largas.</h1><p>Tu cliente abre esta vista y sigue tres pasos.</p></div>
        <div className="guidedPhone light">
          <div className="guidedPayHeader"><span>CN</span><small>Paga a</small><h2>{holder || "Tu negocio"}</h2></div>
          <div className="guidedSteps"><b>1 · Copia la CLABE</b><b>2 · Abre tu banco</b><b>3 · Pega y verifica</b></div>
          <p className="guidedWarning">Antes de transferir, confirma que el beneficiario coincida.</p>
          <div className="guidedField"><span>Beneficiario</span><strong>{holder}</strong></div>
          <div className="guidedField"><span>Banco</span><strong>{bank}</strong></div>
          <div className="guidedField"><span>CLABE</span><strong>{clabe}</strong></div>
          <button onClick={next}>Continuar →</button>
        </div>
      </div>}

      {step === "pay-use" && <div className="guidedCopy">
        <span>¿CÓMO LO USAS?</span><h1>Lo pones donde ya cobras.</h1>
        <div className="guidedUseGrid"><article><b>1</b><strong>Comparte</strong><p>QR en mostrador, link por WhatsApp o acceso físico.</p></article><article><b>2</b><strong>El cliente abre</strong><p>Ve tus datos y sabe exactamente qué hacer.</p></article><article><b>3</b><strong>Tú actualizas</strong><p>Si cambias banco o titular, editas Nival y conservas el mismo acceso.</p></article></div>
        <button onClick={next}>Siguiente: Nival Puntos →</button>
      </div>}

      {step === "points-about" && <div className="guidedCopy">
        <span>NIVAL PUNTOS</span><h1>Dale una razón visible para volver.</h1><p>Tu cliente se registra una vez, acumula visitas o puntos y ve cuánto le falta para su recompensa desde el celular.</p><button onClick={next}>Configurar demo →</button>
      </div>}

      {step === "points-config" && <div className="guidedSplit">
        <div className="guidedCopy compact"><span>PASO 1 · CONFIGURA</span><h1>Define la recompensa.</h1><p>Elige qué gana el cliente y cuántas visitas necesita.</p></div>
        <div className="guidedForm">
          <label>Recompensa<input value={reward} onChange={(e)=>setReward(e.target.value)} maxLength={70}/></label>
          <label>Meta de visitas<input type="number" min={2} max={30} value={goal} onChange={(e)=>setGoal(Math.max(2, Math.min(30, Number(e.target.value) || 10)))}/></label>
          <button onClick={next}>Publicar programa →</button>
        </div>
      </div>}

      {step === "points-live" && <div className="guidedSplit">
        <div className="guidedCopy compact"><span>PASO 2 · ASÍ LO VE TU CLIENTE</span><h1>El progreso se entiende solo.</h1><p>El cliente ve sus puntos y la recompensa sin pedirte explicación.</p></div>
        <div className="guidedPhone dark">
          <div className="guidedPointsBrand"><span>CN</span><div><small>CLIENTES FRECUENTES</small><h2>Café Nival</h2></div></div>
          <p>Hola, Ana · Tu saldo actual</p><div className="guidedBalance"><strong>{Math.max(1, goal - 3)}</strong><span>de {goal} visitas</span></div>
          <div className="guidedBar"><i style={{width:`${Math.round(((goal-3)/goal)*100)}%`}} /></div>
          <div className="guidedReward"><small>PRÓXIMA RECOMPENSA</small><strong>{reward}</strong><span>Te faltan 3 visitas</span></div>
          <button onClick={next}>Siguiente: Nival Reseñas →</button>
        </div>
      </div>}

      {step === "reviews-about" && <div className="guidedCopy">
        <span>NIVAL RESEÑAS</span><h1>Una buena experiencia vale más si termina en una reseña.</h1><p>Conecta el enlace de reseñas de Google de tu negocio. El cliente escanea o acerca el celular y llega directo a dejar su opinión.</p><button onClick={next}>Ver ejemplo →</button>
      </div>}

      {step === "reviews-live" && <div className="guidedSplit">
        <div className="guidedCopy compact"><span>ASÍ SE USA</span><h1>Un acceso directo, sin buscar tu negocio.</h1><div className="guidedUseGrid single"><article><b>1</b><strong>Pides la reseña</strong><p>Después de una buena atención.</p></article><article><b>2</b><strong>Escanea o acerca</strong><p>El cliente abre el enlace correcto.</p></article><article><b>3</b><strong>Opina</strong><p>Llega directamente a Google para dejar la reseña.</p></article></div></div>
        <div className="guidedReviewCard"><span>★★★★★</span><h2>¿Cómo fue tu experiencia?</h2><p>Tu opinión ayuda a este negocio.</p><button onClick={next}>Dejar reseña</button></div>
      </div>}

      {step === "done" && <div className="guidedCopy">
        <span>DEMO TERMINADA</span><h1>Ahora ya sabes qué hace Nival.</h1><p>Empieza con una herramienta gratis o elige un plan desde la página principal.</p><Link className="guidedLinkButton" href="/#planes">Volver y ver planes →</Link>
      </div>}
    </section>
  </main>;
}
