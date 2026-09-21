import Image from "next/image";
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
  verifiedLabel = "Perfil oficial",
  embedded = false,
  showQuickActions = true,
  showFooter = true,
}: ProfilePublicViewProps) {
  return (
    <div
      className={embedded ? "profileExperience profileDashboardShared" : "profileExperience brandedCustomerShell"}
      style={{ "--business-accent": brandColor || "#b99750" } as CSSProperties}
    >
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
          {showQuickActions && (phone || websiteUrl) && <div className="profileQuickActions">
            {phone && <a href={`tel:${phone}`}><span aria-hidden="true">☎</span><b>Llamar</b></a>}
            {websiteUrl && <a href={websiteUrl} target="_blank" rel="noreferrer"><span aria-hidden="true">↗</span><b>Sitio web</b></a>}
          </div>}
        </header>

        <section className="profileActionSection" aria-labelledby={embedded ? undefined : "profile-actions"}>
          {!embedded && <div className="profileSectionHeading"><span>Todo lo que necesitas</span><h2 id="profile-actions">¿Qué deseas hacer?</h2></div>}
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
        </section>

        {showFooter && <footer className="profileFooter"><span>Información proporcionada por el negocio</span><b>NIVAL tech</b></footer>}
      </article>
    </div>
  );
}
