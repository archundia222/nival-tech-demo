import type { Metadata } from "next";
import "./globals.css";
import { EssentialCookieNotice } from "./essential-cookie-notice";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nival-tech-platform.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Nival Tech | Cobra, haz que vuelvan y crece",
    template: "%s | Nival Tech",
  },
  description: "Herramientas simples para negocios: cobra mejor con Nival Pay, crea recurrencia con Nival Puntos y convierte actividad de clientes en acciones con Nival Intelligence.",
  applicationName: "Nival Tech",
  icons: { icon: "/wallet/nival-logo.svg" },
  openGraph: {
    title: "Nival Tech | Cobra, haz que vuelvan y crece",
    description: "Nival ayuda a negocios a cobrar mejor, crear recurrencia y decidir qué hacer para crecer.",
    siteName: "Nival Tech",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nival Tech | Cobra, haz que vuelvan y crece",
    description: "Cobra mejor, haz que tus clientes vuelvan y convierte actividad en acciones.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><a className="skipLink" href="#main-content">Saltar al contenido principal</a>{children}<EssentialCookieNotice /></body>
    </html>
  );
}
