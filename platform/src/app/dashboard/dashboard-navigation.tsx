import Link from 'next/link';
import { signOut } from '@/app/auth/actions';
import styles from './dashboard-navigation.module.css';
import { MobileAutoCloseLink } from './mobile-auto-close-link';
import { createClient } from '@/lib/supabase/server';
import { getActiveBusinessMembership, getBusinessChoices } from '@/lib/active-business';
import { switchActiveBusiness } from './workspace-actions';

type ActiveItem =
  | 'resumen'
  | 'inteligencia'
  | 'inteligencia-clientes'
  | 'inteligencia-importar'
  | 'inteligencia-asistente'
  | 'inteligencia-oportunidades'
  | 'inteligencia-recurrentes'
  | 'inteligencia-riesgo'
  | 'inteligencia-inactivos'
  | 'inteligencia-campanas'
  | 'inteligencia-impacto'
  | 'inteligencia-datos'
  | 'puntos'
  | 'puntos-registro'
  | 'puntos-analitica'
  | 'puntos-clientes'
  | 'puntos-visitas'
  | 'puntos-canjes'
  | 'puntos-promociones'
  | 'puntos-compartir'
  | 'puntos-configuracion'
  | 'puntos-pro'
  | 'clientes'
  | 'nival-card'
  | 'nival-pay'
  | 'agregar-tarjetas'
  | 'compartir-paginas'
  | 'perfil-digital'
  | 'web-ia'
  | 'reseñas'
  | 'configuracion';

const payItems: Array<{ id: ActiveItem; label: string; href: string }> = [
  { id: 'nival-pay', label: 'Mi Nival Pay', href: '/dashboard/pay' },
  { id: 'agregar-tarjetas', label: 'Agregar otra', href: '/dashboard/pay?view=add' },
  { id: 'compartir-paginas', label: 'Compartir', href: '/dashboard/pay?view=share' },
];

const pointsItems: Array<{ id: ActiveItem; label: string; href: string; group: 'usar' | 'clientes' | 'programa' }> = [
  { id: 'puntos', label: 'Hoy', href: '/dashboard/points', group: 'usar' },
  { id: 'puntos-visitas', label: 'Registrar visita', href: '/dashboard/points?view=visits', group: 'usar' },
  { id: 'puntos-clientes', label: 'Clientes', href: '/dashboard/points?view=customers', group: 'clientes' },
  { id: 'puntos-promociones', label: 'Promociones', href: '/dashboard/points?view=promotions', group: 'clientes' },
  { id: 'puntos-compartir', label: 'Compartir programa', href: '/dashboard/points?view=share', group: 'programa' },
  { id: 'puntos-configuracion', label: 'Configurar programa', href: '/dashboard/points?view=settings', group: 'programa' },
  { id: 'puntos-pro', label: 'Nival Puntos Pro', href: '/dashboard/points?view=pro', group: 'programa' },
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

  const canManageWorkspace = activeMembership?.role === 'owner' || activeMembership?.role === 'manager';

  let businessHealthPercent = 0;
  if (canManageWorkspace && activeMembership?.business_id) {
    const businessId = activeMembership.business_id;
    const [{ data: businessConfig }, { data: paymentProfile }, { data: smartLinks }, { data: pointsEntitlement }] = await Promise.all([
      supabase.from('businesses').select('slug,phone,description,logo_url,website_url').eq('id', businessId).maybeSingle(),
      supabase.from('payment_profiles').select('active,account_holder,bank_name,clabe').eq('business_id', businessId).order('active', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('smart_links').select('kind,active').eq('business_id', businessId),
      supabase.from('business_product_entitlements').select('status').eq('business_id', businessId).eq('product_code', 'nival_points').maybeSingle(),
    ]);

    const payReady = Boolean(paymentProfile?.active && paymentProfile.account_holder && paymentProfile.bank_name && paymentProfile.clabe);
    const profileReady = Boolean(businessConfig?.description && businessConfig?.phone && businessConfig?.logo_url);
    const reviewsReady = Boolean(smartLinks?.some((link) => link.kind === 'google_review' && link.active));
    const hasPublicAction = Boolean(
      payReady ||
      businessConfig?.phone ||
      businessConfig?.website_url ||
      smartLinks?.some((link) => link.active) ||
      ['free','active'].includes(pointsEntitlement?.status ?? '')
    );
    const publicProfileReady = Boolean(businessConfig?.slug && hasPublicAction);

    const completed = [payReady, profileReady, reviewsReady, publicProfileReady].filter(Boolean).length;
    businessHealthPercent = Math.round((completed / 4) * 100);
  }

  const payActive = payItems.some((item) => item.id === active);
  const reviewsActive = active === 'reseñas';
  const pointsActive = pointsItems.some((item) => item.id === active);
  const visiblePointsItems = canManageWorkspace ? pointsItems : pointsItems.filter((item) => item.id === 'puntos-visitas');
  const groups = (['usar','clientes','programa'] as const).filter((group) => visiblePointsItems.some((item) => item.group === group));

  return <>
    <aside className="dashboardSidebar professionalSidebar">
      <Link className="professionalBrand" href="/dashboard"><span>N</span><b>NIVAL</b><small>tech</small></Link>

      {workspaceChoices.length > 1 ? <form action={switchActiveBusiness} className="workspaceSwitcher workspaceSwitcherForm">
        <span>{businessName.slice(0, 1).toUpperCase()}</span>
        <div><small>ESPACIO DE TRABAJO</small><strong>{businessName}</strong><label><span className="srOnly">Cambiar espacio de trabajo</span><select name="businessId" defaultValue={activeMembership?.business_id ?? ''}>{workspaceChoices.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label></div>
        <button type="submit">Cambiar</button>
      </form> : <div className="workspaceSwitcher"><span>{businessName.slice(0, 1).toUpperCase()}</span><div><small>TU NEGOCIO</small><strong>{businessName}</strong></div></div>}

      <nav className="sidebarNav professionalNav" aria-label="Navegación del panel">
        {canManageWorkspace && <details className={styles.productGroup} open={payActive}>
          <summary className={`sidebarMainProduct ${payActive ? 'active' : ''}`}><NavIcon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h10M7 13h5" /></NavIcon><span>Nival Pay</span><i aria-hidden="true">⌄</i></summary>
          <div className="sidebarSubmenu">{payItems.map((item) => <Link key={item.id} className={active === item.id ? 'active' : undefined} href={item.href}>{item.label}</Link>)}</div>
        </details>}

        {canManageWorkspace && <Link className={reviewsActive ? 'sidebarMainProduct active' : 'sidebarMainProduct'} href="/dashboard/reviews">
          <NavIcon><path d="m12 3 2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.7 5.2-.8L12 3Z"/></NavIcon><span>Nival Reseñas</span>
        </Link>}

        <details className={styles.productGroup} open={pointsActive}>
          <summary className={`sidebarMainProduct ${pointsActive ? 'active' : ''}`}><NavIcon><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/></NavIcon><span>Nival Puntos</span><i aria-hidden="true">⌄</i></summary>
          <div className="sidebarSubmenu pointsSidebarSubmenu">
            {groups.map((group) => <div className="pointsNavGroup" key={group}>
              <small>{group === 'usar' ? 'USAR' : group === 'clientes' ? 'CLIENTES' : 'PROGRAMA'}</small>
              {visiblePointsItems.filter(item => item.group === group).map((item) => <Link key={item.id} className={active === item.id ? 'active' : undefined} href={item.href}>{item.label}</Link>)}
            </div>)}
          </div>
        </details>

        {canManageWorkspace && <Link className={active === 'resumen' ? 'sidebarMainProduct active businessHealthNav' : 'sidebarMainProduct businessHealthNav'} href="/dashboard">
          <NavIcon><path d="M4 19V9l8-5 8 5v10"/><path d="M8 19v-6h8v6"/></NavIcon>
          <span className="businessHealthNavCopy"><b>Estado del negocio</b><small>{businessHealthPercent}% completado</small><i className="businessHealthMiniBar" aria-hidden="true"><span style={{ width: `${businessHealthPercent}%` }} /></i></span>
        </Link>}

        {canManageWorkspace && <Link className={active === 'perfil-digital' ? 'sidebarMainProduct active' : 'sidebarMainProduct'} href="/dashboard?section=perfil-digital">
          <NavIcon><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h6"/></NavIcon>
          <span>Configuración de tu negocio</span>
        </Link>}
      </nav>

      <div className="sidebarFooter professionalFooter">
        <Link href="/support">Ayuda</Link>
        <form action={signOut}><button className="textButton">Cerrar sesión</button></form>
      </div>
    </aside>

    <details className="dashboardMobileMenu professionalMobileMenu">
      <summary><span className="hamburgerIcon" aria-hidden="true"><i /><i /><i /></span><span>NIVAL tech</span><strong>{businessName}</strong></summary>
      <nav aria-label="Navegación móvil del panel">
        {workspaceChoices.length > 1 && <form action={switchActiveBusiness} className="mobileWorkspaceSwitcher">
          <label><span>NEGOCIO</span><select name="businessId" defaultValue={activeMembership?.business_id ?? ''}>{workspaceChoices.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>
          <button type="submit">Cambiar negocio</button>
        </form>}

        {canManageWorkspace && <details className={styles.mobileGroup} open={payActive}><summary>Nival Pay <i>⌄</i></summary><div className="mobileSubmenu">{payItems.map((item) => <MobileAutoCloseLink key={item.id} href={item.href}>{item.label}</MobileAutoCloseLink>)}</div></details>}
        {canManageWorkspace && <MobileAutoCloseLink href="/dashboard/reviews">Nival Reseñas</MobileAutoCloseLink>}
        <details className={styles.mobileGroup} open={pointsActive}><summary>Nival Puntos <i>⌄</i></summary><div className="mobileSubmenu">{visiblePointsItems.map((item) => <MobileAutoCloseLink key={item.id} href={item.href}>{item.label}</MobileAutoCloseLink>)}</div></details>
        {canManageWorkspace && <MobileAutoCloseLink href="/dashboard">Estado del negocio · {businessHealthPercent}%</MobileAutoCloseLink>}
        {canManageWorkspace && <MobileAutoCloseLink href="/dashboard?section=perfil-digital">Configuración de tu negocio</MobileAutoCloseLink>}
        <form action={signOut} className="mobileSignOut"><button type="submit">Cerrar sesión</button></form>
      </nav>
    </details>
  </>;
}
