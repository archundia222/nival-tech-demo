import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CookieConsent } from "./cookie-consent";
const siteUrl=process.env.NEXT_PUBLIC_SITE_URL??"https://nival-tech-platform.vercel.app";
export const viewport:Viewport={themeColor:'#f1f8f3'};
export const metadata:Metadata={metadataBase:new URL(siteUrl),title:{default:"Nival Tech | Cobra fácil. Fideliza clientes. Crece.",template:"%s | Nival Tech"},description:"Tecnología simple para negocios locales: cobra con Nival Pay, consigue más reseñas con Nival Reseñas y fideliza clientes con Nival Puntos.",applicationName:"Nival Tech",icons:{icon:"/wallet/nival-logo.svg"},openGraph:{title:"Nival Tech | Cobra fácil. Fideliza clientes. Crece.",description:"Nival ayuda a negocios locales a cobrar con menos fricción, conseguir más reseñas y hacer que sus clientes regresen.",siteName:"Nival Tech",locale:"es_MX",type:"website"},twitter:{card:"summary_large_image",title:"Nival Tech | Cobra fácil. Fideliza clientes. Crece.",description:"Nival Pay · Nival Reseñas · Nival Puntos."}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="es"><body>{children}<CookieConsent/></body></html>}
