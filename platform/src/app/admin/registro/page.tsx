import Link from 'next/link';
import { AdminRegistrationForm } from './registration-form';
import '../../managed.css';

export const metadata = { title: 'Crear mi administrador', robots: { index: false, follow: false } };
export default function AdminRegistrationPage() {
  return <main className="managedLogin"><Link href="/" className="managedBrand">NIVAL <span>PAY</span></Link><section className="managedLoginCard"><span className="managedEyebrow">REGISTRO DE ADMINISTRADOR</span><h1>Crea tu cuenta<br/>desde cero.</h1><p>Elige tus datos y utiliza tu código privado de registro.</p><AdminRegistrationForm /><small>Este código permite crear un administrador y funciona una sola vez. Guárdalo en privado.</small></section><Link className="managedAdminLink" href="/auth?next=%2Fadmin%2Fnegocios">Ya tengo cuenta · iniciar sesión</Link></main>;
}
