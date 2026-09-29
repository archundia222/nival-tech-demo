'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isNivalAdmin } from '@/lib/admin';

export async function saveReviewCard(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isNivalAdmin(user.email)) redirect('/dashboard');
  const code = String(formData.get('code') ?? '');
  const raw = String(formData.get('targetUrl') ?? '').trim();
  if (!/^\d{3}$/.test(code)) redirect('/admin/review-cards?error=Código+inválido');
  let target: string | null = null;
  if (raw) {
    try {
      const u = new URL(raw);
      if (u.protocol !== 'https:') throw new Error();
      target = u.toString();
    } catch { redirect('/admin/review-cards?error=El+enlace+debe+ser+HTTPS'); }
  }
  const admin = createAdminClient();
  const { error } = await admin.from('review_cards').update({target_url:target,active:true,updated_at:new Date().toISOString()}).eq('code',code);
  if (error) redirect('/admin/review-cards?error=No+se+pudo+guardar');
  revalidatePath('/admin/review-cards');
  redirect('/admin/review-cards?saved='+code);
}
