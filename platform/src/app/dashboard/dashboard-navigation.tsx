import Link from 'next/link';
import { signOut } from '@/app/auth/actions';

type ActiveItem = 'resumen' | 'inteligencia' | 'clientes' | 'nival-card' | 'nival-pay' | 'configuracion';

const items: Array<{ id: ActiveItem; label: string; href: string; icon: React.ReactNode; soon?: boolean }> = [
  { id: 'nival-pay', label: 'Nival Pay', href: '/dashboard/pay', icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h10M7 13h5" /></> },
  { id: 'clientes', label: 'Clientes', href: '/dashboard?section=clientes', icon: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /> },
  { id: 'resumen', label: 'Resumen', href: '/dashboard?section=resumen', icon: <path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M9 20v-6h6v6" /> },
  { id: 'nival-card', label: 'Nival Card', href: '/dashboard?section=nival-card', icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></> },
  { id: 'configuracion', label: 'Configuración', href: '/dashboard?section=configuracion', icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63h.01A1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9v.01A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></> },
  { id: 'inteligencia', label: 'Inteligencia', href: '/dashboard?section=inteligencia', soon: true, icon: <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3ZM5 15l.9 2.1L8 18l-2.1.9L5 21l-.9-2.1L2 18l2.1-.9L5 15Zm14-1 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" /> },
];

function NavIcon({ children }: { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export function DashboardNavigation({ businessName, active, productLevel = 'pay' }: { businessName: string; active: ActiveItem; productLevel?: 'pay' | 'intelligence' }) {
  const visibleItems = items.filter((item) => productLevel === 'intelligence' || !['clientes', 'inteligencia'].includes(item.id));
  return <>
    <aside className="dashboardSidebar professionalSidebar">
      <Link className="professionalBrand" href="/dashboard"><span>N</span><b>NIVAL</b><small>tech</small></Link>
      <button className="workspaceSwitcher" type="button"><span>{businessName.slice(0, 1).toUpperCase()}</span><div><small>ESPACIO DE TRABAJO</small><strong>{businessName}</strong></div></button>
      <nav className="sidebarNav professionalNav" aria-label="Navegación del panel">
        {visibleItems.map((item) => <Link key={item.id} className={active === item.id ? 'active' : undefined} aria-current={active === item.id ? 'page' : undefined} href={item.href}><NavIcon>{item.icon}</NavIcon>{item.label}{item.soon && productLevel !== 'intelligence' ? <small>Próximamente</small> : null}</Link>)}
      </nav>
      <div className="sidebarFooter professionalFooter"><Link href="/products">Todos los productos</Link><form action={signOut}><button className="textButton">Cerrar sesión</button></form></div>
    </aside>
    <details className="dashboardMobileMenu professionalMobileMenu">
      <summary><span className="hamburgerIcon" aria-hidden="true"><i /><i /><i /></span><span>NIVAL tech</span><strong>{businessName}</strong></summary>
      <nav aria-label="Navegación móvil del panel">{visibleItems.map((item) => <Link key={item.id} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</Link>)}</nav>
    </details>
  </>;
}
