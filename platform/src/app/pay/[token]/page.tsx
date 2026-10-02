import { notFound } from "next/navigation";
import { DM_Sans, Manrope } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { PaymentPageView } from "./payment-page-view";
import { VisitTracker } from "./visit-tracker";
import styles from "./payment-page.module.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-pay-body" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-pay-display" });
export const metadata = { robots: { index: false, follow: false } };

interface PaymentPageProps { params: Promise<{ token: string }>; searchParams: Promise<{ visit?: string }>; }

export default async function PaymentPage({ params, searchParams }: PaymentPageProps) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_payment_profile_v4", { profile_token: token });
  if (error || !data?.[0]) notFound();
  const { visit } = await searchParams;

  return <main className={`${styles.pageShell} ${dmSans.variable} ${manrope.variable}`}>
    <VisitTracker token={token} entryVisit={typeof visit === 'string' ? visit : undefined} />
    <PaymentPageView profile={data[0]} trackingToken={token} />
  </main>;
}
