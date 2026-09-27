"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default function CompleteSignupPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      const params = new URLSearchParams(window.location.search);
      const next = safeNext(params.get("next"));
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (!accessToken || !refreshToken) {
        if (!cancelled) setStatus("error");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        if (!cancelled) setStatus("error");
        return;
      }

      window.history.replaceState({}, "", window.location.pathname + window.location.search);
      window.location.replace(next);
    }

    void complete();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <main className="authShell">
      <Link className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</Link>
      <section className="authCard">
        {status === "loading" ? (
          <>
            <p className="eyebrow">CONFIRMANDO TU CUENTA</p>
            <h1>Un momento.</h1>
            <p className="authIntro">Estamos preparando tu acceso a Nival en este dispositivo.</p>
          </>
        ) : (
          <>
            <p className="eyebrow">NO PUDIMOS CONFIRMAR</p>
            <h1>Ese enlace ya no sirve.</h1>
            <p className="authIntro">Vuelve a Nival y solicita un correo de confirmación nuevo.</p>
            <Link className="primaryButton" href="/auth">Volver a iniciar sesión</Link>
          </>
        )}
      </section>
    </main>
  );
}
