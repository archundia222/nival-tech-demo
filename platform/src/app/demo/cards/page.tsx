import Link from 'next/link';
import localFont from 'next/font/local';
import { CardsDemo } from './cards-demo';
import '../../v2-landing.css';
const sora = localFont({ src: '../../../fonts/sora-latin-700.woff2', weight: '700', variable: '--nv2-font-title', display: 'swap' });
const inter = localFont({ src: [{ path: '../../../fonts/inter-latin-400.woff2', weight: '400' }, { path: '../../../fonts/inter-latin-700.woff2', weight: '700' }], variable: '--nv2-font-body', display: 'swap' });
export const metadata = { title: 'Demo de Cards | Tocvia', robots: { index: false, follow: false } };
export default function CardsDemoPage() { return <main className={`nv2 nv3 nv3DemoPage ${sora.variable} ${inter.variable}`}><nav className="nv2Nav"><Link className="nv2Brand" href="/">← Tocvia</Link><Link className="nv2Button" href="/auth?mode=signup">Empezar prueba</Link></nav><section className="nv2Section"><span className="nv2Eyebrow">DEMO DE CARDS</span><h1>Así se verían tus accesos.</h1><p>Prueba los tres apartados con datos ficticios. La vista de Pay usa el mismo componente que la página pública del producto.</p><CardsDemo/><Link className="nv2Button" href="/auth?mode=signup">Probar con mis datos</Link></section></main>; }
