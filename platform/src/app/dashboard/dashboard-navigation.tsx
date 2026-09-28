import Link from 'next/link';
import { signOut } from '@/app/auth/actions';
import styles from './dashboard-navigation.module.css';
import { MobileAutoCloseLink } from './mobile-auto-close-link';
import { MobileMoreToggle } from './mobile-more-toggle';
import { createClient } from '@/lib/supabase/server';
import { getActiveBusinessMembership, getBusinessChoices } from '@/lib/active-business';
import { switchActiveBusiness } from './workspace-actions';

type ActiveItem =
  | 'resumen' | 'inteligencia' | 'inteligencia-clientes' | 'inteligencia-importar' | 'inteligencia-asistente'
  | 'inteligencia-oportunidades' | 'inteligencia-recurrentes' | 'inteligencia-riesgo' | 'inteligencia-inactivos'
  | 'inteligencia-campanas' | 'inteligencia-impacto' | 'inteligencia-datos' | 'puntos' | 'puntos-registro'
  | 'puntos-analitica' | 'puntos-clientes' | 'puntos-visitas' | 'puntos-canjes' | 'puntos-promociones'
  | 'puntos-compartir' | 'puntos-configuracion' | 'puntos-pro' | 'clientes' | 'nival-card' | 'nival-pay'
  | 'agregar-tarjetas' | 'compartir-paginas' | 'analiticas' | 'reseñas-add' | 'reseñas-share' | 'wifi-add' | 'wifi-share' | 'perfil-digital' | 'perfil-compartir' | 'web-ia' | 'reseñas' | 'wifi' | 'configuracion';

const payItems: Array<{ id: ActiveItem; label: string; href: string }> = [
  { id: 'nival-pay', label: 'Mi tarjeta Pay', href: '/dashboard/pay' },
  { id: 'agregar-tarjetas', label: 'Agregar o elegir tarjeta Pay', href: '/dashboard/pay?view=add' },
  { id: 'compartir-paginas', label: 'Compartir / acceso Pay', href: '/dashboard/pay?view=share' },
];

const reviewItems: Array<{ id: ActiveItem; label: string; href: string }> = [
  { id: 'reseñas', label: 'Mi tarjeta Reseñas', href: '/dashboard/reviews' },
  { id: 'reseñas-add', label: 'Agregar o elegir tarjeta Reseñas', href: '/dashboard/reviews?view=add' },
  { id: 'reseñas-share', label: 'Compartir / acceso Reseñas', href: '/dashboard/reviews?view=share' },
];
const wifiItems: Array<{ id: ActiveItem; label: string; href: string }> = [
  { id: 'wifi', label: 'Mi tarjeta WiFi', href: '/dashboard/wifi' },
  { id: 'wifi-add', label: 'Agregar o elegir tarjeta WiFi', href: '/dashboard/wifi?view=add' },
  { id: 'wifi-share', label: 'Compartir / acceso WiFi', href: '/dashboard/wifi?view=share' },
];

function NavIcon({ children }: { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

function MobileGroup({ title, icon, items, open }: { title: string; icon: React.ReactNode; items: Array<{ label: string; href: string }>; open?: boolean }) {
  return <details className="nvMobileGroup" open={open}><summary><span className="nvMobileIcon"><NavIcon>{icon}</NavIcon></span><span>{title}</span><span className="nvMobileChevron" aria-hidden="true">⌄</span></summary><div className="nvMobileGroupLinks">{items.map(item=><MobileAutoCloseLink key={item.href} href={item.href}>{item.label}</MobileAutoCloseLink>)}</div></details>;
}

export async function DashboardNavigation({ businessName, active }: { businessName: string; active: ActiveItem; productLevel?: 'pay' | 'intelligence' }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [workspaceChoices, activeMembership] = user ? await Promise.all([getBusinessChoices(user.id), getActiveBusinessMembership(user.id)]) : [[], null];
  const canManageWorkspace = activeMembership?.role === 'owner' || activeMembership?.role === 'manager';

  const payActive = payItems.some((item) => item.id === active);
  const reviewActive = reviewItems.some((item) => item.id === active);
  const wifiActive = wifiItems.some((item) => item.id === active);
  const cardsActive = payActive || reviewActive || wifiActive;
  return <>
    <aside className="dashboardSidebar professionalSidebar v2Sidebar">
      <Link className="professionalBrand" href="/dashboard"><span>N</span><b>NIVAL</b><small>tech</small></Link>
      <div className="workspaceSwitcher"><span>{businessName.slice(0,1).toUpperCase()}</span><div><small>TU NEGOCIO</small><strong>{businessName}</strong></div></div>
      {workspaceChoices.length > 1 && <form action={switchActiveBusiness} className="workspaceSwitcherForm"><label className="srOnly" htmlFor="v2Business">Cambiar negocio</label><select id="v2Business" name="businessId" defaultValue={activeMembership?.business_id ?? ''}>{workspaceChoices.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select><button type="submit">Cambiar</button></form>}
      <nav className="sidebarNav professionalNav" aria-label="Navegación del panel">
        {canManageWorkspace && <Link className={active==='resumen'?'sidebarMainProduct active':'sidebarMainProduct'} href="/dashboard"><NavIcon><path d="M4 19V9l8-5 8 5v10"/><path d="M8 19v-6h8v6"/></NavIcon><span>Inicio</span></Link>}
        {canManageWorkspace && <><div className="sidebarSectionLabel">MI NEGOCIO</div><details className={styles.productGroup}><summary className="sidebarMainProduct"><NavIcon><path d="M4 5h16v14H4z"/><path d="M7 9h10M7 13h7"/></NavIcon><span>Landing page</span><i>⌄</i></summary><div className="sidebarSubmenu"><Link href="/dashboard?section=perfil-digital">Editar</Link><Link href="/dashboard?section=perfil-compartir">Compartir</Link></div></details><p className="sidebarFreeNote">Incluida gratis al comprar cualquier producto.</p></>}
        {canManageWorkspace && <div className="sidebarSectionLabel">NIVAL CARDS</div>}
        {canManageWorkspace && <details className={styles.productGroup} open={payActive}><summary className="sidebarMainProduct"><NavIcon><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10"/></NavIcon><span>Nival Pay</span><i>⌄</i></summary><div className="sidebarSubmenu"><Link href="/dashboard/pay">Editar</Link><Link href="/dashboard/pay?view=add">Mis Nival Pay / comprar otra</Link><Link href="/dashboard/pay?view=share">Compartir</Link></div></details>}
        {canManageWorkspace && <details className={styles.productGroup} open={reviewActive}><summary className="sidebarMainProduct"><NavIcon><path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></NavIcon><span>Nival Reseñas</span><i>⌄</i></summary><div className="sidebarSubmenu"><Link href="/dashboard/reviews">Editar</Link><Link href="/dashboard/reviews?view=add">Mis Nival Reseñas / comprar otra</Link><Link href="/dashboard/reviews?view=share">Compartir</Link></div></details>}
        {canManageWorkspace && <details className={styles.productGroup} open={wifiActive}><summary className="sidebarMainProduct"><NavIcon><path d="M5 10a11 11 0 0114 0M8 14a6 6 0 018 0M11 18a2 2 0 012 0"/></NavIcon><span>Nival WiFi</span><i>⌄</i></summary><div className="sidebarSubmenu"><Link href="/dashboard/wifi">Editar</Link><Link href="/dashboard/wifi?view=add">Mis Nival WiFi / comprar otra</Link><Link href="/dashboard/wifi?view=share">Compartir</Link></div></details>}
      </nav>
      <div className="sidebarFooter professionalFooter"><Link href="/support">Ayuda</Link><form action={signOut}><button className="textButton" type="submit">Cerrar sesión</button></form></div>
    </aside>
    <details id="v2MobileMore" className="dashboardMobileMenu professionalMobileMenu v2MobileMenu">
      <summary><span className="hamburgerIcon" aria-hidden="true"><i/><i/><i/></span><span>NIVAL tech</span><strong>{businessName}</strong></summary>
      <nav aria-label="Más opciones del panel">
        {workspaceChoices.length>1 && <form action={switchActiveBusiness} className="mobileWorkspaceSwitcher"><label>NEGOCIO<select name="businessId" defaultValue={activeMembership?.business_id ?? ''}>{workspaceChoices.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><button type="submit">Cambiar</button></form>}
        <MobileAutoCloseLink className="nvMobileHome" href="/dashboard"><span className="nvMobileIcon"><NavIcon><path d="M4 19V9l8-5 8 5v10"/><path d="M8 19v-6h8v6"/></NavIcon></span>Inicio</MobileAutoCloseLink>
        {canManageWorkspace && <>
          <MobileGroup title="Landing page" icon={<><path d="M4 5h16v14H4z"/><path d="M7 9h10M7 13h7"/></>} items={[{label:'Editar página',href:'/dashboard?section=perfil-digital'},{label:'Compartir página',href:'/dashboard?section=perfil-compartir'}]}/>
          <MobileGroup title="Nival Pay" icon={<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10"/></>} items={[{label:'Editar tarjeta',href:'/dashboard/pay'},{label:'Mis tarjetas y comprar otra',href:'/dashboard/pay?view=add'},{label:'Compartir acceso',href:'/dashboard/pay?view=share'}]} open={payActive}/>
          <MobileGroup title="Nival Reseñas" icon={<path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>} items={[{label:'Editar tarjeta',href:'/dashboard/reviews'},{label:'Mis tarjetas y comprar otra',href:'/dashboard/reviews?view=add'},{label:'Compartir acceso',href:'/dashboard/reviews?view=share'}]} open={reviewActive}/>
          <MobileGroup title="Nival WiFi" icon={<><path d="M5 10a11 11 0 0114 0M8 14a6 6 0 018 0M11 18a2 2 0 012 0"/></>} items={[{label:'Editar tarjeta',href:'/dashboard/wifi'},{label:'Mis tarjetas y comprar otra',href:'/dashboard/wifi?view=add'},{label:'Compartir acceso',href:'/dashboard/wifi?view=share'}]} open={wifiActive}/>
        </>}<form action={signOut} className="mobileSignOut"><button type="submit">Cerrar sesión</button></form>
      </nav>
    </details>
    <nav className="v2BottomNav" aria-label="Navegación principal móvil"><Link href="/dashboard">Inicio</Link>{canManageWorkspace && <Link href="/dashboard/pay">Pay</Link>}<MobileMoreToggle/></nav>
  </>;
}
