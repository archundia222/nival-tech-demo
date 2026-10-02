import Link from 'next/link';
import { PayDemo } from '../pay-demo';
export default function Demo(){return <main className="legalShell"><Link href="/">← Nival Pay</Link><section className="legalCard"><h1>Así funciona Nival Pay</h1><p>Datos de ejemplo. No realices transferencias a esta demostración.</p><PayDemo/><Link href="/auth?mode=signup&next=%2Fdashboard%2Fpay">Crear mi Nival Pay</Link></section></main>;}
