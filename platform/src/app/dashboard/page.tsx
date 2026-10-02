import { redirect } from 'next/navigation';
import { getManagedAdmin } from '@/lib/managed-business';
export default async function DashboardPage() { redirect(await getManagedAdmin() ? '/admin/negocios' : '/negocio/panel'); }
