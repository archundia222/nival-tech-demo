"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./landing-premium.module.css";

const products = [
  { id: "pay", label: "Nival Pay", eyebrow: "Cobrar", href: "/auth?mode=signup&next=%2Fdashboard%2Fpay" },
  { id: "points", label: "Nival Puntos", eyebrow: "Recurrencia", href: "/auth?mode=signup&next=%2Fdashboard%2Fpoints" },
  { id: "intelligence", label: "Intelligence", eyebrow: "Decidir", href: "/auth?mode=signup&next=%2Fdashboard%2Fintelligence" },
] as const;

type ProductId = (typeof products)[number]["id"];

export function LandingExperience() {
  const [active, setActive] = useState<ProductId>("pay");
  const current = products.find((product) => product.id === active) ?? products[0];

  return (
    <div className={styles.experienceShell}>
      <div className={styles.experienceTabs} role="group" aria-label="Cambiar vista de producto">
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            aria-pressed={active === product.id}
            className={active === product.id ? styles.experienceTabActive : styles.experienceTab}
            onClick={() => setActive(product.id)}
          >
            <span>{product.eyebrow}</span>
            <strong>{product.label}</strong>
          </button>
        ))}
      </div>

      <div className={styles.experienceCanvas} aria-label={"Vista de " + current.label}>
        <div className={styles.experienceCopy}>
          {active === "pay" && <>
            <span className={styles.microLabel}>NIVAL PAY · EXPERIENCIA DEL CLIENTE</span>
            <h3>Tu forma de cobrar, presentada como un producto.</h3>
            <p>Una página limpia para que el cliente encuentre beneficiario, banco, CLABE y enlaces sin pedirte los datos otra vez.</p>
            <div className={styles.experienceBullets}>
              <span><i>01</i> QR, enlace o NFC</span>
              <span><i>02</i> Datos editables</span>
              <span><i>03</i> Métricas operativas</span>
            </div>
          </>}
          {active === "points" && <>
            <span className={styles.microLabel}>NIVAL PUNTOS · TARJETA DEL CLIENTE</span>
            <h3>Haz visible el progreso para que regresar tenga sentido.</h3>
            <p>El cliente ve sus visitas, avance y recompensa desde el celular. El negocio registra actividad sin convertir la caja en un sistema complicado.</p>
            <div className={styles.experienceBullets}>
              <span><i>01</i> Registro por QR</span>
              <span><i>02</i> Visitas y recompensas</span>
              <span><i>03</i> Wallet opcional</span>
            </div>
          </>}
          {active === "intelligence" && <>
            <span className={styles.microLabel}>NIVAL INTELLIGENCE · SIGUIENTE ACCIÓN</span>
            <h3>Menos gráficas. Más decisiones que puedes ejecutar hoy.</h3>
            <p>Intelligence organiza señales de recurrencia, riesgo y actividad para sugerir una siguiente acción y ayudarte a medir qué pasó después.</p>
            <div className={styles.experienceBullets}>
              <span><i>01</i> Detecta señales</span>
              <span><i>02</i> Prioriza audiencias</span>
              <span><i>03</i> Mide regresos</span>
            </div>
          </>}
          <Link href={current.href} className={styles.textCta}>Probar {current.label} <span aria-hidden="true">↗</span></Link>
        </div>

        <div className={styles.experienceVisual} aria-live="polite">
          {active === "pay" && <PayPreview />}
          {active === "points" && <PointsPreview />}
          {active === "intelligence" && <IntelligencePreview />}
        </div>
      </div>
    </div>
  );
}

function PayPreview() {
  return (
    <div className={styles.payScene}>
      <div className={styles.nfcMiniCard}>
        <div><span>N</span><small>NIVAL PAY</small></div>
        <strong>Acerca tu celular<br />para pagar</strong>
        <em>nfc · qr · enlace</em>
      </div>
      <div className={styles.phoneFrame}>
        <div className={styles.phoneNotch} />
        <div className={styles.phoneTopline}><span>CN</span><small>CAFÉ NIVAL</small></div>
        <p>DATOS PARA TRANSFERENCIA</p>
        <h4>Paga sin pedir los datos otra vez.</h4>
        <dl className={styles.payDetails}>
          <div><dt>Beneficiario</dt><dd>Café Nival Demo</dd></div>
          <div><dt>Banco</dt><dd>Banco Ejemplo</dd></div>
          <div><dt>CLABE</dt><dd>012 180 015022688507</dd></div>
        </dl>
        <div className={styles.previewButton}>Copiar CLABE</div>
      </div>
      <div className={styles.sceneMetric}><span>HOY</span><strong>18</strong><small>aperturas de página</small></div>
    </div>
  );
}

function PointsPreview() {
  return (
    <div className={styles.pointsScene}>
      <div className={styles.walletPass}>
        <div className={styles.walletHeader}><span>CN</span><div><small>CAFÉ NIVAL</small><strong>Tu tarjeta</strong></div><em>•••</em></div>
        <div className={styles.pointsBalance}><strong>6</strong><span>de 8 visitas</span></div>
        <div className={styles.progressTrack}><i style={{ width: "75%" }} /></div>
        <p>Te faltan 2 visitas para tu recompensa.</p>
        <div className={styles.rewardBox}><span>RECOMPENSA</span><strong>Bebida de la casa</strong></div>
      </div>
      <div className={styles.visitCard}>
        <span>ÚLTIMA VISITA</span>
        <strong>Hoy · 10:42</strong>
        <small>+1 punto registrado</small>
      </div>
      <div className={styles.customerPulse}>
        <span />
        <div><small>CLIENTES ACTIVOS</small><strong>24</strong></div>
        <em>+3 esta semana</em>
      </div>
    </div>
  );
}

function IntelligencePreview() {
  return (
    <div className={styles.intelScene}>
      <div className={styles.intelPanel}>
        <div className={styles.intelTop}><span>NIVAL INTELLIGENCE</span><em>ACTUALIZADO HOY</em></div>
        <h4>Hay clientes que conviene intentar recuperar antes de lanzar otra promoción general.</h4>
        <div className={styles.intelStats}>
          <div><small>EN RIESGO</small><strong>8</strong></div>
          <div><small>CONTACTABLES</small><strong>5</strong></div>
          <div><small>FRECUENTES</small><strong>3</strong></div>
        </div>
        <div className={styles.recommendation}>
          <span>ACCIÓN SUGERIDA</span>
          <strong>Campaña de regreso</strong>
          <p>Empieza por clientes que ya conocían el negocio y redujeron su frecuencia.</p>
          <div className={styles.previewButton}>Preparar campaña</div>
        </div>
      </div>
      <div className={styles.signalBars} aria-hidden="true">
        <i style={{ height: "38%" }} /><i style={{ height: "55%" }} /><i style={{ height: "48%" }} /><i style={{ height: "76%" }} /><i style={{ height: "66%" }} /><i style={{ height: "88%" }} />
      </div>
    </div>
  );
}
