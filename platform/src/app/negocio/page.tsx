import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getBusinessSession } from '@/lib/managed-business';
import { CodeLogin } from './code-login';

export default async function BusinessLogin() {
  if (await getBusinessSession()) redirect('/negocio/panel');
  return <main className="managedLogin"><Link href="/" className="managedBrand">NIVAL <span>PAY</span></Link>
    <section className="managedLoginCard"><span className="managedEyebrow">ACCESO DEL NEGOCIO</span><h1>Tus tarjetas,<br/>en un solo lugar.</h1><p>Escribe el código que te entregó tu administrador.</p><CodeLogin />
      <small>Tu código es privado. Si lo perdiste, contacta a Nival para obtener uno nuevo.</small>
    </section><Link href="/auth?next=%2Fadmin%2Fnegocios" className="managedAdminLink">Entrar como administrador</Link>
  </main>;
}
