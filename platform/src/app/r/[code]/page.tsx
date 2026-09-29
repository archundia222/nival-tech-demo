import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

export default async function ReviewCardRedirect({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^\d{3}$/.test(code)) notFound();
  const admin = createAdminClient();
  const { data } = await admin.from('review_cards').select('target_url,active').eq('code', code).maybeSingle();
  if (!data) notFound();
  if (data.active && data.target_url) redirect(data.target_url);
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,fontFamily:'Arial,sans-serif',background:'#f7f8f5'}}>
    <section style={{maxWidth:520,textAlign:'center',background:'#fff',padding:'42px 30px',borderRadius:24,border:'1px solid #e4e7df'}}>
      <div style={{fontWeight:800,letterSpacing:'.14em',fontSize:13}}>NIVAL</div>
      <h1 style={{fontSize:30,margin:'18px 0 10px'}}>Tarjeta aún sin asignar</h1>
      <p style={{color:'#596056',lineHeight:1.6}}>Esta Nival Card está lista, pero todavía no tiene un negocio asignado.</p>
      <small style={{color:'#8a9087'}}>Tarjeta {code}</small>
    </section>
  </main>;
}
