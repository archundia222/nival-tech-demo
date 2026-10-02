import Link from 'next/link';
import { requireManagedAdmin, managedBusinesses, isBusinessActive } from '@/lib/managed-business';
import { publicSiteUrl } from '@/lib/payment-profile';
import { signOut } from '@/app/auth/actions';
import { ManagedAdminWorkspace } from './workspace';
import '../../managed.css';

export const metadata = { title: 'Administrar negocios', robots: { index: false, follow: false } };
export default async function ManagedAdminPage() {
  const user = await requireManagedAdmin();
  const businesses = await managedBusinesses();
  return <main className="managedShell"><header className="managedTop"><Link href="/" className="managedBrand">NIVAL <span>PAY</span></Link><div className="managedTopActions"><span>{user.email}</span><form action={signOut}><button className="managedTextButton">Cerrar sesión</button></form></div></header>
    <section className="managedHeading"><div><span className="managedEyebrow">ADMINISTRACIÓN</span><h1>Mis negocios</h1></div><Link href="/negocio" className="managedOutline">Acceso de negocios</Link></section>
    <ManagedAdminWorkspace businesses={businesses} siteUrl={publicSiteUrl()} activeBusinessIds={businesses.filter(isBusinessActive).map(b => b.id)} />
  </main>;
}
