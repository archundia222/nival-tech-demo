import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { isHttpsUrl } from "@/lib/payment-profile";
import { CopyField } from "./copy-field";

export const metadata = { robots: { index: false, follow: false } };

interface PaymentPageProps {
  params: Promise<{ token: string }>;
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_payment_profile_v2", { profile_token: token });
  if (error || !data?.[0]) notFound();
  const profile = data[0];

  const paymentUrl = profile.payment_url && isHttpsUrl(profile.payment_url) ? profile.payment_url : null;
  const initials = profile.business_name.split(/\s+/).slice(0, 2).map((word: string) => word[0]).join("").toUpperCase();

  return <main className="paymentPage">
    <section className="paymentPageCard">
      <header className="paymentPageBrand">
        {profile.logo_url
          ? <Image className="paymentPageImage" src={profile.logo_url} alt={`Imagen de ${profile.business_name}`} width={148} height={148} unoptimized priority />
          : <span className="paymentPageImage paymentPageMonogram">{initials || "N"}</span>}
        <h1>{profile.business_name}</h1>
        <p>Elige cómo quieres pagar</p>
      </header>

      {paymentUrl && <a className="paymentDirectButton" href={paymentUrl} target="_blank" rel="noopener noreferrer">Pagar ahora <span aria-hidden="true">↗</span></a>}
      {paymentUrl && <div className="paymentDivider"><span>o transferencia bancaria</span></div>}

      <section className="paymentTransferSection">
        <h2>Datos para transferencia</h2>
        <div className="paymentCard">
          <CopyField label="Banco" value={profile.bank_name} />
          <CopyField label="Beneficiario" value={profile.account_holder} />
          <CopyField label="CLABE interbancaria" value={profile.clabe} prominent />
          {profile.concept && <CopyField label="Concepto" value={profile.concept} prominent />}
        </div>
      </section>

      <p className="securityNotice">Verifica los datos del beneficiario antes de realizar la transferencia. Nival Tech nunca solicitará NIP, CVV, contraseña ni códigos de seguridad.</p>
      <footer className="paymentPoweredBy">Powered by <strong>NIVAL TECH</strong></footer>
    </section>
  </main>;
}
