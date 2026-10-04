import { notFound } from "next/navigation";
import { DM_Sans, Manrope } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PaymentPageView } from "./payment-page-view";
import { VisitTracker } from "./visit-tracker";
import { nivalWhatsApp } from "@/lib/managed-business";
import { publicSiteUrl } from "@/lib/payment-profile";
import styles from "./payment-page.module.css";
import '../../managed.css';

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-pay-body" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-pay-display" });
export const metadata = { robots: { index: false, follow: false } };

interface PaymentPageProps { params: Promise<{ token: string }>; searchParams: Promise<{ visit?: string }>; }

export default async function PaymentPage({ params, searchParams }: PaymentPageProps) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_payment_profile_v4", { profile_token: token });
  if (error) throw new Error('No pudimos cargar la tarjeta.');
  if (!data?.[0]) {
    const admin = createAdminClient();
    const { data: card } = await admin.from('payment_profiles').select('business_id').eq('public_token', token).maybeSingle();
    const { data: managed } = card ? await admin.from('nival_managed_businesses').select('business_id').eq('business_id',card.business_id).maybeSingle() : { data: null };
    if (!managed) notFound();
    return <main className="managedLogin"><section className="managedPublicStatus"><span className="managedBrand">NIVAL PAY</span><h1>Tarjeta no disponible</h1><p>Consulta con el negocio para recibir sus datos de pago.</p></section></main>;
  }
  const admin = createAdminClient();
  const { data: cardDisplay } = await admin.from('payment_profiles').select('display_name').eq('public_token', token).maybeSingle();
  const profile = { ...data[0], display_name: cardDisplay?.display_name ?? data[0].business_name };
  const { visit } = await searchParams;
  const publicUrl = `${publicSiteUrl()}/pay/${token}`;
  const contact = await nivalWhatsApp(`Hola, vi Nival Pay en ${data[0].business_name}. Me interesa para mi negocio. Página: ${publicUrl} · Ref: ${data[0].business_slug ?? token.slice(0,8)}`);

  return <main className={`${styles.pageShell} ${dmSans.variable} ${manrope.variable}`}>
    <VisitTracker token={token} entryVisit={typeof visit === 'string' ? visit : undefined} />
    <PaymentPageView profile={profile} trackingToken={token} contactUrl={contact ?? undefined} />
  </main>;
}
