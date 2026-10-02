import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CookieConsent } from "./cookie-consent";
const siteUrl=process.env.NEXT_PUBLIC_SITE_URL??"https://nival-tech-platform.vercel.app";
export const viewport:Viewport={themeColor:'#f1f8f3'};
export const metadata:Metadata={metadataBase:new URL(siteUrl),title:{default:"Nival Tech | Nival Pay · Datos de cobro en un toque.",template:"%s | Nival Tech"},description:"Comparte los datos de cobro de tu negocio con Nival Pay: tarjeta NFC, QR y enlace.",applicationName:"Nival Tech",icons:{icon:"/wallet/nival-logo.svg"},openGraph:{title:"Nival Tech | Nival Pay · Datos de cobro en un toque.",description:"Nival Pay facilita compartir titular, banco, CLABE y concepto para recibir transferencias.",siteName:"Nival Tech",locale:"es_MX",type:"website"},twitter:{card:"summary_large_image",title:"Nival Tech | Nival Pay · Datos de cobro en un toque.",description:"Nival Pay · Tarjeta NFC, QR y enlace."}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="es"><body>{children}<CookieConsent/></body></html>}
