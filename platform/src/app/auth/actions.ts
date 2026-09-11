"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function safeNext(formData: FormData) {
  const next = value(formData, "next");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signIn(formData: FormData) {
  const next = safeNext(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: value(formData, "email"),
    password: value(formData, "password"),
  });

  if (error) redirect(`/auth?error=${encodeURIComponent("Correo o contraseña incorrectos.")}&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signUp(formData: FormData) {
  const next = safeNext(formData);
  const supabase = await createClient();
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "https://nival-tech-platform.vercel.app";
  const email = value(formData, "email");
  const { data, error } = await supabase.auth.signUp({
    email,
    password: value(formData, "password"),
    options: {
      data: { full_name: value(formData, "fullName") },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) redirect(`/auth?mode=signup&error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  if (data.session) redirect(next);
  redirect(`/auth?message=${encodeURIComponent(`Enviamos un enlace de confirmación a ${email}. Después vuelve a abrir tu invitación.`)}&next=${encodeURIComponent(next)}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth");
}

export async function createBusiness(formData: FormData) {
  const supabase = await createClient();
  const businessName = value(formData, "businessName");
  const businessSlug = value(formData, "businessSlug")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { error } = await supabase.rpc("create_business_for_current_user", {
    business_name: businessName,
    business_slug: businessSlug,
  });

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}
