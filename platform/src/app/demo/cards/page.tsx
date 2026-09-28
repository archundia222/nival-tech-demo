import Link from 'next/link';
import localFont from 'next/font/local';
import { CardsDemo } from './cards-demo';
import '../../v2-landing.css';
const sora = localFont({ src: '../../../fonts/sora-latin-700.woff2', weight: '700', variable: '--nv2-font-title', display: 'swap' });
const inter = localFont({ src: [{ path: '../../../fonts/inter-latin-400.woff2', weight: '400' }, { path: '../../../fonts/inter-latin-700.woff2', weight: '700' }], variable: '--nv2-font-body', display: 'swap' });
export const metadata = { title: 'Demo de Cards | Toke', robots: { index: false, follow: false } };
export default function CardsDemoPage() { return <main className={`nv2 nv3 nv3DemoPage ${sora.variable} ${inter.variable}`}><nav className="nv2Nav"><Link className="nv2Brand" href="/">← Toke</Link><span className="nv5DemoNavLabel">DEMO INTERACTIVA</span></nav><section className="nv2Section"><span className="nv2Eyebrow">DEMO DE CARDS</span><h1>Así se verían tus accesos.</h1><p>Recorre el panel como dueño del negocio: configura Pay, conecta Reseñas y prepara WiFi. Luego mira qué ve tu cliente. Los cambios de esta demo no se guardan.</p><CardsDemo/></section></main>; }
