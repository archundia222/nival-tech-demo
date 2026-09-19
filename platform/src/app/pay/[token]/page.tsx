import { notFound } from "next/navigation";
import Image from "next/image";
import { DM_Sans, Manrope } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { CopyField } from "./copy-field";
import styles from "./payment-page.module.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-pay-body" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-pay-display" });
export const metadata = { robots: { index: false, follow: false } };

interface PaymentPageProps { params: Promise<{ token: string }>; }

export default async function PaymentPage({ params }: PaymentPageProps) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_payment_profile_v2", { profile_token: token });
  if (error || !data?.[0]) notFound();
  const profile = data[0];
  const initials = profile.business_name.split(/\s+/).slice(0,2).map((word:string)=>word[0]).join("").toUpperCase();

  return <main className={`${styles.pageShell} ${dmSans.variable} ${manrope.variable}`}>
    <section className={styles.payCard} aria-labelledby="payment-title">
      <div className={styles.brandRow}>
        <span className={styles.brandMark} aria-hidden="true"><svg viewBox="0 0 28 28"><path d="M14 2.4 24 8.2v11.6L14 25.6 4 19.8V8.2L14 2.4Z"/><path d="m9.2 16.5 3.1 3.1 6.7-8"/></svg></span>
        <span className={styles.brandName}>Nival <strong>Pay</strong></span>
        <span className={styles.securePill}>Datos verificados</span>
      </div>
      <div className={styles.profile}>
        <div className={styles.logoWrap}>
          {profile.logo_url ? <Image src={profile.logo_url} alt={`Logotipo de ${profile.business_name}`} width={116} height={116} unoptimized priority /> : <span className={styles.monogram}>{initials || "N"}</span>}
        </div>
        <p className={styles.eyebrow}>Realiza tu transferencia a</p>
        {profile.holder_visible && <CopyField label="Beneficiario" value={profile.account_holder} variant="name" />}
      </div>
      <div className={styles.details}>
        {profile.bank_visible && <CopyField label="Banco" value={profile.bank_name} variant="bank" />}
        {profile.clabe_visible && <CopyField label="CLABE interbancaria" value={profile.clabe} variant="clabe" />}
        {profile.concept_visible && profile.concept && <CopyField label="Concepto" value={profile.concept} variant="detail" />}
        {profile.payment_url_visible && profile.payment_url && <CopyField label="Enlace de pago" value={profile.payment_url} variant="detail" />}
        {Array.isArray(profile.custom_sections) && profile.custom_sections.filter((s:{public?:boolean})=>s.public !== false).map((s:{id:string;title:string;content:string}) =>
          s.title || s.content ? <CopyField key={s.id} label={s.title || "Información"} value={s.content || "—"} variant="detail" /> : null
        )}
      </div>
      <p className={styles.helpText}>Verifica que el nombre del destinatario coincida antes de transferir.</p>
    </section>
    <footer className={styles.footer}>Pago fácil y seguro con <strong>Nival Pay</strong></footer>
  </main>;
}
