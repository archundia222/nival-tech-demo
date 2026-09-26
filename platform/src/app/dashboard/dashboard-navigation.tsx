import Link from 'next/link';
import { signOut } from '@/app/auth/actions';
import styles from './dashboard-navigation.module.css';
import { MobileAutoCloseLink } from './mobile-auto-close-link';
import { createClient } from '@/lib/supabase/server';
import { getActiveBusinessMembership, getBusinessChoices } from '@/lib/active-business';
import { switchActiveBusiness } from './workspace-actions';

type ActiveItem = 'resumen' | 'inteligencia' | 'inteligencia-clientes' | 'inteligencia-importar' | 'inteligencia-asistente' | 'inteligencia-oportunidades' | 'inteligencia-recurrentes' | 'inteligencia-riesgo' | 'inteligencia-inactivos' | 'inteligencia-campanas' | 'inteligencia-impacto' | 'inteligencia-datos' | 'puntos' | 'puntos-registro' | 'puntos-analitica' | 'puntos-clientes' | 'puntos-visitas' | 'puntos-canjes' | 'puntos-promociones' | 'puntos-compartir' | 'puntos-configuracion' | 'clientes' | 'nival-card' | 'nival-pay' | 'agregar-tarjetas' | 'compartir-paginas' | 'perfil-digital' | 'web-ia' | 'configuracion';

const payItems: Array<{ id: ActiveItem; label: string; href: string }> = [
  { id: 'nival-pay', label: 'Páginas de cobro', href: '/dashboard/pay' },
  { id: 'agregar-tarjetas', label: 'Agregar Nival Pay', href: '/dashboard/pay?view=add' },
  { id: 'compartir-paginas', label: 'Compartir QR y links', href: '/dashboard/pay?view=share' },
];

const pointsItems: Array<{ id: ActiveItem; label: string; href: string; group: 'operacion' | 'clientes' | 'gestion' }> = [
  { id: 'puntos', label: 'Hoy', href: '/dashboard/points', group: 'operacion' },
  { id: 'puntos-visitas', label: 'Registrar visita', href: '/dashboard/points?view=visits', group: 'operacion' },
  { id: 'puntos-clientes', label: 'Clientes', href: '/dashboard/points?view=customers', group: 'clientes' },
  { id: 'puntos-promociones', label: 'Promociones y notificaciones', href: '/dashboard/points?view=promotions', group: 'clientes' },
  { id: 'puntos-compartir', label: 'Compartir programa', href: '/dashboard/points?view=share', group: 'gestion' },
  { id: 'puntos-configuracion', label: 'Configurar programa', href: '/dashboard/points?view=settings', group: 'gestion' },
];

const intelligenceItems: Array<{ id: ActiveItem; label: string; href: string; group: 'accion' | 'resultados' | 'herramientas' }> = [
  { id: 'inteligencia', label: 'Hoy', href: '/dashboard/intelligence', group: 'accion' },
  { id: 'inteligencia-riesgo', label: 'En riesgo', href: '/dashboard/intelligence?view=risk', group: 'accion' },
  { id: 'inteligencia-inactivos', label: 'Inactivos', href: '/dashboard/intelligence?view=inactive', group: 'accion' },
  { id: 'inteligencia-recurrentes', label: 'Frecuentes', href: '/dashboard/intelligence?view=recurring', group: 'accion' },
  { id: 'inteligencia-campanas', label: 'Campañas', href: '/dashboard/intelligence?view=campaigns', group: 'accion' },
  { id: 'inteligencia-impacto', label: 'Resultados', href: '/dashboard/intelligence?view=impact', group: 'resultados' },
  { id: 'inteligencia-datos', label: 'Ventas y datos', href: '/dashboard/intelligence?view=data', group: 'resultados' },
  { id: 'inteligencia-asistente', label: 'Pregúntale a Nival', href: '/dashboard/intelligence?view=assistant', group: 'herramientas' },
];

function NavIcon({ children }: { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export async function DashboardNavigation({ businessName, active }: { businessName: string; active: ActiveItem; productLevel?: 'pay' | 'intelligence' }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [workspaceChoices, activeMembership] = user
    ? await Promise.all([getBusinessChoices(user.id), getActiveBusinessMembership(user.id)])
    : [[], null];
  const payActive = payItems.some((item) => item.id === active);
  const pointsActive = pointsItems.some((item) => item.id === active);
  const intelligenceActive = intelligenceItems.some((item) => item.id === active);
  const canManageWorkspace = activeMembership?.role === 'owner' || activeMembership?.role === 'manager';
  const visiblePointsItems = canManageWorkspace
    ? pointsItems
    : pointsItems.filter((item) => ['puntos','puntos-visitas','puntos-clientes'].includes(item.id));
  const visiblePointGroups = (['operacion','clientes','gestion'] as const)
    .filter((group) => visiblePointsItems.some((item) => item.group === group));
  return <>
    <aside className="dashboardSidebar professionalSidebar">
      <Link className="professionalBrand" href="/dashboard"><span>N</span><b>NIVAL</b><small>tech</small></Link>
      {workspaceChoices.length > 1 ? <form action={switchActiveBusiness} className="workspaceSwitcher workspaceSwitcherForm">
        <span>{businessName.slice(0, 1).toUpperCase()}</span>
        <div><small>ESPACIO DE TRABAJO</small><strong>{businessName}</strong><label><span className="srOnly">Cambiar espacio de trabajo</span><select name="businessId" defaultValue={activeMembership?.business_id ?? ''}>{workspaceChoices.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label></div>
        <button type="submit">Cambiar</button>
      </form> : <div className="workspaceSwitcher"><span>{businessName.slice(0, 1).toUpperCase()}</span><div><small>ESPACIO DE TRABAJO</small><strong>{businessName}</strong></div></div>}
      <nav className="sidebarNav professionalNav" aria-label="Navegación del panel">
        {canManageWorkspace && <><span className="sidebarSectionLabel">COBRAR</span>
        <details className={styles.productGroup} open={payActive}>
          <summary className={`sidebarMainProduct ${payActive ? 'active' : ''}`}><NavIcon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h10M7 13h5" /></NavIcon><span>Nival Pay</span><i aria-hidden="true">⌄</i></summary>
          <div className="sidebarSubmenu" aria-label="Opciones de Nival Pay">{payItems.map((item) => <Link key={item.id} className={active === item.id ? 'active' : undefined} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</Link>)}</div>
        </details></>}
        <span className="sidebarSectionLabel">HACER QUE VUELVAN</span>
        <details className={styles.productGroup} open={pointsActive}>
          <summary className={`sidebarMainProduct ${pointsActive ? 'active' : ''}`}><NavIcon><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/></NavIcon><span>Nival Puntos</span><i aria-hidden="true">⌄</i></summary>
          <div className="sidebarSubmenu pointsSidebarSubmenu" aria-label="Opciones de Nival Puntos">{visiblePointGroups.map((group) => <div className="pointsNavGroup" key={group}><small>{group === 'operacion' ? 'USAR' : group === 'clientes' ? 'CLIENTES' : 'PROGRAMA'}</small>{visiblePointsItems.filter(item => item.group === group).map((item) => <Link key={item.id} className={active === item.id ? 'active' : undefined} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</Link>)}</div>)}</div>
        </details>
        {canManageWorkspace && <><span className="sidebarSectionLabel">CRECER</span>
        <details className={styles.productGroup} open={intelligenceActive}>
          <summary className={`sidebarMainProduct ${intelligenceActive ? 'active' : ''}`}><NavIcon><path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" /></NavIcon><span>Nival Growth</span><i aria-hidden="true">⌄</i></summary>
          <div className="sidebarSubmenu pointsSidebarSubmenu" aria-label="Herramientas de Nival Growth">{(['accion','resultados','herramientas'] as const).map(group => <div className="pointsNavGroup" key={group}><small>{group === 'accion' ? 'ACTUAR' : group === 'resultados' ? 'MEDIR' : 'PREGUNTAR'}</small>{intelligenceItems.filter(item => item.group === group).map(item => <Link key={item.id} className={active === item.id ? 'active' : undefined} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</Link>)}</div>)}</div>
        </details>
        <Link className={active === 'nival-card' ? 'active' : undefined} aria-current={active === 'nival-card' ? 'page' : undefined} href="/dashboard/pay/physical"><NavIcon><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M16 10c1.5 1.1 1.5 2.9 0 4M18.5 8c3 2.1 3 5.9 0 8"/></NavIcon>Tarjeta NFC</Link>
        <span className="sidebarSectionLabel">SERVICIOS</span>
        <Link className={active === 'web-ia' ? 'active' : undefined} aria-current={active === 'web-ia' ? 'page' : undefined} href="/dashboard/web-ia"><NavIcon><path d="M4 5h16v14H4z"/><path d="M4 9h16M8 5v4M12 14l1.2 2.6L16 18l-2.8 1.2L12 22l-1.2-2.8L8 18l2.8-1.4L12 14z"/></NavIcon>Página web con IA</Link>
        <Link className={active === 'perfil-digital' ? 'active' : undefined} aria-current={active === 'perfil-digital' ? 'page' : undefined} href="/dashboard?section=perfil-digital"><NavIcon><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0M4 4h16v16H4z" /></NavIcon>Página del negocio</Link></>}
      </nav>
      <div className="sidebarFooter professionalFooter"><Link href="/support">Ayuda</Link>{canManageWorkspace && <Link href="/dashboard?section=configuracion">Configuración</Link>}<form action={signOut}><button className="textButton">Cerrar sesión</button></form></div>
    </aside>
    <details className="dashboardMobileMenu professionalMobileMenu">
      <summary><span className="hamburgerIcon" aria-hidden="true"><i /><i /><i /></span><span>NIVAL tech</span><strong>{businessName}</strong></summary>
      <nav aria-label="Navegación móvil del panel">
        {workspaceChoices.length > 1 && <form action={switchActiveBusiness} className="mobileWorkspaceSwitcher">
          <label><span>ESPACIO DE TRABAJO</span><select name="businessId" defaultValue={activeMembership?.business_id ?? ''}>{workspaceChoices.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>
          <button type="submit">Cambiar negocio</button>
        </form>}
        {canManageWorkspace && <details className={styles.mobileGroup} open={payActive}><summary>Nival Pay <i>⌄</i></summary><div className="mobileSubmenu">{payItems.map((item) => <MobileAutoCloseLink key={item.id} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</MobileAutoCloseLink>)}</div></details>}
        <details className={styles.mobileGroup} open={pointsActive}><summary>Nival Puntos <i>⌄</i></summary><div className="mobileSubmenu">{visiblePointsItems.map((item) => <MobileAutoCloseLink key={item.id} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</MobileAutoCloseLink>)}</div></details>
        {canManageWorkspace && <><details className={styles.mobileGroup} open={intelligenceActive}><summary>Nival Growth <i>⌄</i></summary><div className="mobileSubmenu">{intelligenceItems.map((item) => <MobileAutoCloseLink key={item.id} aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</MobileAutoCloseLink>)}</div></details>
        <MobileAutoCloseLink href="/dashboard/pay/physical">Tarjeta NFC</MobileAutoCloseLink><MobileAutoCloseLink href="/dashboard/web-ia">Página web con IA</MobileAutoCloseLink><MobileAutoCloseLink href="/dashboard?section=perfil-digital">Página del negocio</MobileAutoCloseLink><MobileAutoCloseLink href="/dashboard?section=configuracion">Configuración</MobileAutoCloseLink></>}<form action={signOut} className="mobileSignOut"><button type="submit">Cerrar sesión</button></form>
      </nav>
    </details>
  </>;
}
