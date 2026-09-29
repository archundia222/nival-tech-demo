import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isNivalAdmin } from '@/lib/admin';
import { saveReviewCard } from './actions';

export default async function ReviewCardsAdmin({searchParams}:{searchParams:Promise<{error?:string;saved?:string}>}) {
 const p=await searchParams; const s=await createClient(); const {data:{user}}=await s.auth.getUser();
 if(!user) redirect('/auth?next=%2Fadmin%2Freview-cards'); if(!isNivalAdmin(user.email)) redirect('/dashboard');
 const admin=createAdminClient(); const {data}=await admin.from('review_cards').select('code,target_url,active').order('code');
 const origin=(process.env.NIVAL_PUBLIC_ORIGIN||process.env.NEXT_PUBLIC_SITE_URL||'https://nival-tech-platform.vercel.app').replace(/\/$/,'');
 return <main style={{maxWidth:1000,margin:'0 auto',padding:'32px 20px',fontFamily:'Arial,sans-serif'}}>
  <h1>Tarjetas Google Reseñas</h1><p>Los QR impresos nunca cambian. Aquí solo cambias el destino.</p>
  {p.error&&<p style={{color:'#a00'}}>{p.error}</p>}{p.saved&&<p>Tarjeta {p.saved} guardada.</p>}
  <div style={{display:'grid',gap:12}}>{(data??[]).map(c=><form action={saveReviewCard} key={c.code} style={{display:'grid',gridTemplateColumns:'70px minmax(220px,1fr) 110px',gap:10,alignItems:'center',border:'1px solid #ddd',borderRadius:12,padding:12}}>
   <input type="hidden" name="code" value={c.code}/><strong>{c.code}</strong>
   <div><input name="targetUrl" defaultValue={c.target_url??''} placeholder="Pega aquí el enlace de Google Reseñas" style={{width:'100%',padding:10,border:'1px solid #bbb',borderRadius:8}}/><small style={{display:'block',marginTop:4}}>{origin}/r/{c.code}</small></div>
   <button type="submit" style={{padding:'10px 14px',borderRadius:8,border:0,cursor:'pointer'}}>Guardar</button>
  </form>)}</div>
 </main>;
}
