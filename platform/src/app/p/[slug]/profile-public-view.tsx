import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

export type ProfileActionItem = {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: string;
  featured?: boolean;
  external?: boolean;
};

interface ProfilePublicViewProps {
  businessName: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  actions: ProfileActionItem[];
  verifiedLabel?: string;
  embedded?: boolean;
  showQuickActions?: boolean;
  showFooter?: boolean;
}

export function ProfilePublicView({
  businessName,
  description,
  logoUrl,
  brandColor,
  phone,
  websiteUrl,
  actions,
  verifiedLabel = "Perfil del negocio",
  embedded = false,
  showQuickActions = true,
  showFooter = true,
}: ProfilePublicViewProps) {
  const actionHrefs = new Set(actions.map((item) => item.href));
  const card = <>
      {!embedded && <div className="profileAmbient" aria-hidden="true" />}
      <article className="profileCard">
        <header className="profileHeader">
          <div className="profileIdentity">
            {logoUrl
              ? <Image className="profileLogo" src={logoUrl} alt={`Logo de ${businessName}`} width={88} height={88} unoptimized />
              : <span className="profileFallback">{businessName.slice(0, 1)}</span>}
            <div><span className="profileVerified">{verifiedLabel}</span><h1>{businessName}</h1></div>
          </div>
          <p className="profileDescription">{description ?? "Información, contacto y formas de pago en un solo lugar."}</p>
          {showQuickActions && ((phone && !actionHrefs.has(`tel:${phone}`)) || (websiteUrl && !actionHrefs.has(websiteUrl))) && <div className="profileQuickActions">
            {phone && !actionHrefs.has(`tel:${phone}`) && <a href={`tel:${phone}`}><span aria-hidden="true">☎</span><b>Llamar</b></a>}
            {websiteUrl && !actionHrefs.has(websiteUrl) && <a href={websiteUrl} target="_blank" rel="noreferrer"><span aria-hidden="true">↗</span><b>Sitio web</b></a>}
          </div>}
        </header>

        {actions.length > 0 && <section className="profileActionSection" aria-labelledby={embedded ? undefined : "profile-actions"}>
          {!embedded && <div className="profileSectionHeading"><span>ACCESOS RÁPIDOS</span><h2 id="profile-actions">¿Qué necesitas?</h2></div>}
          <div className="profileLinks">
            {actions.map((item) => <a
              className={`profileLink${item.featured ? " featured" : ""}`}
              key={item.key}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
            >
              <span className="profileLinkIcon" aria-hidden="true">{item.icon}</span>
              <span><b>{item.label}</b><small>{item.description}</small></span>
              <i aria-hidden="true">→</i>
            </a>)}
          </div>
        </section>}

        {showFooter && <>
          <aside className="profileNivalPromo"><div><span>¿TIENES UN NEGOCIO?</span><strong>Tu negocio también puede tener una página así.</strong><p>Cobros, lealtad y herramientas para hacer crecer clientes frecuentes.</p></div><Link href="/?from=perfil-negocio#productos">Conocer Nival Tech →</Link></aside>
          <footer className="profileFooter"><span>Información proporcionada por el negocio</span><Link href="/?from=perfil-negocio"><b>NIVAL tech</b></Link></footer>
        </>}
      </article>
    </>;

  if (embedded) {
    return <div
      className="profileExperience profileDashboardShared"
      style={{ "--business-accent": brandColor || "#b99750" } as CSSProperties}
    >{card}</div>;
  }

  return <main
    className="profileShell profileExperience brandedCustomerShell"
    style={{ "--business-accent": brandColor || "#b99750" } as CSSProperties}
  >{card}</main>;
}