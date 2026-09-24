import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "../actions";

export const metadata = {
  title: "Cambiar contraseña",
  robots: { index: false, follow: false },
};

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?error=El+enlace+de+recuperación+venció+o+ya+fue+usado.");

  return <main className="authShell">
    <Link className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</Link>
    <section className="authCard">
      <p className="eyebrow">SEGURIDAD DE TU CUENTA</p>
      <h1>Crea una contraseña nueva</h1>
      <p className="authIntro">El enlace de recuperación ya fue validado. Escribe una contraseña que no utilices en otros servicios.</p>
      {params.error && <div className="formMessage errorMessage" role="alert">{params.error}</div>}
      <form action={updatePassword} className="authForm">
        <label>Nueva contraseña<input type="password" name="password" required minLength={8} autoComplete="new-password" /></label>
        <label>Confirma la contraseña<input type="password" name="confirmPassword" required minLength={8} autoComplete="new-password" /></label>
        <button className="primaryButton" type="submit">Guardar nueva contraseña</button>
      </form>
    </section>
  </main>;
}
