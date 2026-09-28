import Link from 'next/link';
import { LandingTabs } from '@/app/landing-tabs';
import '../../v2-landing.css';
export const metadata = { title: 'Demo de Cards | Tocvia', robots: { index: false, follow: false } };
export default function CardsDemo() { return <main className="nv2 nv3 nv3DemoPage"><nav className="nv2Nav"><Link className="nv2Brand" href="/">← Tocvia</Link><Link className="nv2Button" href="/auth?mode=signup">Empezar prueba</Link></nav><section className="nv2Section"><span className="nv2Eyebrow">DEMO DE CARDS</span><h1>Así se verían tus accesos.</h1><p>Elige Pay, Reseñas o WiFi. Esta vista usa datos de ejemplo y no se conecta a un negocio real.</p><LandingTabs/><p>En Pay el cliente copia tu CLABE y paga desde su banco. Reseñas abre tu enlace de Google. WiFi muestra la red y la contraseña para copiarlas.</p><Link className="nv2Button" href="/auth?mode=signup">Probar con mis datos</Link></section></main>; }
