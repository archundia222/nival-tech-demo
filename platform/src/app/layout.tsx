import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nival Tech Platform",
  description: "Lealtad digital e inteligencia comercial para negocios.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
