import { notFound } from "next/navigation";
import Image from "next/image";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/server";

interface DigitalProfilePageProps { params: Promise<{ slug: string }> }

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
  const customLinks = links ?? [];

  return <main className="profileShell profileExperience brandedCustomerShell" style={{ "--business-accent": business.brand_color || "#b99750" } as CSSProperties}>
    <div className="profileAmbient" aria-hidden="true" />
    <article className="profileCard">
      <header className="profileHeader">
        <div className="profileIdentity">
          {business.logo_url
            ? <Image className="profileLogo" src={business.logo_url} alt={`Logo de ${business.business_name}`} width={88} height={88} unoptimized />
            : <span className="profileFallback">{business.business_name.slice(0, 1)}</span>}
          <div><span className="profileVerified">Perfil oficial</span><h1>{business.business_name}</h1></div>
        </div>
        <p className="profileDescription">{business.description ?? "Información, contacto y formas de pago en un solo lugar."}</p>
        {(business.phone || business.website_url) && <div className="profileQuickActions">
          {business.phone && <a href={`tel:${business.phone}`}><span aria-hidden="true">☎</span><b>Llamar</b></a>}
          {business.website_url && <a href={business.website_url} target="_blank" rel="noreferrer"><span aria-hidden="true">↗</span><b>Sitio web</b></a>}
        </div>}
      </header>

      <section className="profileActionSection" aria-labelledby="profile-actions">
        <div className="profileSectionHeading"><span>Todo lo que necesitas</span><h2 id="profile-actions">¿Qué deseas hacer?</h2></div>
        <div className="profileLinks">
          {payment && <a className="profileLink featured" href={`/pay/${payment.public_token}`}><span className="profileLinkIcon" aria-hidden="true">＄</span><span><b>Datos para transferencia</b><small>Consulta banco, titular y CLABE</small></span><i aria-hidden="true">→</i></a>}
          <a className="profileLink" href={`/b/${business.slug}`}><span className="profileLinkIcon" aria-hidden="true">★</span><span><b>Tarjeta de lealtad</b><small>Regístrate, acumula puntos y consulta premios</small></span><i aria-hidden="true">→</i></a>
          {customLinks.map((link: { link_name: string; public_token: string }) => <a className="profileLink" key={link.public_token} href={`/go/${link.public_token}`} target="_blank" rel="noreferrer"><span className="profileLinkIcon" aria-hidden="true">↗</span><span><b>{link.link_name}</b><small>Abrir enlace</small></span><i aria-hidden="true">→</i></a>)}
        </div>
      </section>

      <footer className="profileFooter"><span>Información proporcionada por el negocio</span><b>NIVAL tech</b></footer>
    </article>
  </main>;
}
