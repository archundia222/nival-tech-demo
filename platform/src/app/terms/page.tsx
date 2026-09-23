import Link from "next/link";

export const metadata = {
  title: "Términos de servicio",
  description: "Términos aplicables al uso de Nival Tech.",
};

export default function TermsPage() {
  return (
    <main className="legalShell">
      <Link className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</Link>
      <section className="legalCard">
        <p className="eyebrow">ÚLTIMA ACTUALIZACIÓN: 23 DE SEPTIEMBRE DE 2026</p>
        <h1>Términos de servicio</h1>
        <p>Estos términos describen las reglas generales para usar Nival Tech y sus productos. Al crear una cuenta o contratar una función de pago, aceptas utilizar el servicio de forma lícita y proporcionar información correcta.</p>

        <h2>Productos Nival</h2>
        <p>Nival Tech puede ofrecer Nival Pay, Nival Puntos, Nival Intelligence, perfiles digitales y otras herramientas relacionadas. Algunas funciones tienen plan gratis y otras requieren pago único o suscripción. El precio y alcance aplicable se muestran antes de confirmar una compra.</p>

        <h2>Nival Pay y transferencias</h2>
        <p>Nival Pay facilita que un negocio publique datos para recibir una transferencia o comparta un enlace de pago. Nival Tech no es una institución financiera y no recibe, retiene ni transfiere el dinero de la operación bancaria entre el negocio y su cliente. El negocio es responsable de revisar que beneficiario, banco, CLABE y demás información publicada sean correctos.</p>

        <h2>Pagos de productos Nival</h2>
        <p>Los pagos de productos o suscripciones Nival pueden procesarse mediante proveedores externos como Mercado Pago. El monto final se muestra antes de confirmar la operación. Una suscripción puede perder funciones Pro y volver al plan disponible cuando sea cancelada, pausada o deje de estar vigente conforme se sincronice su estado.</p>

        <h2>Tarjetas físicas</h2>
        <p>Cuando una compra incluya o agregue una tarjeta NFC física, el usuario deberá proporcionar los datos necesarios de diseño y entrega. Los tiempos de producción y entrega pueden depender del diseño, ubicación, disponibilidad y método elegido. Si un envío requiere un costo adicional, deberá informarse antes de confirmarlo.</p>

        <h2>Clientes, campañas y consentimiento</h2>
        <p>El negocio que usa Nival es responsable de contar con las autorizaciones necesarias para recopilar información de sus clientes y realizar comunicaciones comerciales. Nival Intelligence utiliza el consentimiento registrado para limitar las audiencias de marketing dentro de las funciones disponibles.</p>

        <h2>Uso adecuado y seguridad</h2>
        <p>No debes utilizar Nival para suplantar negocios, publicar información bancaria que no estés autorizado a compartir, intentar acceder a cuentas ajenas, abusar del servicio o realizar actividades ilícitas. Podemos limitar el acceso cuando sea necesario para proteger a usuarios, datos o la operación de la plataforma.</p>

        <h2>Disponibilidad y cambios</h2>
        <p>Trabajamos para mantener Nival disponible y confiable, pero no garantizamos funcionamiento ininterrumpido. Podemos corregir errores, modificar funciones o actualizar estos términos conforme evolucione el producto. Evitaremos presentar como resultados confirmados aquello que solo sea una estimación.</p>

        <h2>Cancelaciones, incidencias y reembolsos</h2>
        <p>Si existe un problema con un cobro, suscripción o pedido físico, contáctanos con los datos de la operación. Las solicitudes se revisan según el estado de la compra, el servicio ya prestado o la producción iniciada, y los derechos que correspondan conforme a la legislación aplicable.</p>

        <h2>Privacidad</h2>
        <p>El tratamiento de datos personales se describe en nuestro <Link href="/privacy">Aviso de privacidad</Link>.</p>

        <h2>Contacto</h2>
        <p>Para soporte, aclaraciones o solicitudes relacionadas con estos términos, utiliza el <Link href="/support">Centro de ayuda de Nival Tech</Link>.</p>
      </section>
    </main>
  );
}
