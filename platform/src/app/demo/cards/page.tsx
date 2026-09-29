import Link from 'next/link';
import localFont from 'next/font/local';
import { CardsDemo } from './cards-demo';
import '../../v2-landing.css';
const sora=localFont({src:'../../../fonts/sora-latin-700.woff2',weight:'700',variable:'--nv2-font-title',display:'swap'});
const inter=localFont({src:[{path:'../../../fonts/inter-latin-400.woff2',weight:'400'},{path:'../../../fonts/inter-latin-700.woff2',weight:'700'}],variable:'--nv2-font-body',display:'swap'});
export const metadata={title:'Demo del panel | Nival Tech',description:'Recorre una versión demo del panel actual de Nival Tech y prueba cómo se configuran Nival Pay, Reseñas y WiFi.',robots:{index:false,follow:false}};
export default function CardsDemoPage(){return <main className={`nv2 nv3 nv3DemoPage ${sora.variable} ${inter.variable}`}><nav className="nv2Nav"><Link className="nv2Brand" href="/">← Nival Tech</Link><span className="nv5DemoNavLabel">PANEL DEMO · NO GUARDA CAMBIOS</span></nav><section className="nv2Section"><span className="nv2Eyebrow">PRUEBA EL PANEL ACTUAL</span><h1>Configura una Nival Card como si ya fuera tuya.</h1><p>La demo replica el flujo del panel: elige Pay, Reseñas o WiFi, edita la información y cambia a la vista del cliente para comprobar el resultado antes de crear una cuenta.</p><CardsDemo/><div style={{display:'flex',justifyContent:'center',marginTop:32}}><Link className="nv2Button" href="/auth?mode=signup">Crear mi cuenta y probar 15 días</Link></div></section></main>}
