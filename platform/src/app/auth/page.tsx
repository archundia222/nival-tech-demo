import Link from "next/link";
import Image from "next/image";
import { resendConfirmation, signIn, signUp } from "./actions";
import { legalBusinessInfo, privacyDisclosuresReady } from "@/lib/legal";

interface AuthPageProps {
  searchParams: Promise<{ mode?: string; error?: string; message?: string; next?: string }>;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const signup = params.mode === "signup";
  const next = params.next ?? "/dashboard";
  const [privacyReady, legal] = await Promise.all([privacyDisclosuresReady(), legalBusinessInfo()]);

  return (
    <main className="authExperience">
      <section className="authExperienceAside">
        <Link className="authExperienceBrand" href="/" aria-label="Nival Tech, inicio">
          <Image src="/wallet/nival-logo.svg" alt="" width={36} height={36} />
          <span>Nival Tech</span>
        </Link>

        <div className="authExperienceCopy">
          <p className="eyebrow">{signup ? "EMPIEZA CON UNA SOLA NECESIDAD" : "BIENVENIDO DE NUEVO"}</p>
          <h1>{signup ? "Haz que lo cotidiano se sienta mejor diseñado." : "Todo tu negocio, en el mismo lugar."}</h1>
          <p>
            {signup
              ? "Crea tu acceso y empieza con Pay, Puntos o Intelligence. No necesitas activar todo ni pagar antes de probar el flujo."
              : "Vuelve a tu espacio para administrar cobro, recurrencia, actividad y las herramientas que ya usa tu negocio."}
          </p>
        </div>

        <div className="authExperienceStack" aria-label="Productos Nival">
          <article><span>01</span><div><strong>Nival Pay</strong><small>QR, enlace, NFC y datos editables.</small></div></article>
          <article><span>02</span><div><strong>Nival Puntos</strong><small>Visitas, recompensas y recurrencia.</small></div></article>
          <article><span>03</span><div><strong>Intelligence</strong><small>Señales, audiencias y siguientes acciones.</small></div></article>
        </div>

        <p className="authExperienceFootnote">Diseñado para negocios locales · Nival Tech</p>
      </section>

      <section className="authExperiencePanel">
        <div className="authExperiencePanelInner">
          <div className="authMobileBrand"><Link href="/"><Image src="/wallet/nival-logo.svg" alt="" width={32} height={32} /><span>Nival Tech</span></Link></div>
          <p className="eyebrow">{signup ? "CREA TU CUENTA" : "ACCESO PARA NEGOCIOS"}</p>
          <h2>{signup ? "Empieza gratis." : "Entra a Nival."}</h2>
          <p className="authIntro">
            {signup
              ? "Crea tu acceso. Después eliges con qué producto empezar."
              : "Usa el correo con el que registraste tu negocio."}
          </p>

          {params.error && <div className="formMessage errorMessage" role="alert">{params.error}</div>}
          {params.message && <div className="formMessage successMessage">{params.message}</div>}
          {signup && !privacyReady && <div className="formMessage errorMessage" role="alert">El registro está temporalmente deshabilitado hasta publicar la identidad legal y domicilio del responsable del tratamiento.</div>}

          <form action={signup ? signUp : signIn} className="authForm authFormPremium">
            <fieldset disabled={signup && !privacyReady}>
              <input type="hidden" name="next" value={next} />
              {signup && (
                <label>
                  <span>Nombre completo</span>
                  <input name="fullName" required minLength={2} autoComplete="name" placeholder="Tu nombre" />
                </label>
              )}
              <label>
                <span>Correo</span>
                <input type="email" name="email" required autoComplete="email" placeholder="tu@negocio.com" />
              </label>
              <label>
                <span>Contraseña</span>
                <input type="password" name="password" required minLength={8} autoComplete={signup ? "new-password" : "current-password"} placeholder={signup ? "Mínimo 8 caracteres" : "Tu contraseña"} />
              </label>
              {signup && (
                <label className="checkLabel authConsent">
                  <input name="legalConsent" type="checkbox" required />
                  <span>Confirmo que leí y acepto los <Link href="/terms" target="_blank">Términos y condiciones</Link> y que recibí el <Link href="/privacy" target="_blank">Aviso de privacidad</Link>.</span>
                </label>
              )}
              <button className="primaryButton authPrimaryButton" type="submit">{signup ? "Crear mi cuenta gratis" : "Entrar a mi cuenta"}</button>
            </fieldset>
          </form>

          {signup && (
            <p className="authLegal authLegalPremium">
              <strong>Aviso simplificado:</strong> responsable: {legal.legalName}, domicilio {legal.address}. Datos tratados: nombre, correo y datos de autenticación/cuenta. Finalidad necesaria: crear, proteger y operar tu cuenta y los servicios Nival que elijas. No usamos este consentimiento para publicidad. Para limitar el uso o divulgación, revocar un consentimiento o ejercer derechos ARCO escribe a <a href={"mailto:" + legal.supportEmail}>{legal.supportEmail}</a>. Consulta el <Link href="/privacy">Aviso de privacidad integral</Link>.
            </p>
          )}

          {!signup && (
            <details className="authRecovery">
              <summary>¿No pudiste confirmar tu correo?</summary>
              <form action={resendConfirmation} className="authForm">
                <input type="hidden" name="next" value={next} />
                <label>
                  <span>Correo de la cuenta</span>
                  <input type="email" name="email" required autoComplete="email" placeholder="tu@correo.com" />
                </label>
                <button className="authSecondaryButton" type="submit">Reenviar confirmación</button>
              </form>
            </details>
          )}

          <p className="authSwitch authSwitchPremium">
            {signup ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
            <Link href={signup ? "/auth?next=" + encodeURIComponent(next) : "/auth?mode=signup&next=" + encodeURIComponent(next)}>{signup ? "Inicia sesión" : "Crear cuenta gratis"}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
