'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isHttpsUrl, isValidClabe } from '@/lib/payment-profile';
import { redirect } from 'next/navigation';

export interface PaymentFormState { error?: string; saved?: boolean; token?: string }

export async function savePaymentProfile(_state: PaymentFormState, form: FormData): Promise<PaymentFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Tu sesión terminó. Vuelve a iniciar sesión.' };
  const businessId = String(form.get('businessId') ?? '');
  const profileId = String(form.get('profileId') ?? '');
  const { data: membership } = await supabase.from('business_members').select('role')
    .eq('user_id', user.id).eq('business_id', businessId).single();
  if (!membership || !['owner', 'manager'].includes(membership.role)) return { error: 'No tienes permiso para editar este negocio.' };

  const holder = String(form.get('accountHolder') ?? '').trim();
  const bank = String(form.get('bankName') ?? '').trim();
  const clabe = String(form.get('clabe') ?? '').replace(/\s/g, '');
  const concept = String(form.get('concept') ?? '').trim();
  const paymentUrl = String(form.get('paymentUrl') ?? '').trim();
  let visibility = { holder: true, bank: true, clabe: true, concept: true, paymentUrl: true };
  let customSections: Array<{ id: string; title: string; content: string; public: boolean }> = [];
  try {
    visibility = { ...visibility, ...JSON.parse(String(form.get('fieldVisibility') ?? '{}')) };
    const parsed = JSON.parse(String(form.get('customSections') ?? '[]'));
    if (Array.isArray(parsed)) customSections = parsed.map((s) => ({
      id: String(s.id ?? crypto.randomUUID()), title: String(s.title ?? '').trim().slice(0,80),
      content: String(s.content ?? '').trim().slice(0,200), public: s.public !== false,
    }));
  } catch { return { error: 'No pudimos leer los apartados. Recarga e intenta de nuevo.' }; }
  if (holder.length < 2 || holder.length > 120) return { error: 'El titular debe tener entre 2 y 120 caracteres.' };
  if (bank.length < 2 || bank.length > 80) return { error: 'El banco debe tener entre 2 y 80 caracteres.' };
  if (!isValidClabe(clabe)) return { error: 'Revisa la CLABE: debe tener 18 dígitos y un dígito de verificación válido.' };
  if (concept.length > 120) return { error: 'El concepto debe tener como máximo 120 caracteres.' };
  if (paymentUrl && !isHttpsUrl(paymentUrl)) return { error: 'El enlace de pago debe ser una dirección HTTPS válida.' };

  const { data: existing, error: readError } = await supabase.from('payment_profiles').select('id, image_url')
    .eq('id', profileId).eq('business_id', businessId).maybeSingle();
  if (readError) return { error: 'No pudimos leer tu configuración. Intenta de nuevo.' };
  if (!existing) return { error: 'No encontramos esta página Nival Pay.' };
  customSections = customSections.slice(0, 3);
  let imageUrl = form.get('removeImage') === 'on' ? null : existing?.image_url ?? null;
  let uploadedPath: string | null = null;
  const file = form.get('image');
  if (file instanceof File && file.size > 0) {
    if (file.size > 2 * 1024 * 1024) return { error: 'La imagen debe pesar como máximo 2 MB.' };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? 'image/jpeg'
      : bytes.slice(0, 8).every((b, i) => b === [137,80,78,71,13,10,26,10][i]) && bytes.length >= 8 ? 'image/png'
      : new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP' ? 'image/webp' : null;
    if (!type || type !== file.type) return { error: 'Selecciona una imagen JPG, PNG o WebP válida.' };
    const ext = type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp';
    uploadedPath = `${businessId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('payment-images').upload(uploadedPath, bytes, { contentType: type, upsert: false });
    if (error) return { error: 'No pudimos subir la imagen. Tus datos anteriores se conservaron.' };
    imageUrl = supabase.storage.from('payment-images').getPublicUrl(uploadedPath).data.publicUrl;
  }
  const { data, error } = await supabase.from('payment_profiles').update({
    account_holder: holder, bank_name: bank, clabe,
    concept: concept || null, payment_url: paymentUrl || null, image_url: imageUrl,
    holder_visible: !!visibility.holder, bank_visible: !!visibility.bank, clabe_visible: !!visibility.clabe,
    concept_visible: !!visibility.concept, payment_url_visible: !!visibility.paymentUrl,
    custom_sections: customSections, active: form.get('active') === 'on', updated_at: new Date().toISOString(),
  }).eq('id', profileId).eq('business_id', businessId).select('public_token').single();
  if (error) {
    if (uploadedPath) await supabase.storage.from('payment-images').remove([uploadedPath]);
    return { error: 'No se guardaron los cambios. Intenta de nuevo.' };
  }
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/pay');
  revalidatePath(`/pay/${data.public_token}`);
  return { saved: true, token: data.public_token };
}

export async function createAdditionalPaymentProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fpay');
  const { data: membership } = await supabase.from('business_members').select('business_id, role')
    .eq('user_id', user.id).in('role', ['owner', 'manager']).limit(1).maybeSingle();
  if (!membership) redirect('/dashboard/pay?error=No+tienes+permiso.');
  const [{ data: profiles }, { count: paidExtras }] = await Promise.all([
    supabase.from('payment_profiles').select('id, account_holder, bank_name, clabe').eq('business_id', membership.business_id).order('created_at'),
    supabase.from('product_orders').select('id', { count: 'exact', head: true }).eq('business_id', membership.business_id).eq('product_code', 'nival_pay_extra_section').eq('status', 'paid'),
  ]);
  const current = profiles ?? [];
  if (current.length >= 1 + (paidExtras ?? 0)) redirect('/dashboard/pay?new=1');
  const source = current[0];
  if (!source) redirect('/dashboard/pay?error=Configura+primero+tu+Nival+Pay+principal.');
  const { data, error } = await supabase.from('payment_profiles').insert({
    business_id: membership.business_id, display_name: `Nival Pay ${current.length + 1}`,
    account_holder: source.account_holder, bank_name: source.bank_name, clabe: source.clabe, active: true,
  }).select('id').single();
  if (error || !data) redirect('/dashboard/pay?error=No+se+pudo+crear+la+nueva+Nival+Pay.');
  revalidatePath('/dashboard/pay');
  redirect(`/dashboard/pay?profile=${data.id}`);
}
