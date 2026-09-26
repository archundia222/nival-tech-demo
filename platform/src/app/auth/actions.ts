"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

async function authRedirectOrigin() {
  if (process.env.VERCEL_ENV === "production") {
    return (process.env.NIVAL_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "https://nival-tech-platform.vercel.app").replace(/\/$/, "");
  }
  const requestHeaders = await headers();
  return (requestHeaders.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://nival-tech-platform.vercel.app").replace(/\/$/, "");
}

export async function signIn(formData: FormData) {
  const next = safeNext(formData);
  const email = value(formData, "email");
  const password = value(formData, "password");

  // Demo access is synthetic. Authenticate it with the server-side Supabase
  // client after repairing the Auth user, then persist that verified session
  // into the normal cookie-backed client. This avoids depending on a stale
  // seeded password hash or a mismatched browser-side credential state.
  if (email.toLowerCase() === "demo@nivaltech.dev" && password === "NivalDemo!26-R7xQ") {
    const admin = createAdminClient();
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const demoUser = usersData?.users.find((candidate) => candidate.email?.toLowerCase() === "demo@nivaltech.dev");

    if (listError || !demoUser) {
      console.error("[auth] Demo account lookup failed", { code: listError?.code ?? null });
      redirect(`/auth?error=${encodeURIComponent("La cuenta demo no está disponible todavía. Intenta de nuevo en un momento.")}&next=${encodeURIComponent(next)}`);
    }

    const { error: repairError } = await admin.auth.admin.updateUserById(demoUser.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(demoUser.user_metadata ?? {}), full_name: "Nival Demo" },
      app_metadata: { ...(demoUser.app_metadata ?? {}), account_type: "demo" },
    });

    if (repairError) {
      console.error("[auth] Demo account repair failed", { code: repairError.code ?? null });
      redirect(`/auth?error=${encodeURIComponent("No pudimos preparar la cuenta demo. Intenta de nuevo en un momento.")}&next=${encodeURIComponent(next)}`);
    }

    const { data: demoSession, error: demoSignInError } = await admin.auth.signInWithPassword({ email, password });
    if (demoSignInError || !demoSession.session) {
      console.error("[auth] Demo sign-in verification failed", { code: demoSignInError?.code ?? null });
      redirect(`/auth?error=${encodeURIComponent("No pudimos iniciar la cuenta demo. Intenta de nuevo en un momento.")}&next=${encodeURIComponent(next)}`);
    }

    const supabase = await createClient();
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: demoSession.session.access_token,
      refresh_token: demoSession.session.refresh_token,
    });
    if (sessionError) {
      console.error("[auth] Demo session persistence failed", { code: sessionError.code ?? null });
      redirect(`/auth?error=${encodeURIComponent("No pudimos abrir la sesión demo. Intenta de nuevo en un momento.")}&next=${encodeURIComponent(next)}`);
    }

    redirect(next);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
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
  const supabase = await createClient();
  const origin = await authRedirectOrigin();
  const email = value(formData, "email");
  const { data, error } = await supabase.auth.signUp({
    email,
    password: value(formData, "password"),
    options: {
      data: { full_name: value(formData, "fullName") },
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
  const origin = await authRedirectOrigin();
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

  if (error) {
    const message = error.code === "23505"
      ? "Ese enlace público ya está ocupado. Prueba una variante, por ejemplo agregando tu colonia o una palabra corta."
      : "No pudimos crear tu negocio. Revisa el nombre y el enlace e inténtalo de nuevo.";
    redirect(`/dashboard?error=${encodeURIComponent(message)}`);
  }
  redirect(safeNext(formData));
}


export async function requestPasswordReset(formData: FormData) {
  const email = value(formData, "email");
  if (!email) {
    redirect(`/auth?error=${encodeURIComponent("Escribe tu correo para recuperar el acceso.")}`);
  }

  const supabase = await createClient();
  const origin = await authRedirectOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/auth/update-password")}`,
  });

  // Keep the public response generic so the form does not reveal whether an
  // email is registered.
  if (error) {
    console.warn("[auth] Password reset request failed", { code: error.code ?? null });
  }
  redirect(`/auth?message=${encodeURIComponent("Si existe una cuenta con ese correo, recibirás un enlace para cambiar tu contraseña. Revisa también spam.")}`);
}

export async function updatePassword(formData: FormData) {
  const password = value(formData, "password");
  const confirmPassword = value(formData, "confirmPassword");
  if (password.length < 8) {
    redirect(`/auth/update-password?error=${encodeURIComponent("La contraseña debe tener al menos 8 caracteres.")}`);
  }
  if (password !== confirmPassword) {
    redirect(`/auth/update-password?error=${encodeURIComponent("Las contraseñas no coinciden.")}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth?error=${encodeURIComponent("El enlace de recuperación venció o ya fue usado. Solicita uno nuevo.")}`);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/auth/update-password?error=${encodeURIComponent("No pudimos cambiar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.")}`);
  }

  await supabase.auth.signOut();
  redirect(`/auth?message=${encodeURIComponent("Contraseña actualizada. Ya puedes iniciar sesión.")}`);
}
