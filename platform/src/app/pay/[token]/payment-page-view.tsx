"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CopyField } from "./copy-field";
import styles from "./payment-page.module.css";

export type PaymentPageSection = { id: string; title: string; content: string; public?: boolean };
export type PaymentPageViewProfile = {
  business_name: string; display_name?: string | null; business_slug?: string | null; logo_url?: string | null; brand_color?: string | null;
  account_holder: string; bank_name: string; clabe: string; concept?: string | null; payment_url?: string | null;
  holder_visible?: boolean; bank_visible?: boolean; clabe_visible?: boolean; concept_visible?: boolean; payment_url_visible?: boolean;
  custom_sections?: PaymentPageSection[] | null;
};

type InlineEditor = {
  holder: string; bank: string; clabe: string; concept: string; paymentUrl: string; demo?: boolean;
  onHolder: (value: string) => void; onBank: (value: string) => void; onClabe: (value: string) => void;
  onConcept: (value: string) => void; onPaymentUrl: (value: string) => void;
};

const editFieldStyle: CSSProperties = { width: '100%', border: 0, outline: 0, background: 'transparent', color: 'inherit', font: 'inherit', fontWeight: 750, padding: 0, margin: 0 };
const editBoxStyle: CSSProperties = { display: 'grid', gap: 7, padding: '17px 18px', border: '1px solid rgba(25,27,31,.12)', borderRadius: 18, background: 'rgba(255,255,255,.78)' };
const editLabelStyle: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: '.02em', color: '#74736f' };

export function PaymentPageView({ profile, embedded = false, preview = false, trackingToken, editor, contactUrl }: { profile: PaymentPageViewProfile; embedded?: boolean; preview?: boolean; trackingToken?: string; editor?: InlineEditor; contactUrl?: string }) {
  const initials = profile.business_name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const publicSections = Array.isArray(profile.custom_sections) ? profile.custom_sections.filter((section) => section.public !== false && section.content.trim().length > 0) : [];
  const editField = (label: string, value: string, onChange: (value: string) => void, placeholder = '') => <label style={editBoxStyle}><span style={editLabelStyle}>✎ {label} · editar</span><input className="nivalPayPreviewInput" style={editFieldStyle} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;

  const content = <>
    <section className={embedded ? `${styles.payCard} ${styles.embeddedCard}` : styles.payCard} style={{ "--blue": profile.brand_color || "#18784c" } as CSSProperties} aria-labelledby={embedded ? undefined : "payment-title"}>
      <div className={styles.brandRow}><span className={styles.brandMark} aria-hidden="true"><svg viewBox="0 0 28 28"><path d="M14 2.4 24 8.2v11.6L14 25.6 4 19.8V8.2L14 2.4Z"/><path d="m9.2 16.5 3.1 3.1 6.7-8"/></svg></span><span className={styles.brandName}>Nival <strong>Pay</strong></span><span className={styles.securePill}>Datos del negocio</span></div>
      <div className={styles.profile}><div className={styles.logoWrap}>{profile.logo_url ? <Image src={profile.logo_url} alt={`Logotipo de ${profile.business_name}`} width={116} height={116} unoptimized priority={!embedded} /> : <span className={styles.monogram}>{initials || "N"}</span>}</div><p className={styles.eyebrow}>Paga a</p><h1 className={styles.businessTitle} id={embedded ? undefined : "payment-title"}>{profile.display_name || profile.business_name}</h1><p className={styles.paymentType}>Transferencia bancaria</p></div>
      {!editor && profile.payment_url_visible && profile.payment_url && <a className={styles.directPay} href={profile.payment_url} target="_blank" rel="noreferrer"><span>Pagar con enlace</span><b>↗</b></a>}
      <div className={styles.paymentSteps}><span><b>1</b> Copia la CLABE</span><span><b>2</b> Abre tu banco</span><span><b>3</b> Pega y verifica</span></div>
      <p className={styles.helpText}>Antes de transferir, confirma que el beneficiario coincida con el nombre mostrado arriba.</p>
      <p className={styles.copyHint}>{editor ? editor.demo ? '✎ Toca un dato para editarlo · esta demo no guarda cambios' : '✎ Toca un dato para editarlo · se guarda automáticamente' : 'Toca cualquier dato para copiarlo'}</p>
      <div className={styles.details}>
        {editor ? <>
          {profile.holder_visible && editField('Beneficiario', editor.holder, editor.onHolder)}
          {profile.bank_visible && editField('Banco', editor.bank, editor.onBank)}
          {profile.clabe_visible && editField('CLABE interbancaria', editor.clabe, (value) => editor.onClabe(value.replace(/[^0-9 ]/g, '').slice(0, 23)))}
          {profile.concept_visible && editField('Concepto', editor.concept, editor.onConcept, 'Opcional')}
          {profile.payment_url_visible && editField('Enlace de pago', editor.paymentUrl, editor.onPaymentUrl, 'https://...')}
        </> : <>
          {profile.holder_visible && <CopyField label="Beneficiario" value={profile.account_holder} variant="detail" />}
          {profile.bank_visible && <CopyField label="Banco" value={profile.bank_name} variant="bank" />}
          {profile.clabe_visible && <CopyField label="CLABE interbancaria" value={profile.clabe} variant="clabe" trackingToken={trackingToken} />}
          {profile.concept_visible && profile.concept && <CopyField label="Concepto" value={profile.concept} variant="detail" />}
        </>}
        {publicSections.map((section) => { const label = section.title.trim() || "Información"; const value = section.content.trim(); const isHttpsLink = /^https:\/\//i.test(value); return isHttpsLink ? <a key={section.id} className={styles.customSectionLink} href={value} target="_blank" rel="noreferrer"><span><small>{label}</small><strong>Abrir enlace</strong></span><b aria-hidden="true">↗</b></a> : <CopyField key={section.id} label={label} value={value} variant="detail" />; })}
      </div>
    </section>
    {!embedded && <aside className={styles.nivalPromo} aria-label="Conoce Nival Tech"><div><span>¿TÚ TAMBIÉN TIENES UN NEGOCIO?</span><strong>Tu negocio también puede cobrar así.</strong><p>Una forma simple de compartir tus datos de cobro con QR, NFC y una página siempre actualizada.</p></div>{contactUrl ? <a href={contactUrl} target="_blank" rel="noreferrer">Contactar por WhatsApp <b>→</b></a> : <Link href="/?from=nival-pay">Conocer Nival Tech <b>→</b></Link>}</aside>}
    <footer className={styles.footer}><span>Experiencia creada con <strong>Nival Pay</strong></span>{!embedded && <Link href="/?from=nival-pay">Nival Tech</Link>}</footer>
  </>;
  if (embedded) return <div className={`${styles.pageShell} ${styles.embeddedShell}${preview ? ` ${styles.compactPreview}` : ''}`}>{content}</div>;
  return content;
}
