"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function enrollCustomer(formData: FormData) {
  const slug = value(formData, "slug");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("enroll_customer", {
    business_slug: slug,
    customer_name: value(formData, "name"),
    customer_phone: value(formData, "phone"),
    customer_email: value(formData, "email") || null,
    marketing_consent: formData.get("marketingConsent") === "on",
    p_privacy_notice_version: "2026-09-09",
  });

  if (error) redirect(`/b/${encodeURIComponent(slug)}?error=${encodeURIComponent(error.message)}`);

  const enrollment = data?.[0];
  if (!enrollment) redirect(`/b/${encodeURIComponent(slug)}?error=${encodeURIComponent("No pudimos crear la tarjeta.")}`);
  redirect(`/card/${enrollment.account_token}`);
}
