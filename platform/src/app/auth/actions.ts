"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { privacyDisclosuresReady } from "@/lib/legal";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function safeNext(formData: FormData) {
  const next = value(formData, "next");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function isEmailNotConfirmed(error: { code?: string; message?: string } | null) {
  return error?.code === "email_not_confirmed" || /email not confirmed/i.test(error?.message ?? "");
}

export async function signIn(formData: FormData) {
  const next = safeNext(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: value(formData, "email"),
    password: value(formData, "password"),
  });

  if (error) {
    const message = isEmailNotConfirmed(error)
      ? "Tu correo todavía no está confirmado. Reenvía el correo de confirmación y abre el enlace nuevo."
      : "Correo o contraseña incorrectos.";
    redirect(`/auth?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function signUp(formData: FormData) {
  const next = safeNext(formData);
  if (!privacyDisclosuresReady()) {
    redirect(`/auth?mode=signup&error=${encodeURIComponent("El registro está temporalmente deshabilitado hasta completar el aviso de privacidad.")}&next=${encodeURIComponent(next)}`);
  }
  if (formData.get("legalConsent") !== "on") {
    redirect(`/auth?mode=signup&error=${encodeURIComponent("Debes aceptar los Términos y confirmar que recibiste el Aviso de privacidad.")}&next=${encodeURIComponent(next)}`);
  }
  const supabase = await createClient();
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "https://nival-tech-platform.vercel.app";
  const email = value(formData, "email");
  const { data, error } = await supabase.auth.signUp({
    email,
    password: value(formData, "password"),
    options: {
      data: { full_name: value(formData, "fullName"), terms_accepted_at: new Date().toISOString(), terms_version: "2026-09-24", privacy_notice_version: "2026-09-24" },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  // Confirmed duplicate signups may return an obfuscated user instead of an error.
  // Use only the signup response; do not query the private user directory.
  const alreadyRegistered = error?.code === "user_already_exists"
    || error?.code === "email_exists"
    || (!error && !data.session && data.user?.identities?.length === 0);
  if (alreadyRegistered) {
    redirect(`/auth?message=${encodeURIComponent("Ya tenemos una cuenta registrada con este correo. Inicia sesión con tu contraseña; no necesitas registrarte de nuevo.")}&next=${encodeURIComponent(next)}`);
  }
  if (error) redirect(`/auth?mode=signup&error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  if (data.session) redirect(next);
  redirect(`/auth?message=${encodeURIComponent(`Revisa ${email} y la carpeta de spam para confirmar tu cuenta. Si el enlace falla, usa “Reenviar confirmación” en esta pantalla.`)}&next=${encodeURIComponent(next)}`);
}

export async function resendConfirmation(formData: FormData) {
  const next = safeNext(formData);
  const email = value(formData, "email");
  if (!email) {
    redirect(`/auth?error=${encodeURIComponent("Escribe tu correo para reenviar la confirmación.")}&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "https://nival-tech-platform.vercel.app";
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/auth?error=${encodeURIComponent("No se pudo reenviar la confirmación todavía. Espera un minuto e inténtalo de nuevo.")}&next=${encodeURIComponent(next)}`);
  }

  redirect(`/auth?message=${encodeURIComponent("Te enviamos un nuevo correo de confirmación. Usa únicamente el enlace más reciente.")}&next=${encodeURIComponent(next)}`);
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
  redirect(safeNext(formData));
}
