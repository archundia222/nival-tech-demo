"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function UpdatePasswordPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          auth: {
            flowType: "implicit",
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        },
      ),
    [],
  );

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!mounted) return;

      if (sessionError || !data.session) {
        setError("El enlace de recuperación venció o ya fue usado. Solicita uno nuevo.");
        setReady(false);
        return;
      }

      setReady(true);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setError("");
        setReady(true);
      }
    });

    void checkSession();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSaving(false);
      setError("No pudimos cambiar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.");
      return;
    }

    await supabase.auth.signOut();
    window.location.replace(
      `/auth?message=${encodeURIComponent("Contraseña actualizada. Ya puedes iniciar sesión.")}`,
    );
  }

  return (
    <main className="authShell">
      <Link className="brand" href="/">
        <span className="brandmark">N</span>TOCARIO
      </Link>
      <section className="authCard">
        <p className="eyebrow">SEGURIDAD DE TU CUENTA</p>
        <h1>Crea una contraseña nueva</h1>
        <p className="authIntro">
          Abre el enlace más reciente que te enviamos y escribe una contraseña que no utilices en otros servicios.
        </p>

        {error && <div className="formMessage errorMessage" role="alert">{error}</div>}

        {ready ? (
          <form onSubmit={handleSubmit} className="authForm">
            <label>
              Nueva contraseña
              <input type="password" name="password" required minLength={8} autoComplete="new-password" />
            </label>
            <label>
              Confirma la contraseña
              <input type="password" name="confirmPassword" required minLength={8} autoComplete="new-password" />
            </label>
            <button className="primaryButton" type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar nueva contraseña"}
            </button>
          </form>
        ) : (
          <Link className="primaryButton" href="/auth">
            Solicitar un enlace nuevo
          </Link>
        )}
      </section>
    </main>
  );
}
