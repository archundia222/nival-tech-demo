import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/server";
import { CopyField } from "./copy-field";

interface PaymentPageProps {
  params: Promise<{ token: string }>;
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_payment_profile", { profile_token: token });
  if (error || !data?.[0]) notFound();
  const profile = data[0];

  return <main className="customerShell brandedCustomerShell" style={{ "--business-accent": profile.brand_color } as CSSProperties}>
    <header className="customerBrand">
      {profile.logo_url ? <img className="businessLogo" src={profile.logo_url} alt={`Logo de ${profile.business_name}`} /> : <span className="brandmark">N</span>}
      <span>Datos protegidos por <b>NIVAL tech</b></span>
    </header>
    <section className="paymentHero">
      <p className="eyebrow">DATOS PARA TRANSFERENCIA</p>
      <h1>{profile.business_name}</h1>
      <p>Verifica el nombre del titular antes de confirmar tu transferencia.</p>
    </section>
    <section className="paymentCard">
      <CopyField label="Titular" value={profile.account_holder} />
      <CopyField label="Banco" value={profile.bank_name} />
      <CopyField label="CLABE" value={profile.clabe} />
    </section>
    <p className="securityNotice">Nival Tech nunca solicitará NIP, CVV, contraseña ni códigos de seguridad.</p>
  </main>;
}
