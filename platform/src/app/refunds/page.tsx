import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Política de reembolsos",
  description: "Política de cancelaciones, incidencias y reembolsos de Nival Tech.",
};

export default async function RefundsPage() {
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
        <h1>Política de reembolsos</h1>
        <p>Esta política describe cómo revisamos cancelaciones, incidencias y solicitudes de reembolso relacionadas con productos y servicios de {tradeName}. Nada de esta política limita los derechos que correspondan conforme a la legislación aplicable.</p>

        <div className="legalIdentity" aria-label="Datos del proveedor">
          <span>PROVEEDOR DEL SERVICIO</span>
          <strong>{legalName}</strong>
          <p>{tradeName} · {address}</p>
          <p>{supportEmail}{legal?.phone ? ` · ${legal.phone}` : ""}</p>
        </div>

        <h2>Pagos digitales y activaciones</h2>
        <p>Si existe un cobro duplicado, un pago acreditado que no activó correctamente el producto o un cargo que no corresponde con lo mostrado antes de confirmar la compra, contáctanos para revisarlo. Verificaremos el estado del pago y del servicio antes de resolver la solicitud.</p>

        <h2>Suscripciones</h2>
        <p>Puedes solicitar la cancelación de una suscripción para evitar cobros futuros. La cancelación y la vigencia restante dependen del estado reportado por el procesador de pagos y del periodo ya pagado. Los reembolsos de periodos ya iniciados se revisan caso por caso, considerando el uso del servicio y los derechos aplicables.</p>

        <h2>Tarjetas NFC y productos físicos</h2>
        <p>Si un pedido físico todavía no entra a producción, podremos revisar cambios o cancelación. Una vez iniciada la personalización, impresión o producción, la posibilidad de reembolso puede verse limitada por tratarse de un producto preparado para un negocio específico. Si recibes un producto incorrecto, defectuoso o distinto de lo confirmado, contáctanos para revisar reposición, corrección o reembolso según corresponda.</p>

        <h2>Cómo solicitar una revisión</h2>
        <p>Escribe a <a href={`mailto:${supportEmail}`}>{supportEmail}</a> o utiliza el <Link href="/support">Centro de ayuda</Link>. Incluye el correo de tu cuenta, nombre del negocio, producto, fecha aproximada y cualquier comprobante necesario para identificar el pago.</p>

        <h2>Tiempo de respuesta</h2>
        <p>Buscaremos responder las solicitudes de soporte y reembolso en un plazo razonable. Cuando intervenga un proveedor de pagos, banco o paquetería, el tiempo final también puede depender de sus procesos.</p>

        <h2>Pagos procesados por terceros</h2>
        <p>Los pagos de productos Nival pueden procesarse mediante proveedores externos como Mercado Pago. Una devolución aprobada puede tardar en reflejarse según el medio de pago y los tiempos del proveedor o banco emisor.</p>

        <h2>Contacto</h2>
        <p>Para cualquier incidencia relacionada con cobros, cancelaciones o pedidos físicos, escríbenos antes de realizar un segundo pago si el primero aparece pendiente o en validación.</p>
      </section>
    </main>
  );
}
