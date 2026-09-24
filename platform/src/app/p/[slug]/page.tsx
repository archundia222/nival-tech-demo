import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfilePublicView, type ProfileActionItem } from "./profile-public-view";

interface DigitalProfilePageProps { params: Promise<{ slug: string }> }

type PublicLink = { link_name: string; link_kind: 'google_review' | 'website' | 'custom'; public_token: string };

export default async function DigitalProfilePage({ params }: DigitalProfilePageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const [{ data: businesses, error }, { data: links }, { data: payments }] = await Promise.all([
    supabase.rpc("get_public_business_v3", { business_slug: slug }),
    supabase.rpc("get_public_profile_links", { business_slug: slug }),
    supabase.rpc("get_public_profile_payment", { business_slug: slug }),
  ]);
  if (error || !businesses?.[0]) notFound();
  const business = businesses[0];
  const payment = payments?.[0];
  const customLinks = (links ?? []) as PublicLink[];
  const hasWebsiteLink = customLinks.some((link) => link.link_kind === 'website');
  const hasReviewLink = customLinks.some((link) => link.link_kind === 'google_review');

  const actions: ProfileActionItem[] = [
    ...(payment ? [{ key: `payment-${payment.public_token}`, label: "Pagar", description: "Ver datos para transferir", href: `/pay/${payment.public_token}`, icon: "＄", featured: true }] : []),
    ...(business.points_enabled ? [{ key: "loyalty", label: "Mis puntos", description: "Ver puntos y recompensas", href: `/b/${business.slug}`, icon: "★" }] : []),
    ...(business.phone ? [{ key: "contact", label: "Llamar", description: "Contactar al negocio", href: `tel:${business.phone}`, icon: "☎" }] : []),
    ...(hasReviewLink ? [{ key: "reviews", label: "Reseñas", description: "Califica tu experiencia", href: `/r/${business.slug}`, icon: "☆" }] : []),
    ...(business.website_url && !hasWebsiteLink ? [{ key: "website", label: "Sitio web", description: "Información y servicios", href: business.website_url, icon: "↗", external: true }] : []),
    ...customLinks.filter((link) => link.link_kind !== 'google_review').map((link) => ({
      key: link.public_token,
      label: link.link_kind === 'website' ? 'Sitio web' : link.link_name,
      description: link.link_kind === 'website' ? 'Información y servicios' : 'Abrir enlace',
      href: `/go/${link.public_token}`,
      icon: '↗',
      external: true,
    })),
  ];

  return <ProfilePublicView businessName={business.business_name} slug={business.slug} description={business.description} logoUrl={business.logo_url} brandColor={business.brand_color} phone={business.phone} websiteUrl={business.website_url} actions={actions} />;
}
