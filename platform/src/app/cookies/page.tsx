import Link from "next/link";
import { legalBusinessInfo } from "@/lib/legal";

export const metadata = {
  title: "Política de cookies | Nival Tech",
  description: "Información sobre las cookies y tecnologías similares utilizadas por Nival Tech.",
};

export default async function CookiesPage() {
  const business = await legalBusinessInfo();
  return (
    <main className="legalShell">
      <Link className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</Link>
      <section className="legalCard">
        <p className="eyebrow">ÚLTIMA ACTUALIZACIÓN: 24 DE SEPTIEMBRE DE 2026</p>
        <h1>Política de cookies</h1>
        <p>Esta política explica qué tecnologías de almacenamiento utiliza {business.tradeName}, para qué sirven y qué opciones tienes.</p>

        <h2>Qué usamos actualmente</h2>
        <p><strong>Cookies estrictamente necesarias de autenticación.</strong> Supabase Auth puede crear y actualizar cookies de sesión para mantener iniciada la cuenta, validar la sesión y proteger rutas privadas. Estas cookies son necesarias para prestar las funciones de cuenta y no se usan por Nival para publicidad conductual.</p>
        <p><strong>Almacenamiento local del aviso.</strong> Si cierras el aviso informativo de cookies, guardamos en tu navegador una preferencia local para no mostrártelo repetidamente. No contiene tu nombre, correo ni datos bancarios.</p>

        <h2>Analítica y publicidad</h2>
        <p>Al 24 de septiembre de 2026, el código de Nival Tech no instala Google Analytics, Meta Pixel, PostHog ni otra herramienta de analítica o publicidad de terceros. Nival sí puede registrar métricas operativas propias, como aperturas de una Nival Pay, copias de CLABE o clics en enlaces, para mostrar estadísticas al negocio. Esos eventos se registran como contadores de producto; la aplicación no guarda en esas métricas una identidad del visitante.</p>

        <h2>Proveedores que pueden tratar datos técnicos</h2>
        <p>La infraestructura del sitio utiliza Vercel y Supabase. Como parte de la operación y seguridad de sus servicios, estos proveedores pueden procesar información técnica de solicitudes de red conforme a sus propios términos y avisos. Mercado Pago y Google Wallet solo intervienen cuando eliges utilizar esas funciones.</p>

        <h2>Consentimiento para cookies</h2>
        <p>Mientras Nival utilice únicamente tecnologías necesarias para autenticación, seguridad y funcionamiento, no activamos cookies publicitarias u opcionales. Sí mostramos un aviso visible y esta política. Antes de añadir analítica no esencial, publicidad, píxeles o perfiles de comportamiento, Nival deberá implementar el mecanismo de consentimiento que corresponda y permitir rechazar esas tecnologías sin bloquear las funciones esenciales.</p>

        <h2>Cómo controlar las cookies</h2>
        <p>Puedes borrar o bloquear cookies desde la configuración de tu navegador. Si bloqueas las cookies estrictamente necesarias, algunas funciones como iniciar sesión o mantener una sesión pueden dejar de funcionar.</p>

        <h2>Cambios</h2>
        <p>Actualizaremos esta política si incorporamos una nueva tecnología de seguimiento o cambia la finalidad de las tecnologías existentes.</p>

        <p>Contacto: <a className="supportEmail" href={`mailto:${business.supportEmail}`}>{business.supportEmail}</a>.</p>
        <div className="legalLinks"><Link href="/privacy">Aviso de privacidad</Link><Link href="/terms">Términos</Link><Link href="/refunds">Reembolsos</Link></div>
      </section>
    </main>
  );
}
