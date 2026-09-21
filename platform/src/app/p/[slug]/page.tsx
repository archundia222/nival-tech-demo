import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfilePublicView, type ProfileActionItem } from "./profile-public-view";

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

  const actions: ProfileActionItem[] = [
    ...(payment ? [{
      key: `payment-${payment.public_token}`,
      label: "Datos para transferencia",
      description: "Consulta banco, titular y CLABE",
      href: `/pay/${payment.public_token}`,
      icon: "＄",
      featured: true,
    }] : []),
    {
      key: "loyalty",
      label: "Tarjeta de lealtad",
      description: "Regístrate, acumula puntos y consulta premios",
      href: `/b/${business.slug}`,
      icon: "★",
    },
    ...customLinks.map((link: { link_name: string; public_token: string }) => ({
      key: link.public_token,
      label: link.link_name,
      description: "Abrir enlace",
      href: `/go/${link.public_token}`,
      icon: "↗",
      external: true,
    })),
  ];

  return <ProfilePublicView
    businessName={business.business_name}
    slug={business.slug}
    description={business.description}
    logoUrl={business.logo_url}
    brandColor={business.brand_color}
    phone={business.phone}
    websiteUrl={business.website_url}
    actions={actions}
  />;
}
