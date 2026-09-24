import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nival-tech-platform.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Nival Tech | Cobra, haz que vuelvan y crece",
    template: "%s | Nival Tech",
  },
  description: "Tecnología simple para negocios locales: cobra con Nival Pay, fideliza con Nival Puntos y convierte la actividad de tu programa en acciones con Nival Intelligence.",
  applicationName: "Nival Tech",
  icons: { icon: "/wallet/nival-logo.svg" },
  openGraph: {
    title: "Nival Tech | Cobra, haz que vuelvan y crece",
    description: "Nival ayuda a negocios locales a cobrar, fidelizar clientes y convertir la actividad de su programa en acciones concretas.",
    siteName: "Nival Tech",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nival Tech | Cobra, haz que vuelvan y crece",
    description: "Cobra con Nival Pay, fideliza con Nival Puntos y convierte la actividad de tus clientes en acciones.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
