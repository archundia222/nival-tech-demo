'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isNivalAdmin } from '@/lib/admin';

async function adminContext(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 if(!user||!isNivalAdmin(user.email)) redirect('/dashboard');
 return createAdminClient();
}
export async function createReviewBatch(formData:FormData){
 const admin=await adminContext();
 const quantity=Math.min(500,Math.max(1,Number(formData.get('quantity')||20)));
 const name=String(formData.get('name')||'Lote').trim()||'Lote';
 const qrX=Number(formData.get('qrX')||.66),qrY=Number(formData.get('qrY')||.16),qrSize=Number(formData.get('qrSize')||.25);
 const numberX=Number(formData.get('numberX')||.86),numberY=Number(formData.get('numberY')||.88);
 const {data:last}=await admin.from('review_cards').select('code').order('code',{ascending:false}).limit(1).maybeSingle();
 const start=Math.max(1,Number(last?.code||0)+1),end=start+quantity-1;
 if(end>999) redirect('/admin/review-cards?error=Se+agotó+la+numeración+de+3+dígitos');
 const {data:batch,error:bErr}=await admin.from('review_card_batches').insert({name,quantity,start_number:start,end_number:end,qr_x:qrX,qr_y:qrY,qr_size:qrSize,number_x:numberX,number_y:numberY}).select('id').single();
 if(bErr||!batch) redirect('/admin/review-cards?error=No+se+pudo+crear+el+lote');
 const rows=Array.from({length:quantity},(_,i)=>({code:String(start+i).padStart(3,'0'),batch_id:batch.id,active:true}));
 const {error}=await admin.from('review_cards').insert(rows);
 if(error){await admin.from('review_card_batches').delete().eq('id',batch.id);redirect('/admin/review-cards?error=No+se+pudieron+crear+las+tarjetas');}
 revalidatePath('/admin/review-cards'); redirect('/admin/review-cards/print/'+batch.id);
}
export async function saveReviewCard(formData:FormData){
 const admin=await adminContext(); const code=String(formData.get('code')??''); const raw=String(formData.get('targetUrl')??'').trim();
 if(!/^\d{3}$/.test(code)) redirect('/admin/review-cards?error=Código+inválido');
 let target:string|null=null;if(raw){try{const u=new URL(raw);if(u.protocol!=='https:')throw 0;target=u.toString()}catch{redirect('/admin/review-cards?error=El+enlace+debe+ser+HTTPS')}}
 const {error}=await admin.from('review_cards').update({target_url:target,active:true,updated_at:new Date().toISOString()}).eq('code',code);
 if(error)redirect('/admin/review-cards?error=No+se+pudo+guardar');revalidatePath('/admin/review-cards');redirect('/admin/review-cards?saved='+code);
}