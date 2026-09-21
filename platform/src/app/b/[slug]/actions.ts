"use server";

import { redirect } from "next/navigation";
import { enrollPointsCustomer } from "@/app/points/actions";

export async function enrollCustomer(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const result = await enrollPointsCustomer(formData);
  if (!result.ok || !result.token) {
    redirect(`/b/${encodeURIComponent(slug)}?error=${encodeURIComponent(result.error ?? "No pudimos crear la tarjeta.")}`);
  }
  redirect(`/card/${result.token}`);
}
