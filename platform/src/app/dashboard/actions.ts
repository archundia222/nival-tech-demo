"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncGoogleWalletObject } from "@/lib/google-wallet";

export async function recordVisit(formData: FormData) {
  const customerId = String(formData.get("customerId") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_customer_visit", {
    target_customer_id: customerId,
  });

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);

  const { data: customer } = await supabase
    .from("customers")
    .select("name, businesses(name), loyalty_accounts(points_balance, public_token), visits(id)")
    .eq("id", customerId)
    .single();

  if (customer) {
    const account = Array.isArray(customer.loyalty_accounts)
      ? customer.loyalty_accounts[0]
      : customer.loyalty_accounts;
    const business = Array.isArray(customer.businesses)
      ? customer.businesses[0]
      : customer.businesses;

    if (account?.public_token) {
      try {
        await syncGoogleWalletObject({
          token: account.public_token,
          businessName: business?.name ?? "Nival Tech",
          customerName: customer.name,
          points: Number(account.points_balance),
          visits: customer.visits?.length ?? 0,
        });
      } catch (walletError) {
        console.error("Google Wallet sync error", walletError);
      }
    }
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Visita registrada y puntos actualizados.");
}
