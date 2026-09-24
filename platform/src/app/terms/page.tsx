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
        <p className="eyebrow">ÚLTIMA ACTUALIZACIÓN: 24 DE SEPTIEMBRE DE 2026</p>
        <h1>Términos de servicio</h1>
        <p>Estos términos describen las reglas generales para usar Nival Tech y sus productos. Al crear una cuenta o contratar una función de pago, aceptas utilizar el servicio de forma lícita y proporcionar información correcta.</p>

        <div className="legalIdentity" aria-label="Datos del proveedor">
          <span>PROVEEDOR DEL SERVICIO</span>
          <strong>{legalName}</strong>
          <p>{tradeName} · {address}</p>
          <p>{supportEmail}{phone ? ` · ${phone}` : ""}{legal?.rfc ? ` · RFC ${legal.rfc}` : ""}</p>
        </div>

        <h2>Productos Nival</h2>
        <p>Nival Tech puede ofrecer Nival Pay, Nival Puntos, Nival Growth —que integra Puntos e Intelligence—, perfiles digitales y otras herramientas relacionadas. Algunas funciones tienen plan gratis y otras requieren pago único o suscripción. El precio y alcance aplicable se muestran antes de confirmar una compra.</p>

        <h2>Pruebas y planes gratuitos</h2>
        <p>Cuando se ofrezca una prueba temporal de funciones Pro, la duración se mostrará antes de activarla. Al terminar una prueba sin una suscripción vigente, ciertas funciones pueden volver al nivel gratuito disponible; los datos que el producto indique como conservables no se eliminan únicamente por terminar la prueba.</p>

        <h2>Nival Pay y transferencias</h2>
        <p>Nival Pay facilita que un negocio publique datos para recibir una transferencia o comparta un enlace de pago. Nival Tech no es una institución financiera y no recibe, retiene ni transfiere el dinero de la operación bancaria entre el negocio y su cliente. El negocio es responsable de revisar que beneficiario, banco, CLABE y demás información publicada sean correctos.</p>

        <h2>Pagos de productos Nival</h2>
        <p>Los pagos de productos o suscripciones Nival pueden procesarse mediante proveedores externos como Mercado Pago. El monto final se muestra antes de confirmar la operación. Una suscripción puede perder funciones Pro y volver al plan disponible cuando sea cancelada, pausada o deje de estar vigente conforme se sincronice su estado.</p>

        <h2>Tarjetas físicas</h2>
        <p>Cuando una compra incluya o agregue una tarjeta NFC física, el usuario deberá proporcionar los datos necesarios de diseño y entrega. El frente puede usar plantillas de Nival según el objetivo de la tarjeta. El reverso estándar puede estar incluido y, cuando se ofrezca, el reverso personalizado tendrá el cargo adicional mostrado antes de confirmar la compra. Los tiempos de producción y entrega dependen del diseño, ubicación, disponibilidad y método elegido. Si un envío requiere un costo adicional, deberá informarse antes de confirmarlo.</p>

        <h2>Ventas y datos operativos</h2>
        <p>El negocio puede registrar ventas individuales, resúmenes diarios o importar archivos compatibles para alimentar sus métricas. Nival solo considera como venta registrada la información que el propio negocio proporciona; no debe interpretarse como conciliación bancaria ni como ingreso verificado por Nival.</p>

        <h2>Clientes, campañas y consentimiento</h2>
        <p>El negocio que usa Nival es responsable de contar con las autorizaciones necesarias para recopilar información de sus clientes y realizar comunicaciones comerciales. Las funciones de promociones e Intelligence utilizan el consentimiento registrado para limitar las audiencias de marketing dentro de las herramientas disponibles.</p>

        <h2>Uso adecuado y seguridad</h2>
        <p>No debes utilizar Nival para suplantar negocios, publicar información bancaria que no estés autorizado a compartir, intentar acceder a cuentas ajenas, abusar del servicio o realizar actividades ilícitas. Podemos limitar el acceso cuando sea necesario para proteger a usuarios, datos o la operación de la plataforma.</p>

        <h2>Disponibilidad y cambios</h2>
        <p>Trabajamos para mantener Nival disponible y confiable, pero no garantizamos funcionamiento ininterrumpido. Podemos corregir errores, modificar funciones o actualizar estos términos conforme evolucione el producto. Evitaremos presentar como resultados confirmados aquello que solo sea una estimación.</p>

        <h2>Cancelaciones, incidencias y reembolsos</h2>
        <p>Si quieres cancelar una suscripción o existe un problema con un cobro o pedido físico, contáctanos por el <Link href="/support">Centro de ayuda</Link>. Las solicitudes de reembolso se revisan según el estado de la compra, el servicio ya prestado, la producción iniciada y los derechos que correspondan conforme a la legislación aplicable.</p>

        <h2>Privacidad</h2>
        <p>El tratamiento de datos personales se describe en nuestro <Link href="/privacy">Aviso de privacidad</Link>.</p>

        <h2>Contacto</h2>
        <p>Para soporte, aclaraciones o solicitudes relacionadas con estos términos, escribe a <a href={`mailto:${supportEmail}`}>{supportEmail}</a> o utiliza el <Link href="/support">Centro de ayuda de Nival Tech</Link>.</p>
      </section>
    </main>
  );
}
