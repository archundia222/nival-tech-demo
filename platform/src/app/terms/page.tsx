export const dynamic = 'force-dynamic';
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Términos de servicio",
  description: "Términos aplicables al uso de Nival Tech.",
};

export default async function TermsPage() {
  const { data: legal } = await createAdminClient()
    .from("site_legal_settings")
    .select("legal_name,trade_name,legal_address,phone,support_email,rfc")
    .eq("id", "default")
    .maybeSingle();
  const legalName = legal?.legal_name ?? "Proveedor de Nival Tech";
  const tradeName = legal?.trade_name ?? "Nival Tech";
  const address = legal?.legal_address ?? "Ciudad de México, México";
  const supportEmail = legal?.support_email ?? "rodrigoarchundia379@gmail.com";
  const phone = legal?.phone ?? "";

  return (
    <main className="legalShell">
      <Link className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</Link>
      <section className="legalCard">
        <p className="eyebrow">ÚLTIMA ACTUALIZACIÓN: 2 DE OCTUBRE DE 2026</p>
        <h1>Términos de servicio</h1>
        <p>Estos términos describen las reglas generales para usar Nival Tech y sus productos. Al crear una cuenta o contratar una función de pago, aceptas utilizar el servicio de forma lícita y proporcionar información correcta.</p>

        <div className="legalIdentity" aria-label="Datos del proveedor">
          <span>PROVEEDOR DEL SERVICIO</span>
          <strong>{legalName}</strong>
          <p>{tradeName} · {address}</p>
          <p>{supportEmail}{phone ? ` · ${phone}` : ""}{legal?.rfc ? ` · RFC ${legal.rfc}` : ""}</p>
        </div>

        <h2>Productos Nival</h2>
        <p>Nival Tech ofrece Nival Pay para compartir datos de cobro mediante una página pública, QR, enlace y tarjeta NFC. El precio y alcance aplicable se muestran antes de confirmar una compra.</p>

        <h2>Nival Pay y transferencias</h2>
        <p>Nival Pay facilita que un negocio publique datos para recibir una transferencia o comparta un enlace de pago. Nival Tech no es una institución financiera y no recibe, retiene ni transfiere el dinero de la operación bancaria entre el negocio y su cliente. El negocio es responsable de revisar que beneficiario, banco, CLABE y demás información publicada sean correctos.</p>

        <h2>Servicio por aperturas</h2>
        <p>En el modelo administrado, Nival asigna las tarjetas y entrega un código privado al negocio. El negocio configura y revisa sus datos bancarios. Cada tarjeta física cuesta $20 MXN e incluye sus primeras 5 aperturas registradas, una sola vez por tarjeta. A partir de la sexta apertura, se cobra $1 MXN por apertura registrada. Las aperturas incluidas pendientes se conservan entre periodos; pagar, suspender o restaurar la misma tarjeta no renueva esas 5 aperturas. El consumo se calcula por aperturas registradas de las páginas de sus tarjetas, incluyendo accesos mediante NFC, QR y enlace. Una apertura no acredita una transferencia. Las recargas de una misma sesión, las consultas del dueño con sesión iniciada y los accesos automatizados identificados no suman aperturas.</p>
        <h2>Periodos y pagos manuales</h2>
        <p>La tarifa de cada periodo se muestra en el panel del negocio. Los periodos duran 30 días desde el alta o la reactivación. Los pagos se coordinan directamente con Nival y no se realizan en esta página. Al vencer el periodo, las páginas públicas de las tarjetas se suspenden; el negocio conserva acceso a su panel e historial. Cuando el administrador registra el pago recibido, comienza un nuevo periodo de 30 días. Los cargos y condiciones de periodos pagados se conservan en el historial.</p>

        <h2>Tarjetas físicas</h2>
        <p>Cuando una compra incluya o agregue una tarjeta NFC física, el usuario deberá proporcionar los datos necesarios de diseño y entrega. El frente puede usar plantillas de Nival según el objetivo de la tarjeta. El reverso estándar puede estar incluido y, cuando se ofrezca, el reverso personalizado tendrá el cargo adicional mostrado antes de confirmar la compra. Los tiempos de producción y entrega dependen del diseño, ubicación, disponibilidad y método elegido. Si un envío requiere un costo adicional, deberá informarse antes de confirmarlo.</p>

        <h2>Uso adecuado y seguridad</h2>
        <p>No debes utilizar Nival para suplantar negocios, publicar información bancaria que no estés autorizado a compartir, intentar acceder a cuentas ajenas, abusar del servicio o realizar actividades ilícitas. Podemos limitar el acceso cuando sea necesario para proteger a usuarios, datos o la operación de la plataforma.</p>

        <h2>Disponibilidad y cambios</h2>
        <p>Trabajamos para mantener Nival disponible y confiable, pero no garantizamos funcionamiento ininterrumpido. Podemos corregir errores, modificar funciones o actualizar estos términos conforme evolucione el producto. Evitaremos presentar como resultados confirmados aquello que solo sea una estimación.</p>

        <h2>Cancelaciones, incidencias y reembolsos</h2>
        <p>Si existe un problema con un cobro o pedido físico, contáctanos por el <Link href="/support">Centro de ayuda</Link>. Las solicitudes de reembolso se revisan según el estado de la compra, el servicio ya prestado, la producción iniciada y los derechos que correspondan conforme a la legislación aplicable.</p>

        <h2>Privacidad</h2>
        <p>El tratamiento de datos personales se describe en nuestro <Link href="/privacy">Aviso de privacidad</Link>.</p>

        <h2>Contacto</h2>
        <p>Para soporte, aclaraciones o solicitudes relacionadas con estos términos, escribe a <a href={`mailto:${supportEmail}`}>{supportEmail}</a> o utiliza el <Link href="/support">Centro de ayuda de Nival Tech</Link>.</p>
      </section>
    </main>
  );
}
