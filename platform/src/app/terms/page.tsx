import Link from "next/link";
import { LEGAL_VERSION, legalBusinessInfo } from "@/lib/legal";

export const metadata = {
  title: "Términos y condiciones | Nival Tech",
  description: "Términos y condiciones aplicables al uso y compra de productos Nival Tech.",
};

export default async function TermsPage() {
  const business = await legalBusinessInfo();
  return (
    <main className="legalShell">
      <Link className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</Link>
      <section className="legalCard">
        <p className="eyebrow">VERSIÓN {LEGAL_VERSION} · 24 DE SEPTIEMBRE DE 2026</p>
        <h1>Términos y condiciones</h1>
        <p>Estos términos regulan el uso de Nival Tech y las compras realizadas en la plataforma. Antes de confirmar una compra se muestran el producto, precio, forma de pago y, cuando corresponda, entrega o recurrencia.</p>

        <h2>Proveedor y contacto</h2>
        <p><strong>Nombre comercial:</strong> {business.tradeName}. <strong>Proveedor:</strong> {business.legalName}. Contacto: <a href={`mailto:${business.supportEmail}`}>{business.supportEmail}</a>.</p>
        {business.address && <p><strong>Domicilio para aclaraciones y reclamaciones:</strong> {business.address}.</p>}
        {business.phone && <p><strong>Teléfono:</strong> {business.phone}.</p>}
        {business.rfc && <p><strong>RFC:</strong> {business.rfc}.</p>}

        <h2>Cuenta y uso autorizado</h2>
        <p>La persona que crea una cuenta debe proporcionar información correcta y proteger sus credenciales. No debe usar Nival para suplantar negocios, acceder a cuentas ajenas, publicar datos que no está autorizada a compartir, infringir derechos de terceros o realizar actividades ilícitas.</p>

        <h2>Productos y precios</h2>
        <p>Nival puede ofrecer Nival Pay, Nival Puntos, Nival Intelligence, perfiles digitales y tarjetas NFC. Algunas funciones pueden tener un plan gratuito y otras pago único o suscripción. El precio y alcance vigentes son los mostrados inmediatamente antes de aceptar la operación. Los ejemplos, vistas previas y datos demostrativos no constituyen promesas de resultados comerciales.</p>

        <h2>Nival Pay</h2>
        <p>Nival Pay permite publicar datos de cobro y enlaces para facilitar que un cliente encuentre la información proporcionada por el negocio. Nival Tech no es una institución bancaria y no ejecuta la transferencia bancaria entre el negocio y su cliente. El negocio debe revisar que beneficiario, banco, CLABE, enlaces y demás información publicada sean correctos y estar autorizado para publicarlos.</p>

        <h2>Pagos mediante terceros</h2>
        <p>Determinadas compras se procesan con Mercado Pago. Al elegir ese método, Nival transmite al proveedor únicamente los datos razonablemente necesarios para crear y conciliar la operación, como importe, concepto, referencia de la orden y, cuando resulte necesario, el correo asociado a la cuenta. Las reglas del medio de pago también pueden aplicar a la operación procesada por ese tercero.</p>

        <h2>Suscripciones recurrentes</h2>
        <p>Cuando un producto tenga cobro recurrente, antes de contratarlo deberán mostrarse de forma clara el importe, periodicidad y condición recurrente y se solicitará una aceptación expresa. La persona usuaria conserva los derechos de cancelación que reconozca la legislación aplicable. Nival no pretende convertir una prueba o plan gratis en un cobro oculto.</p>

        <h2>Tarjetas físicas y entrega</h2>
        <p>Para producir y entregar una tarjeta física solicitamos únicamente los datos necesarios del diseño, destinatario, contacto y entrega. Los tiempos indicados son estimaciones sujetas a producción y logística. Los costos de personalización y envío aplicables deben mostrarse antes de confirmar el pedido. El usuario declara contar con derechos suficientes sobre logotipos, imágenes o diseños que cargue.</p>

        <h2>Ventas, clientes y datos operativos</h2>
        <p>Las ventas, visitas, clientes y demás datos operativos que aparecen en Nival provienen de la información registrada o importada por el negocio y de eventos del producto. Nival no los presenta como conciliación bancaria, auditoría contable o ingresos verificados. El negocio es responsable de la licitud y exactitud de la información que incorpora.</p>

        <h2>Marketing a clientes</h2>
        <p>El negocio es responsable de contar con las autorizaciones aplicables antes de enviar comunicaciones comerciales. Dentro de Nival, el consentimiento promocional debe mantenerse separado de los datos necesarios para operar un programa de lealtad. La persona consumidora puede negarse a recibir publicidad.</p>

        <h2>Disponibilidad y cambios</h2>
        <p>Podemos corregir errores, mejorar funciones o modificar el servicio. No garantizamos disponibilidad ininterrumpida ni resultados de ventas, recurrencia o crecimiento. Cualquier cambio material en precios o en una suscripción aplicará conforme a la información comunicada y los derechos de la persona consumidora.</p>

        <h2>Cancelaciones, reembolsos y garantías</h2>
        <p>Consulta la <Link href="/refunds">Política de cancelaciones y reembolsos</Link>. Nada en estos términos busca eliminar garantías, derechos de reclamación, revocación, devolución o protección que sean irrenunciables conforme a la legislación aplicable.</p>

        <h2>Privacidad</h2>
        <p>El tratamiento de datos personales se describe en el <Link href="/privacy">Aviso de privacidad</Link> y el uso de tecnologías del navegador en la <Link href="/cookies">Política de cookies</Link>.</p>

        <h2>Ley aplicable y resolución de controversias</h2>
        <p>Estos términos se interpretan conforme a las leyes aplicables en México, sin limitar los derechos de las personas consumidoras ni la competencia de las autoridades que legalmente corresponda. Antes de iniciar una controversia, puedes solicitar aclaración por nuestros medios de contacto.</p>

        <div className="legalLinks"><Link href="/privacy">Privacidad</Link><Link href="/cookies">Cookies</Link><Link href="/refunds">Reembolsos</Link><Link href="/support">Soporte</Link></div>
      </section>
    </main>
  );
}
