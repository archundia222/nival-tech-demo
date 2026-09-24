import Link from "next/link";
import { resendConfirmation, signIn, signUp } from "./actions";

interface AuthPageProps {
  searchParams: Promise<{ mode?: string; error?: string; message?: string; next?: string }>;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const signup = params.mode === "signup";
  const next = params.next ?? "/dashboard";

  return (
    <main className="authShell">
      <Link className="brand" href="/">
        <span className="brandmark">N</span>NIVAL tech
      </Link>
      <section className="authCard">
        <p className="eyebrow">ACCESO PARA NEGOCIOS</p>
        <h1>{signup ? "Crea tu acceso a Nival" : "Entra a Nival"}</h1>
        <p className="authIntro">
          {signup
            ? "Empieza gratis. Crea tu acceso y en menos de unos minutos podrás preparar tu primera herramienta Nival para usarla con clientes reales."
            : "Administra Nival Pay, Puntos e Intelligence desde la misma cuenta."}
        </p>
        {signup && <>
          <div className="authPromise"><strong>No necesitas tarjeta para empezar.</strong><span>Pay, Puntos e Intelligence tienen una forma de empezar gratis.</span></div>
          <div className="authPath"><span><b>1</b> Tu acceso</span><span><b>2</b> Tu negocio</span><span><b>3</b> Empieza gratis</span></div>
        </>}
        {params.error && <div className="formMessage errorMessage">{params.error}</div>}
        {params.message && <div className="formMessage successMessage">{params.message}</div>}
        <form action={signup ? signUp : signIn} className="authForm">
          <input type="hidden" name="next" value={next} />
          {signup && (
            <label>Nombre completo<input name="fullName" required minLength={2} autoComplete="name" /></label>
          )}
          <label>Correo<input type="email" name="email" required autoComplete="email" /></label>
          <label>Contraseña<input type="password" name="password" required minLength={8} autoComplete={signup ? "new-password" : "current-password"} /></label>
          {signup && <label className="checkLabel authConsent"><input name="legalConsent" type="checkbox" required /> <span>Confirmo que leí y acepto los <Link href="/terms" target="_blank">Términos y condiciones</Link> y que recibí el <Link href="/privacy" target="_blank">Aviso de privacidad</Link>.</span></label>}
          <button className="primaryButton" type="submit">{signup ? "Crear mi cuenta" : "Entrar"}</button>
        </form>
        {signup && <p className="authLegal">Usaremos tu nombre, correo y datos de autenticación para crear y operar tu cuenta. El marketing no forma parte de este consentimiento.</p>}

        {!signup && (
          <form action={resendConfirmation} className="authForm">
            <input type="hidden" name="next" value={next} />
            <label>
              ¿No pudiste confirmar tu correo?
              <input type="email" name="email" required autoComplete="email" placeholder="tu@correo.com" />
            </label>
            <button className="primaryButton" type="submit">Reenviar confirmación</button>
          </form>
        )}

        <p className="authSwitch">
          {signup ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
          <Link href={signup ? `/auth?next=${encodeURIComponent(next)}` : `/auth?mode=signup&next=${encodeURIComponent(next)}`}>{signup ? "Inicia sesión" : "Regístrate"}</Link>
        </p>
      </section>
    </main>
  );
}
