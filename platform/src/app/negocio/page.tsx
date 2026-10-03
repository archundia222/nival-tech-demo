import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getBusinessSession } from '@/lib/managed-business';
import { CodeLogin } from './code-login';

export default async function BusinessLogin() {
  if (await getBusinessSession()) redirect('/negocio/panel');
  return <main className="managedLogin"><Link href="/" className="managedBrand">NIVAL <span>PAY</span></Link>
    <section className="managedLoginCard"><span className="managedEyebrow">CUENTA DE NEGOCIO</span><h1>Tu negocio.<br/>Tus tarjetas.</h1><p>Entra con el código que te entregó tu administrador.</p><CodeLogin />
      <small>Tu código es privado. Si lo perdiste, pídelo a tu administrador.</small>
    </section><Link href="/auth?next=%2Fadmin%2Fnegocios" className="managedAdminLink">Cuenta de administrador</Link>
    <Link href="/" className="managedAdminLink">← Volver al inicio</Link>
  </main>;
}
