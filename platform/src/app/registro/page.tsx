import Link from 'next/link';
import { ProfileRegistrationForm } from '../admin/registro/registration-form';
import '../managed.css';
export const metadata = { title: 'Crear mi perfil' };
export default function RegistrationPage() {
  return <main className="managedLogin"><Link href="/" className="managedBrand">NIVAL <span>PAY</span></Link><section className="managedLoginCard"><span className="managedEyebrow">CREA TU PERFIL</span><h1>Todo empieza<br/>con tu cuenta.</h1><p>Elige tu correo y contraseña. Desde tu panel podrás registrar tus negocios y administrar sus tarjetas.</p><ProfileRegistrationForm /><small>Te enviaremos un enlace para confirmar tu correo. Cada perfil tiene su propio panel.</small></section><Link className="managedAdminLink" href="/auth">Ya tengo cuenta · iniciar sesión</Link><Link className="managedAdminLink" href="/negocio">Tengo un código de negocio</Link></main>;
}
