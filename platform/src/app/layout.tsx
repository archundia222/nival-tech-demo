import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nival Tech | Cobra con un toque",
  description: "Nival Pay convierte una tarjeta NFC en la página de pago de tu negocio. Incluye tarjeta física, página configurable, QR y 3 apartados por $199 MXN.",
  icons: { icon: "/wallet/nival-logo.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
