"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { CopyField } from "./copy-field";
import styles from "./payment-page.module.css";

export type PaymentPageSection = {
  id: string;
  title: string;
  content: string;
  public?: boolean;
};

export type PaymentPageViewProfile = {
  business_name: string;
  business_slug?: string | null;
  points_enabled?: boolean;
  logo_url?: string | null;
  brand_color?: string | null;
  account_holder: string;
  bank_name: string;
  clabe: string;
  concept?: string | null;
  payment_url?: string | null;
  holder_visible?: boolean;
  bank_visible?: boolean;
  clabe_visible?: boolean;
  concept_visible?: boolean;
  payment_url_visible?: boolean;
  custom_sections?: PaymentPageSection[] | null;
};

export function PaymentPageView({
  profile,
  embedded = false,
  trackingToken,
}: {
  profile: PaymentPageViewProfile;
  embedded?: boolean;
  trackingToken?: string;
}) {
  const initials = profile.business_name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const content = <>
    <section className={embedded ? `${styles.payCard} ${styles.embeddedCard}` : styles.payCard} style={{ "--blue": profile.brand_color || "#b89a5a" } as CSSProperties} aria-labelledby={embedded ? undefined : "payment-title"}>
      <div className={styles.brandRow}>
        <span className={styles.brandMark} aria-hidden="true"><svg viewBox="0 0 28 28"><path d="M14 2.4 24 8.2v11.6L14 25.6 4 19.8V8.2L14 2.4Z"/><path d="m9.2 16.5 3.1 3.1 6.7-8"/></svg></span>
        <span className={styles.brandName}>Nival <strong>Pay</strong></span>
        <span className={styles.securePill}>Datos verificados</span>
      </div>
      <div className={styles.profile}>
        <div className={styles.logoWrap}>
          {profile.logo_url ? <Image src={profile.logo_url} alt={`Logotipo de ${profile.business_name}`} width={116} height={116} unoptimized priority={!embedded} /> : <span className={styles.monogram}>{initials || "N"}</span>}
        </div>
        <p className={styles.eyebrow}>Paga a</p>
        <h1 className={styles.businessTitle} id={embedded ? undefined : "payment-title"}>{profile.business_name}</h1>
        <p className={styles.paymentType}>Transferencia bancaria</p>
      </div>
      {profile.payment_url_visible && profile.payment_url && <a className={styles.directPay} href={profile.payment_url} target="_blank" rel="noreferrer"><span>Pagar con enlace</span><b>↗</b></a>}
      <p className={styles.copyHint}>Toca cualquier dato para copiarlo</p>
      <div className={styles.details}>
        {profile.holder_visible && <CopyField label="Beneficiario" value={profile.account_holder} variant="detail" />}
        {profile.bank_visible && <CopyField label="Banco" value={profile.bank_name} variant="bank" />}
        {profile.clabe_visible && <CopyField label="CLABE interbancaria" value={profile.clabe} variant="clabe" trackingToken={trackingToken} />}
        {profile.concept_visible && profile.concept && <CopyField label="Concepto" value={profile.concept} variant="detail" />}
        {Array.isArray(profile.custom_sections) && profile.custom_sections.filter((section) => section.public !== false).map((section) =>
          section.title || section.content ? <CopyField key={section.id} label={section.title || "Información"} value={section.content || "—"} variant="detail" /> : null
        )}
      </div>
      <div className={styles.paymentSteps}><span><b>1</b> Copia la CLABE</span><span><b>2</b> Abre tu banco</span><span><b>3</b> Pega y verifica</span></div>
      <p className={styles.helpText}>Antes de transferir, confirma que el beneficiario coincida con el nombre mostrado arriba.</p>
    </section>
    {!embedded && profile.business_slug && <a className={styles.businessHubLink} href={`/p/${profile.business_slug}`}><span><small>MÁS DE {profile.business_name.toUpperCase()}</small><strong>Contacto, puntos y otros accesos del negocio</strong></span><b>→</b></a>}
    {!embedded && profile.points_enabled && profile.business_slug && <aside className={styles.loyaltyBridge}>
      <div><span>¿VIENES SEGUIDO?</span><strong>Esta compra también puede acercarte a una recompensa.</strong><p>Abre el programa de puntos de {profile.business_name} y guarda tu tarjeta digital.</p></div>
      <a href={`/b/${profile.business_slug}`}>Ver mis puntos <b>→</b></a>
    </aside>}
    {!embedded && <aside className={styles.nivalPromo} aria-label="Conoce Nival Tech">
      <div>
        <span>¿TÚ TAMBIÉN TIENES UN NEGOCIO?</span>
        <strong>Tu negocio también puede cobrar así.</strong>
        <p>Nival Pay incluye tarjeta NFC, QR y una página de cobro editable por $199 MXN, pago único.</p>
      </div>
      <a href="/?from=nival-pay#precio">Ver Nival Pay · $199 <b>→</b></a>
    </aside>}
    <footer className={styles.footer}><span>Experiencia creada con <strong>Nival Pay</strong></span>{!embedded && <a href="/?from=nival-pay">Nival Tech</a>}</footer>
  </>;

  if (embedded) {
    return <div className={`${styles.pageShell} ${styles.embeddedShell}`}>{content}</div>;
  }

  return content;
}
