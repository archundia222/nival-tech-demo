import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Política de cookies",
  description: "Información sobre cookies y tecnologías similares utilizadas por Nival Tech.",
};

export default async function CookiesPage() {
  const { data: legal } = await createAdminClient()
    .from("site_legal_settings")
    .select("legal_name,trade_name,legal_address,phone,support_email")
    .eq("id", "default")
    .maybeSingle();

  const legalName = legal?.legal_name ?? "Proveedor de Nival Tech";
  const tradeName = legal?.trade_name ?? "Nival Tech";
  const address = legal?.legal_address ?? "Ciudad de México, México";
  const supportEmail = legal?.support_email ?? "rodrigoarchundia379@gmail.com";

  return (
    <main className="legalShell">
      <Link className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</Link>
      <section className="legalCard">
        <p className="eyebrow">ÚLTIMA ACTUALIZACIÓN: 26 DE SEPTIEMBRE DE 2026</p>
        <h1>Política de cookies</h1>
        <p>Esta política explica cómo {tradeName} utiliza cookies y tecnologías similares en su plataforma.</p>

        <div className="legalIdentity" aria-label="Datos del proveedor">
          <span>RESPONSABLE</span>
          <strong>{legalName}</strong>
          <p>{tradeName} · {address}</p>
          <p>{supportEmail}{legal?.phone ? ` · ${legal.phone}` : ""}</p>
        </div>

        <h2>Cookies que utilizamos actualmente</h2>
        <p>Nival Tech utiliza cookies técnicas y de sesión necesarias para funciones como autenticación, mantenimiento de sesión, seguridad y operación del panel. Estas cookies son necesarias para prestar el servicio solicitado.</p>

        <h2>Analítica y publicidad</h2>
        <p>Al momento de esta actualización, Nival Tech no utiliza cookies publicitarias ni herramientas propias de seguimiento comercial en el sitio. Si incorporamos analítica, publicidad u otras tecnologías no esenciales, actualizaremos esta política y aplicaremos los mecanismos de consentimiento que correspondan antes de utilizarlas.</p>

        <h2>Proveedores tecnológicos</h2>
        <p>Algunas funciones pueden depender de proveedores externos como Supabase, Vercel, Mercado Pago o Google Wallet. Cuando visitas o utilizas servicios de terceros, esos proveedores pueden aplicar sus propias tecnologías y políticas de privacidad.</p>

        <h2>Cómo controlar las cookies</h2>
        <p>Puedes controlar o eliminar cookies desde la configuración de tu navegador. Bloquear cookies técnicas puede impedir que puedas iniciar sesión o utilizar correctamente algunas funciones de Nival.</p>

        <h2>Cambios</h2>
        <p>Podemos actualizar esta política si cambian las tecnologías utilizadas o las funciones del servicio. La versión vigente estará disponible en esta página.</p>

        <h2>Contacto</h2>
        <p>Para preguntas sobre privacidad o cookies, escribe a <a href={`mailto:${supportEmail}`}>{supportEmail}</a> o consulta nuestro <Link href="/privacy">Aviso de privacidad</Link>.</p>
      </section>
    </main>
  );
}
