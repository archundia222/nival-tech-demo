import Link from "next/link";
import { requestPasswordReset, resendConfirmation, signIn, signUp } from "./actions";
import { CheckoutSubmitButton } from "@/app/checkout/submit-button";

export const metadata = { robots: { index: false, follow: false } };

interface AuthPageProps {
  searchParams: Promise<{ mode?: string; error?: string; message?: string; next?: string }>;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const signup = params.mode === "signup";
  const next = params.next ?? "/dashboard";
  const signupContext = next.includes("/dashboard/points")
    ? { label: "NIVAL PUNTOS", title: "Crea tu programa de clientes frecuentes", text: "Después de confirmar tu correo, crea tu negocio y podrás compartir tu QR, registrar visitas y mostrar la tarjeta digital del cliente." }
    : next.includes("/dashboard/intelligence")
      ? { label: "NIVAL INTELLIGENCE", title: "Prepara Nival para entender a tus clientes", text: "Intelligence funciona sobre Nival Puntos. Si todavía no lo tienes activo, primero te guiaremos para crear tu programa de fidelización." }
      : next.includes("/checkout") || next.includes("/dashboard/pay")
        ? { label: "NIVAL PAY", title: "Crea tu Nival Pay", text: "Después de confirmar tu correo, crea tu negocio y podrás preparar tu página de cobro, QR y enlace." }
        : { label: "NIVAL TECH", title: "Crea tu acceso a Nival", text: "Crea tu negocio una sola vez y desde ahí activa las herramientas que necesites." };

  return (
    <main className="authShell">
      <Link className="brand" href="/">
        <span className="brandmark">N</span>NIVAL tech
      </Link>
      <section className="authCard">
        <p className="eyebrow">{signup ? signupContext.label : "ACCESO PARA NEGOCIOS"}</p>
        <h1>{signup ? signupContext.title : "Entra a Nival"}</h1>
        <p className="authIntro">
          {signup
            ? signupContext.text
            : "Administra Nival Pay, Puntos e Intelligence desde la misma cuenta."}
        </p>
        {signup && <>
          <div className="authPromise"><strong>No necesitas tarjeta bancaria para crear tu cuenta.</strong><span>Pay puede quedarse gratis. Puntos empieza con prueba Pro y después puede seguir en Free; Growth se construye sobre Puntos.</span></div>
          <div className="authPath"><span><b>1</b> Crea tu acceso</span><span><b>2</b> Confirma tu correo</span><span><b>3</b> Configura tu negocio</span></div>
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
          <CheckoutSubmitButton className="primaryButton" pendingLabel={signup ? "Creando tu cuenta…" : "Entrando…"}>{signup ? "Continuar" : "Entrar"}</CheckoutSubmitButton>
        </form>
        {signup && <p className="authLegal">Al continuar, aceptas los <Link href="/terms">Términos de servicio</Link> y el <Link href="/privacy">Aviso de privacidad</Link>.</p>}

        {!signup && <>
          <details className="authHelp">
            <summary>¿Olvidaste tu contraseña?</summary>
            <form action={requestPasswordReset} className="authForm">
              <label>
                Correo de tu cuenta
                <input type="email" name="email" required autoComplete="email" placeholder="tu@correo.com" />
              </label>
              <CheckoutSubmitButton className="primaryButton" pendingLabel="Enviando enlace…">Enviar enlace de recuperación</CheckoutSubmitButton>
            </form>
          </details>
          <details className="authHelp">
            <summary>¿No pudiste confirmar tu correo?</summary>
            <form action={resendConfirmation} className="authForm">
              <input type="hidden" name="next" value={next} />
              <label>
                Escribe el correo de tu cuenta
                <input type="email" name="email" required autoComplete="email" placeholder="tu@correo.com" />
              </label>
              <CheckoutSubmitButton className="primaryButton" pendingLabel="Reenviando…">Reenviar confirmación</CheckoutSubmitButton>
            </form>
          </details>
        </>}

        <p className="authSwitch">
          {signup ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
          <Link href={signup ? `/auth?next=${encodeURIComponent(next)}` : `/auth?mode=signup&next=${encodeURIComponent(next)}`}>{signup ? "Inicia sesión" : "Regístrate"}</Link>
        </p>
      </section>
    </main>
  );
}
