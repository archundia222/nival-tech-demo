import type { Metadata } from "next";
import "./globals.css";
import { CookieConsent } from "./cookie-consent";
const siteUrl=process.env.NEXT_PUBLIC_SITE_URL??"https://nival-tech-platform.vercel.app";
export const metadata:Metadata={metadataBase:new URL(siteUrl),title:{default:"Tocario | Cobra fácil. Fideliza clientes. Crece.",template:"%s | Tocario"},description:"Tecnología simple para negocios locales: cobra con Tocario Pay, consigue más reseñas con Tocario Reseñas y fideliza clientes con Tocario Puntos.",applicationName:"Tocario",icons:{icon:"/wallet/tocario-logo.svg"},openGraph:{title:"Tocario | Cobra fácil. Fideliza clientes. Crece.",description:"Tocario ayuda a negocios locales a cobrar con menos fricción, conseguir más reseñas y hacer que sus clientes regresen.",siteName:"Tocario",locale:"es_MX",type:"website"},twitter:{card:"summary_large_image",title:"Tocario | Cobra fácil. Fideliza clientes. Crece.",description:"Tocario Pay · Tocario Reseñas · Tocario Puntos."}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="es"><body>{children}<CookieConsent/></body></html>}
