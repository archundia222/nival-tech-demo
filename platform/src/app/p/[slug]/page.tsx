import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/server";

interface DigitalProfilePageProps {
  params: Promise<{ slug: string }>;
}

export default async function DigitalProfilePage({ params }: DigitalProfilePageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const [{ data: businesses, error }, { data: links }, { data: payments }] = await Promise.all([
    supabase.rpc("get_public_business_v2", { business_slug: slug }),
    supabase.rpc("get_public_profile_links", { business_slug: slug }),
    supabase.rpc("get_public_profile_payment", { business_slug: slug }),
  ]);

  if (error || !businesses?.[0]) notFound();
  const business = businesses[0];
  const payment = payments?.[0];

  return <main className="profileShell brandedCustomerShell" style={{ "--business-accent": business.brand_color } as CSSProperties}>
    <header className="profileHeader">
      {business.logo_url ? <img className="profileLogo" src={business.logo_url} alt={`Logo de ${business.business_name}`} /> : <span className="profileFallback">{business.business_name.slice(0, 1)}</span>}
      <p className="eyebrow">PERFIL DIGITAL</p>
      <h1>{business.business_name}</h1>
      <p>{business.description ?? "Encuentra aquí todos nuestros enlaces y formas de contacto."}</p>
    </header>

    <section className="profileLinks">
      {business.phone && <a href={`tel:${business.phone}`}>Llamar al negocio<span>→</span></a>}
      {business.website_url && <a href={business.website_url} target="_blank" rel="noreferrer">Visitar sitio web<span>→</span></a>}
      {links?.map((link: { link_name: string; public_token: string }) => <a key={link.public_token} href={`/go/${link.public_token}`} target="_blank" rel="noreferrer">
        {link.link_name}<span>→</span>
      </a>)}
      {payment && <a href={`/pay/${payment.public_token}`}>Datos para transferencia<span>→</span></a>}
      <a href={`/b/${business.slug}`}>Tarjeta de lealtad<span>→</span></a>
    </section>

    <footer className="profileFooter">Perfil creado con <b>NIVAL tech</b></footer>
  </main>;
}
