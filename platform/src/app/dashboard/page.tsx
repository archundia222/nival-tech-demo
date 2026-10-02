import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveBusinessMembership } from '@/lib/active-business';
import { signOut } from '@/app/auth/actions';
import { BusinessOnboardingForm } from './business-onboarding-form';
export default async function DashboardPage({searchParams}:{searchParams:Promise<{error?:string;next?:string}>}) {
 const params=await searchParams; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect('/auth');
 const membership=await getActiveBusinessMembership(user.id);
 if(membership) {
  if(membership.role==='staff') return <main className="legalShell"><section className="legalCard"><h1>Nival Pay</h1><p>La configuración de cobros está disponible para el propietario y los gerentes del negocio.</p><form action={signOut}><button type="submit">Cerrar sesión</button></form></section></main>;
  redirect('/dashboard/pay');
 }
 const next=params.next; const destination=next && ['/checkout','/dashboard/pay','/dashboard/cards/add'].some(p=>next===p||next.startsWith(p+'?')||next.startsWith(p+'/'))?next:'/dashboard/pay';
 return <main className="dashboardShell"><header className="dashboardTopbar"><span className="brand">NIVAL tech</span><form action={signOut}><button className="textButton">Cerrar sesión</button></form></header><section className="onboardingCard"><p className="eyebrow">NIVAL PAY</p><h1>Crea tu primer negocio</h1><p>Configura el negocio que aparecerá en tu página de cobro.</p>{params.error&&<p role="alert" className="formMessage errorMessage">{params.error}</p>}<BusinessOnboardingForm next={destination}/></section></main>;
}
