import Link from 'next/link';
import { signOut } from '@/app/auth/actions';

type ActiveItem = 'resumen' | 'inteligencia' | 'clientes' | 'nival-card' | 'nival-pay' | 'configuracion';

const payItems: Array<{ id: ActiveItem; label: string; href: string; icon: React.ReactNode }> = [
  { id: 'nival-pay', label: 'Nival Pay', href: '/dashboard/pay', icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h10M7 13h5" /></> },
  { id: 'nival-card', label: 'Tarjetas y links', href: '/dashboard?section=nival-card', icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></> },
];

const intelligenceItems: Array<{ id: ActiveItem; label: string; href: string; icon: React.ReactNode }> = [
  { id: 'clientes', label: 'Clientes', href: '/dashboard?section=clientes', icon: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /> },
  { id: 'inteligencia', label: 'Inteligencia', href: '/dashboard?section=inteligencia', icon: <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" /> },
];

function NavIcon({ children }: { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export function DashboardNavigation({ businessName, active, productLevel = 'pay' }: { businessName: string; active: ActiveItem; productLevel?: 'pay' | 'intelligence' }) {
  const visibleItems = productLevel === 'intelligence' ? [...payItems, ...intelligenceItems] : payItems;
  return <>
    <aside className="dashboardSidebar professionalSidebar">
      <Link className="professionalBrand" href="/dashboard"><span>N</span><b>NIVAL</b><small>tech</small></Link>
      <button className="workspaceSwitcher" type="button"><span>{businessName.slice(0, 1).toUpperCase()}</span><div><small>ESPACIO DE TRABAJO</small><strong>{businessName}</strong></div></button>
      <nav className="sidebarNav professionalNav" aria-label="Navegación del panel">
        {visibleItems.map((item) => <Link key={item.id} className={active === item.id ? 'active' : undefined} aria-current={active === item.id ? 'page' : undefined} href={item.href}><NavIcon>{item.icon}</NavIcon>{item.label}</Link>)}
        <Link className="productsNavLink" href="/products"><span className="productsPlus">+</span> Productos</Link>
      </nav>
      <div className="sidebarFooter professionalFooter"><Link href="/dashboard?section=configuracion">Configuración</Link><form action={signOut}><button className="textButton">Cerrar sesión</button></form></div>
    </aside>
    <details className="dashboardMobileMenu professionalMobileMenu">
      <summary><span className="hamburgerIcon" aria-hidden="true"><i /><i /><i /></span><span>NIVAL tech</span><strong>{businessName}</strong></summary>
      <nav aria-label="Navegación móvil del panel">{visibleItems.map((item) => <Link key={item.id} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</Link>)}<Link href="/products">+ Productos</Link><Link href="/dashboard?section=configuracion">Configuración</Link></nav>
    </details>
  </>;
}
