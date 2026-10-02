import Link from 'next/link';
import { signOut } from '@/app/auth/actions';
import styles from './dashboard-navigation.module.css';
import { MobileAutoCloseLink } from './mobile-auto-close-link';
import { MobileMoreToggle } from './mobile-more-toggle';
import { createClient } from '@/lib/supabase/server';
import { getActiveBusinessMembership, getBusinessChoices } from '@/lib/active-business';
import { switchActiveBusiness } from './workspace-actions';

type ActiveItem = 'resumen' | 'nival-pay' | 'nival-card' | 'agregar-tarjetas' | 'cards-add' | 'compartir-paginas';

const payItems: Array<{ id: ActiveItem; label: string; href: string }> = [
  { id: 'nival-pay', label: 'Editar', href: '/dashboard/pay' },
  { id: 'agregar-tarjetas', label: 'Mis tarjetas', href: '/dashboard/pay?view=add' },
  { id: 'compartir-paginas', label: 'Compartir', href: '/dashboard/pay?view=share' },
];
function NavIcon({ children }: { children: React.ReactNode }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>; }
function MobileGroup({ title, icon, items, open }: { title: string; icon: React.ReactNode; items: Array<{ label: string; href: string }>; open?: boolean }) {
  return <details className="nvMobileGroup" open={open}><summary style={{color:'#123f31'}}><span className="nvMobileIcon"><NavIcon>{icon}</NavIcon></span><span style={{color:'#123f31',opacity:1}}>{title}</span><span className="nvMobileChevron" style={{color:'#123f31'}} aria-hidden="true">⌄</span></summary><div className="nvMobileGroupLinks">{items.map(item=><MobileAutoCloseLink key={item.href} href={item.href}>{item.label}</MobileAutoCloseLink>)}</div></details>;
}

export async function DashboardNavigation({ businessName, active }: { businessName: string; active: ActiveItem }) {
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 const [workspaceChoices,activeMembership]=user?await Promise.all([getBusinessChoices(user.id),getActiveBusinessMembership(user.id)]):[[],null];
 const canManageWorkspace=activeMembership?.role==='owner'||activeMembership?.role==='manager';
 const payActive=payItems.some(i=>i.id===active);
 return <>
 <aside className="dashboardSidebar professionalSidebar v2Sidebar">
  <Link className="professionalBrand" href="/dashboard"><span>N</span><b>NIVAL</b><small>tech</small></Link>
  <div className="workspaceSwitcher"><span>{businessName.slice(0,1).toUpperCase()}</span><div><small>TU NEGOCIO</small><strong>{businessName}</strong></div></div>
  {workspaceChoices.length>1&&<form action={switchActiveBusiness} className="workspaceSwitcherForm"><label className="srOnly" htmlFor="v2Business">Cambiar negocio</label><select id="v2Business" name="businessId" defaultValue={activeMembership?.business_id??''}>{workspaceChoices.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select><button type="submit">Cambiar</button></form>}
  <nav className="sidebarNav professionalNav" aria-label="Navegación del panel">
   {canManageWorkspace&&<Link className={active==='resumen'?'sidebarMainProduct active':'sidebarMainProduct'} href="/dashboard"><NavIcon><path d="M4 19V9l8-5 8 5v10"/><path d="M8 19v-6h8v6"/></NavIcon><span>Inicio</span></Link>}
   {canManageWorkspace&&<div className="sidebarSectionLabel">NIVAL PAY</div>}
   {canManageWorkspace&&<Link className={active==='cards-add'?'sidebarMainProduct active':'sidebarMainProduct'} href="/dashboard/cards/add"><NavIcon><path d="M12 4v16M4 12h16"/></NavIcon><span>Comprar Nival Pay</span></Link>}
   {canManageWorkspace&&<details className={styles.productGroup} open={payActive}><summary className="sidebarMainProduct"><NavIcon><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10"/></NavIcon><span>Nival Pay</span><i>⌄</i></summary><div className="sidebarSubmenu"><Link href="/dashboard/pay">Editar</Link><Link href="/dashboard/pay?view=add">Mis tarjetas</Link><Link href="/dashboard/pay?view=share">Compartir</Link></div></details>}
  </nav>
  <div className="sidebarFooter professionalFooter"><Link href="/support">Ayuda</Link><form action={signOut}><button className="textButton" type="submit">Cerrar sesión</button></form></div>
 </aside>
 <details id="v2MobileMore" className="dashboardMobileMenu professionalMobileMenu v2MobileMenu">
  <summary><span className="hamburgerIcon" aria-hidden="true"><i/><i/><i/></span><span>NIVAL tech</span><strong>{businessName}</strong></summary>
  <nav aria-label="Más opciones del panel">
   {workspaceChoices.length>1&&<form action={switchActiveBusiness} className="mobileWorkspaceSwitcher"><label>NEGOCIO<select name="businessId" defaultValue={activeMembership?.business_id??''}>{workspaceChoices.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><button type="submit">Cambiar</button></form>}
   <MobileAutoCloseLink className="nvMobileHome" href="/dashboard"><span className="nvMobileIcon"><NavIcon><path d="M4 19V9l8-5 8 5v10"/><path d="M8 19v-6h8v6"/></NavIcon></span>Inicio</MobileAutoCloseLink>
   {canManageWorkspace&&<>
    <MobileAutoCloseLink className="nvMobileHome" href="/dashboard/cards/add"><span className="nvMobileIcon"><NavIcon><path d="M12 4v16M4 12h16"/></NavIcon></span>Comprar Nival Pay</MobileAutoCloseLink>
    <MobileGroup title="Nival Pay" icon={<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10"/></>} items={payItems.map(({label,href})=>({label,href}))} open={payActive}/>
   </>}
   <form action={signOut} className="mobileSignOut"><button type="submit">Cerrar sesión</button></form>
  </nav>
 </details>
 <nav className="v2BottomNav" aria-label="Navegación principal móvil"><Link href="/dashboard">Inicio</Link>{canManageWorkspace&&<Link href="/dashboard/pay">Pay</Link>}<MobileMoreToggle/></nav>
 </>;
}
