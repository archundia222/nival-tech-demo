import Link from 'next/link';
import { signOut } from '@/app/auth/actions';
import styles from './dashboard-navigation.module.css';
import { MobileAutoCloseLink } from './mobile-auto-close-link';

type ActiveItem = 'resumen' | 'inteligencia' | 'inteligencia-clientes' | 'inteligencia-importar' | 'inteligencia-asistente' | 'inteligencia-oportunidades' | 'puntos' | 'puntos-analitica' | 'puntos-clientes' | 'puntos-visitas' | 'puntos-canjes' | 'puntos-compartir' | 'puntos-configuracion' | 'clientes' | 'nival-card' | 'nival-pay' | 'agregar-tarjetas' | 'compartir-paginas' | 'perfil-digital' | 'configuracion';

const payItems: Array<{ id: ActiveItem; label: string; href: string }> = [
  { id: 'nival-pay', label: 'Tus tarjetas', href: '/dashboard/pay' },
  { id: 'agregar-tarjetas', label: 'Agregar tarjetas', href: '/dashboard/pay?view=add' },
  { id: 'compartir-paginas', label: 'Comparte tus páginas', href: '/dashboard/pay?view=share' },
];

const pointsItems: Array<{ id: ActiveItem; label: string; href: string; group: 'operacion' | 'clientes' | 'gestion' }> = [
  { id: 'puntos', label: 'Resumen', href: '/dashboard/points', group: 'clientes' },
  { id: 'puntos-clientes', label: 'Clientes y actividad', href: '/dashboard/points?view=customers', group: 'clientes' },
  { id: 'puntos-analitica', label: 'Analítica', href: '/dashboard/points?view=analytics', group: 'clientes' },
  { id: 'puntos-visitas', label: 'Registrar visita', href: '/dashboard/points?view=visits', group: 'operacion' },
  { id: 'puntos-canjes', label: 'Canjear recompensa', href: '/dashboard/points?view=redemptions', group: 'operacion' },
  { id: 'puntos-configuracion', label: 'Programa de lealtad', href: '/dashboard/points?view=settings', group: 'gestion' },
  { id: 'puntos-compartir', label: 'QR y NFC', href: '/dashboard/points?view=share', group: 'gestion' },
];

const intelligenceItems: Array<{ id: ActiveItem; label: string; href: string; group: 'analisis' | 'datos' | 'asistente' }> = [
  { id: 'inteligencia', label: 'Resumen y consejos', href: '/dashboard/intelligence', group: 'analisis' },
  { id: 'inteligencia-clientes', label: 'Clientes analizados', href: '/dashboard/intelligence?view=customers', group: 'analisis' },
  { id: 'inteligencia-oportunidades', label: 'Oportunidades', href: '/dashboard/intelligence?view=opportunities', group: 'analisis' },
  { id: 'inteligencia-importar', label: 'Importar clientes', href: '/dashboard/intelligence?view=imports', group: 'datos' },
  { id: 'inteligencia-asistente', label: 'Asistente Nival', href: '/dashboard/intelligence?view=assistant', group: 'asistente' },
];

function NavIcon({ children }: { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export function DashboardNavigation({ businessName, active }: { businessName: string; active: ActiveItem; productLevel?: 'pay' | 'intelligence' }) {
  const payActive = payItems.some((item) => item.id === active);
  const pointsActive = pointsItems.some((item) => item.id === active);
  const intelligenceActive = intelligenceItems.some((item) => item.id === active);
  return <>
    <aside className="dashboardSidebar professionalSidebar">
      <Link className="professionalBrand" href="/dashboard"><span>N</span><b>NIVAL</b><small>tech</small></Link>
      <div className="workspaceSwitcher"><span>{businessName.slice(0, 1).toUpperCase()}</span><div><small>NEGOCIO ACTUAL</small><strong>{businessName}</strong></div></div>
      <nav className="sidebarNav professionalNav" aria-label="Navegación del panel">
        <span className="sidebarSectionLabel">Cobros</span>
        <details className={styles.productGroup} open={payActive}>
          <summary className={`sidebarMainProduct ${payActive ? 'active' : ''}`}><NavIcon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h10M7 13h5" /></NavIcon><span>Nival Pay</span><i aria-hidden="true">⌄</i></summary>
          <div className="sidebarSubmenu" aria-label="Opciones de Nival Pay">{payItems.map((item) => <Link key={item.id} className={active === item.id ? 'active' : undefined} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</Link>)}</div>
        </details>
        <span className="sidebarSectionLabel">Crecimiento</span>
        <details className={styles.productGroup} open={pointsActive}>
          <summary className={`sidebarMainProduct ${pointsActive ? 'active' : ''}`}><NavIcon><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/></NavIcon><span>Nival Puntos</span><i aria-hidden="true">⌄</i></summary>
          <div className="sidebarSubmenu pointsSidebarSubmenu" aria-label="Opciones de Nival Puntos">{(['operacion','clientes','gestion'] as const).map((group) => <div className="pointsNavGroup" key={group}><small>{group === 'operacion' ? 'OPERACIÓN' : group === 'clientes' ? 'CLIENTES Y ACTIVIDAD' : 'CONFIGURACIÓN'}</small>{pointsItems.filter(item => item.group === group).map((item) => <Link key={item.id} className={active === item.id ? 'active' : undefined} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</Link>)}</div>)}</div>
        </details>
        <details className={styles.productGroup} open={intelligenceActive}>
          <summary className={`sidebarMainProduct ${intelligenceActive ? 'active' : ''}`}><NavIcon><path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" /></NavIcon><span>Nival Intelligence</span><i aria-hidden="true">⌄</i></summary>
          <div className="sidebarSubmenu pointsSidebarSubmenu" aria-label="Opciones de Nival Intelligence">{(['analisis','datos','asistente'] as const).map(group => <div className="pointsNavGroup" key={group}><small>{group === 'analisis' ? 'ANÁLISIS' : group === 'datos' ? 'DATOS' : 'ASISTENTE'}</small>{intelligenceItems.filter(item => item.group === group).map(item => <Link key={item.id} className={active === item.id ? 'active' : undefined} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</Link>)}</div>)}</div>
        </details>
        <Link className={active === 'perfil-digital' ? 'active' : undefined} aria-current={active === 'perfil-digital' ? 'page' : undefined} href="/dashboard?section=perfil-digital"><NavIcon><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0M4 4h16v16H4z" /></NavIcon>Perfil digital del negocio</Link>
      </nav>
      <div className="sidebarFooter professionalFooter"><Link href="/dashboard?section=configuracion">Configuración</Link><form action={signOut}><button className="textButton">Cerrar sesión</button></form></div>
    </aside>
    <details className="dashboardMobileMenu professionalMobileMenu">
      <summary><span className="hamburgerIcon" aria-hidden="true"><i /><i /><i /></span><span>NIVAL tech</span><strong>{businessName}</strong></summary>
      <nav aria-label="Navegación móvil del panel">
        <details className={styles.mobileGroup} open={payActive}><summary>Nival Pay <i>⌄</i></summary><div className="mobileSubmenu">{payItems.map((item) => <MobileAutoCloseLink key={item.id} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</MobileAutoCloseLink>)}</div></details>
        <details className={styles.mobileGroup} open={pointsActive}><summary>Nival Puntos <i>⌄</i></summary><div className="mobileSubmenu">{pointsItems.map((item) => <MobileAutoCloseLink key={item.id} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</MobileAutoCloseLink>)}</div></details>
        <details className={styles.mobileGroup} open={intelligenceActive}><summary>Nival Intelligence <i>⌄</i></summary><div className="mobileSubmenu">{intelligenceItems.map((item) => <MobileAutoCloseLink key={item.id} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</MobileAutoCloseLink>)}</div></details>
        <MobileAutoCloseLink href="/dashboard?section=perfil-digital">Perfil digital del negocio</MobileAutoCloseLink><MobileAutoCloseLink href="/dashboard?section=configuracion">Configuración</MobileAutoCloseLink><form action={signOut} className="mobileSignOut"><button type="submit">Cerrar sesión</button></form>
      </nav>
    </details>
  </>;
}
