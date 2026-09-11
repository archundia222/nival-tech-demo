import Link from "next/link";
import { signIn, signUp } from "./actions";

interface AuthPageProps {
  searchParams: Promise<{ mode?: string; error?: string; message?: string; next?: string }>;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const signup = params.mode === "signup";

  return (
    <main className="authShell">
      <Link className="brand" href="/">
        <span className="brandmark">N</span>NIVAL tech
      </Link>
      <section className="authCard">
        <p className="eyebrow">ACCESO PARA NEGOCIOS</p>
        <h1>{signup ? "Crea tu cuenta" : "Bienvenido"}</h1>
        <p className="authIntro">
          {signup
            ? "Primero crearemos tu usuario; después configurarás tu negocio."
            : "Ingresa al panel de Nival Intelligence."}
        </p>
        {params.error && <div className="formMessage errorMessage">{params.error}</div>}
        {params.message && <div className="formMessage successMessage">{params.message}</div>}
        <form action={signup ? signUp : signIn} className="authForm">
          <input type="hidden" name="next" value={params.next ?? "/dashboard"} />
          {signup && (
            <label>Nombre completo<input name="fullName" required minLength={2} autoComplete="name" /></label>
          )}
          <label>Correo<input type="email" name="email" required autoComplete="email" /></label>
          <label>Contraseña<input type="password" name="password" required minLength={8} autoComplete={signup ? "new-password" : "current-password"} /></label>
          <button className="primaryButton" type="submit">{signup ? "Crear cuenta" : "Iniciar sesión"}</button>
        </form>
        <p className="authSwitch">
          {signup ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
          <Link href={signup ? `/auth?next=${encodeURIComponent(params.next ?? "/dashboard")}` : `/auth?mode=signup&next=${encodeURIComponent(params.next ?? "/dashboard")}`}>{signup ? "Inicia sesión" : "Regístrate"}</Link>
        </p>
      </section>
    </main>
  );
}
