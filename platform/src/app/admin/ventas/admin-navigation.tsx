import Link from 'next/link';
import { signOut } from '@/app/auth/actions';

export type AdminSection = 'nival-pay' | 'clientes' | 'resumen' | 'nival-card' | 'configuracion' | 'inteligencia';

const items: Array<{ id: AdminSection; label: string; icon: string; soon?: boolean }> = [
  { id: 'nival-pay', label: 'Nival Pay', icon: '▰' },
  { id: 'clientes', label: 'Clientes', icon: '◎' },
  { id: 'resumen', label: 'Resumen', icon: '⌂' },
  { id: 'nival-card', label: 'Nival Card', icon: '▣' },
  { id: 'configuracion', label: 'Configuración', icon: '⚙' },
  { id: 'inteligencia', label: 'Inteligencia', icon: '✦', soon: true },
];

export function AdminNavigation({ active, email }: { active: AdminSection; email: string }) {
  return <>
    <aside className="adminSidebar">
      <Link className="adminBrand" href="/admin/ventas"><span>N</span><b>NIVAL</b><small>operaciones</small></Link>
      <nav>{items.map((item) => <Link key={item.id} className={active === item.id ? 'active' : undefined} href={`/admin/ventas?section=${item.id}`}><i>{item.icon}</i><span>{item.label}{item.soon && <small>Próximamente</small>}</span></Link>)}</nav>
      <div className="adminIdentity"><span>{email.slice(0, 1).toUpperCase()}</span><div><strong>Administrador</strong><small>{email}</small></div></div>
      <form action={signOut}><button>Cerrar sesión</button></form>
    </aside>
    <details className="adminMobileNav"><summary><b>NIVAL</b><span>Menú</span></summary><nav>{items.map((item) => <Link key={item.id} href={`/admin/ventas?section=${item.id}`}>{item.label}</Link>)}</nav></details>
  </>;
}
