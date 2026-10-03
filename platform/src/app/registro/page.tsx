import Link from 'next/link';
import { ProfileRegistrationForm } from '../admin/registro/registration-form';
import '../managed.css';
export const metadata = { title: 'Crear mi perfil' };
export default function RegistrationPage() {
  return <main className="managedLogin"><Link href="/" className="managedBrand">NIVAL <span>PAY</span></Link><section className="managedLoginCard"><span className="managedEyebrow">CREA TU CUENTA DE ADMINISTRADOR</span><h1>Tu primer paso.</h1><p>Crea tu acceso para registrar negocios y administrar sus tarjetas.</p><ProfileRegistrationForm /><small>Confirma tu correo para entrar a tu panel.</small></section><Link className="managedAdminLink" href="/auth">Ya tengo cuenta · iniciar sesión</Link><Link className="managedAdminLink" href="/negocio">Tengo un código de negocio</Link></main>;
}
