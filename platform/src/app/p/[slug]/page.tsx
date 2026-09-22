import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfilePublicView, type ProfileActionItem } from "./profile-public-view";

interface DigitalProfilePageProps { params: Promise<{ slug: string }> }

type PublicLink = { link_name: string; link_kind: 'google_review' | 'website' | 'custom'; public_token: string };

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
  const customLinks = (links ?? []) as PublicLink[];
  const hasWebsiteLink = customLinks.some((link) => link.link_kind === 'website');

  const actions: ProfileActionItem[] = [
    ...(payment ? [{ key: `payment-${payment.public_token}`, label: "Pago", description: "Datos para transferencia", href: `/pay/${payment.public_token}`, icon: "＄", featured: true }] : []),
    { key: "loyalty", label: "Lealtad", description: "Puntos y recompensas", href: `/b/${business.slug}`, icon: "★" },
    ...(business.phone ? [{ key: "contact", label: "Contacto", description: "Llamar al negocio", href: `tel:${business.phone}`, icon: "☎" }] : []),
    ...(business.website_url && !hasWebsiteLink ? [{ key: "website", label: "Sitio web", description: "Información y servicios", href: business.website_url, icon: "↗", external: true }] : []),
    ...customLinks.map((link) => ({
      key: link.public_token,
      label: link.link_kind === 'google_review' ? 'Reseñas' : link.link_kind === 'website' ? 'Sitio web' : link.link_name,
      description: link.link_kind === 'google_review' ? 'Califica tu experiencia' : link.link_kind === 'website' ? 'Información y servicios' : 'Abrir enlace',
      href: `/go/${link.public_token}`,
      icon: link.link_kind === 'google_review' ? '☆' : '↗',
      external: true,
    })),
  ];

  return <ProfilePublicView businessName={business.business_name} slug={business.slug} description={business.description} logoUrl={business.logo_url} brandColor={business.brand_color} phone={business.phone} websiteUrl={business.website_url} actions={actions} />;
}
