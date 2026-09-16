import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nival Tech | Cobra con un toque",
  description: "Nival Pay convierte una tarjeta NFC en la página de pago de tu negocio. Tarjeta y página configurada por $199 MXN, sin mensualidad.",
  icons: { icon: "/wallet/nival-logo.png", apple: "/wallet/nival-logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
