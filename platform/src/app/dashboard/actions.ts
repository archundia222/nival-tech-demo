"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncGoogleWalletObject } from "@/lib/google-wallet";

export async function updateLoyaltyProgram(formData: FormData) {
  const programName = String(formData.get("programName") ?? "").trim();
  const pointsPerVisit = Number(formData.get("pointsPerVisit"));

  if (programName.length < 2 || programName.length > 80) {
    redirect(`/dashboard?error=${encodeURIComponent("El nombre debe tener entre 2 y 80 caracteres.")}`);
  }

  if (!Number.isInteger(pointsPerVisit) || pointsPerVisit < 1 || pointsPerVisit > 100) {
    redirect(`/dashboard?error=${encodeURIComponent("Los puntos por visita deben estar entre 1 y 100.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_current_loyalty_program", {
    program_name: programName,
    awarded_points: pointsPerVisit,
  });

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard");
  redirect(`/dashboard?message=${encodeURIComponent("Programa de lealtad actualizado.")}`);
}

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
