import Link from 'next/link';
import { signOut } from '@/app/auth/actions';

type ActiveItem = 'resumen' | 'inteligencia' | 'puntos' | 'puntos-analitica' | 'puntos-clientes' | 'puntos-compartir' | 'puntos-configuracion' | 'clientes' | 'nival-card' | 'nival-pay' | 'agregar-tarjetas' | 'compartir-paginas' | 'perfil-digital' | 'configuracion';

const payItems: Array<{ id: ActiveItem; label: string; href: string; icon: React.ReactNode }> = [
  { id: 'nival-pay', label: 'Tus tarjetas', href: '/dashboard/pay', icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h10M7 13h5" /></> },
  { id: 'agregar-tarjetas', label: 'Agregar tarjetas', href: '/dashboard/pay?view=add', icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M12 9v6M9 12h6" /></> },
  { id: 'compartir-paginas', label: 'Comparte tus páginas', href: '/dashboard/pay?view=share', icon: <><path d="M8 12h8M12 8v8"/><rect x="3" y="3" width="18" height="18" rx="3" /></> },
];

const pointsItems: Array<{ id: ActiveItem; label: string; href: string }> = [
  { id: 'puntos', label: 'Resumen', href: '/dashboard/points' },
  { id: 'puntos-analitica', label: 'Analítica de datos', href: '/dashboard/points?view=analytics' },
  { id: 'puntos-clientes', label: 'Clientes y puntos', href: '/dashboard/points?view=customers' },
  { id: 'puntos-compartir', label: 'QR y enlace', href: '/dashboard/points?view=share' },
  { id: 'puntos-configuracion', label: 'Configurar programa', href: '/dashboard/points?view=settings' },
];

const productItems: Array<{ id: ActiveItem; label: string; href: string; icon: React.ReactNode }> = [
  { id: 'puntos', label: 'Nival Puntos', href: '/dashboard/points', icon: <><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/></> },
  { id: 'inteligencia', label: 'Nival Intelligence', href: '/dashboard/intelligence', icon: <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" /> },
  { id: 'perfil-digital', label: 'Perfil digital del negocio', href: '/dashboard?section=perfil-digital', icon: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0M4 4h16v16H4z" /></> },
];

function NavIcon({ children }: { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export function DashboardNavigation({ businessName, active }: { businessName: string; active: ActiveItem; productLevel?: 'pay' | 'intelligence' }) {
  const payActive = payItems.some((item) => item.id === active);
  const pointsActive = pointsItems.some((item) => item.id === active);
  return <>
    <aside className="dashboardSidebar professionalSidebar">
      <Link className="professionalBrand" href="/dashboard"><span>N</span><b>NIVAL</b><small>tech</small></Link>
      <div className="workspaceSwitcher"><span>{businessName.slice(0, 1).toUpperCase()}</span><div><small>NEGOCIO ACTUAL</small><strong>{businessName}</strong></div></div>
      <nav className="sidebarNav professionalNav" aria-label="Navegación del panel">
        <span className="sidebarSectionLabel">Cobros</span>
        <Link className={`sidebarMainProduct ${payActive ? 'active' : ''}`} href="/dashboard/pay"><NavIcon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h10M7 13h5" /></NavIcon>Nival Pay</Link>
        <div className="sidebarSubmenu" aria-label="Opciones de Nival Pay">
          {payItems.map((item) => <Link key={item.id} className={active === item.id ? 'active' : undefined} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</Link>)}
        </div>
        <span className="sidebarSectionLabel">Crecimiento</span>
        <Link className={`sidebarMainProduct ${pointsActive ? 'active' : ''}`} href="/dashboard/points"><NavIcon><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/></NavIcon>Nival Puntos</Link>
        <div className="sidebarSubmenu" aria-label="Opciones de Nival Puntos">{pointsItems.map((item) => <Link key={item.id} className={active === item.id ? 'active' : undefined} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</Link>)}</div>
        {productItems.filter((item) => item.id !== 'puntos').map((item) => <Link key={item.id} className={active === item.id ? 'active' : undefined} aria-current={active === item.id ? 'page' : undefined} href={item.href}><NavIcon>{item.icon}</NavIcon>{item.label}</Link>)}
      </nav>
      <div className="sidebarFooter professionalFooter"><Link href="/dashboard?section=configuracion">Configuración</Link><form action={signOut}><button className="textButton">Cerrar sesión</button></form></div>
    </aside>
    <details className="dashboardMobileMenu professionalMobileMenu">
      <summary><span className="hamburgerIcon" aria-hidden="true"><i /><i /><i /></span><span>NIVAL tech</span><strong>{businessName}</strong></summary>
      <nav aria-label="Navegación móvil del panel"><Link className="mobileMainProduct" href="/dashboard/pay">Nival Pay</Link><div className="mobileSubmenu">{payItems.map((item) => <Link key={item.id} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</Link>)}</div><Link className="mobileMainProduct" href="/dashboard/points">Nival Puntos</Link><div className="mobileSubmenu">{pointsItems.map((item) => <Link key={item.id} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</Link>)}</div>{productItems.filter((item) => item.id !== 'puntos').map((item) => <Link key={item.id} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</Link>)}<Link href="/dashboard?section=configuracion">Configuración</Link><form action={signOut} className="mobileSignOut"><button type="submit">Cerrar sesión</button></form></nav>
    </details>
  </>;
}
