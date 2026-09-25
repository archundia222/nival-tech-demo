"use client";

import Image from "next/image";
import Link from "next/link";
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

  const publicSections = Array.isArray(profile.custom_sections)
    ? profile.custom_sections.filter((section) => section.public !== false && section.content.trim().length > 0)
    : [];

  const content = <>
    <section className={embedded ? `${styles.payCard} ${styles.embeddedCard}` : styles.payCard} style={{ "--blue": profile.brand_color || "#b89a5a" } as CSSProperties} aria-labelledby={embedded ? undefined : "payment-title"}>
      <div className={styles.brandRow}>
        <span className={styles.brandMark} aria-hidden="true"><svg viewBox="0 0 28 28"><path d="M14 2.4 24 8.2v11.6L14 25.6 4 19.8V8.2L14 2.4Z"/><path d="m9.2 16.5 3.1 3.1 6.7-8"/></svg></span>
        <span className={styles.brandName}>Nival <strong>Pay</strong></span>
        <span className={styles.securePill}>Datos del negocio</span>
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
        {publicSections.map((section) => {
          const label = section.title.trim() || "Información";
          const value = section.content.trim();
          const isHttpsLink = /^https:\/\//i.test(value);
          return isHttpsLink
            ? <a key={section.id} className={styles.customSectionLink} href={value} target="_blank" rel="noreferrer"><span><small>{label}</small><strong>Abrir enlace</strong></span><b aria-hidden="true">↗</b></a>
            : <CopyField key={section.id} label={label} value={value} variant="detail" />;
        })}
      </div>
      <div className={styles.paymentSteps}><span><b>1</b> Copia la CLABE</span><span><b>2</b> Abre tu banco</span><span><b>3</b> Pega y verifica</span></div>
      <p className={styles.helpText}>Antes de transferir, confirma que el beneficiario coincida con el nombre mostrado arriba.</p>

      {!embedded && profile.business_slug && <div className={styles.cardExtras}>
        <div className={styles.extrasHeading}>
          <span>CONTINÚA CON {profile.business_name.toUpperCase()}</span>
          <small>Accesos útiles del negocio</small>
        </div>

        {profile.points_enabled && <Link className={`${styles.serviceAction} ${styles.loyaltyAction}`} href={`/b/${profile.business_slug}`}>
          <span className={styles.serviceIcon} aria-hidden="true">★</span>
          <span className={styles.serviceCopy}>
            <small>NIVAL PUNTOS</small>
            <strong>Tus puntos y recompensas</strong>
            <em>Guarda tu tarjeta digital y revisa tu avance.</em>
          </span>
          <b aria-hidden="true">→</b>
        </Link>}

        <Link className={styles.serviceAction} href={`/p/${profile.business_slug}`}>
          <span className={styles.serviceIcon} aria-hidden="true">+</span>
          <span className={styles.serviceCopy}>
            <small>MÁS DEL NEGOCIO</small>
            <strong>Contacto y otros accesos</strong>
            <em>Información, enlaces y formas de contactar.</em>
          </span>
          <b aria-hidden="true">→</b>
        </Link>
      </div>}
    </section>
    {!embedded && <aside className={styles.nivalPromo} aria-label="Conoce Nival Tech">
      <div>
        <span>¿TÚ TAMBIÉN TIENES UN NEGOCIO?</span>
        <strong>Tu negocio también puede cobrar así.</strong>
        <p>Una forma simple de compartir tus datos de cobro con QR, NFC y una página siempre actualizada.</p>
      </div>
      <Link href="/?from=nival-pay">Conocer Nival Tech <b>→</b></Link>
    </aside>}
    <footer className={styles.footer}><span>Experiencia creada con <strong>Nival Pay</strong></span>{!embedded && <Link href="/?from=nival-pay">Nival Tech</Link>}</footer>
  </>;

  if (embedded) {
    return <div className={`${styles.pageShell} ${styles.embeddedShell}`}>{content}</div>;
  }

  return content;
}
