import Link from "next/link";
import { legalBusinessInfo } from "@/lib/legal";

export const metadata = {
  title: "Cancelaciones y reembolsos | Nival Tech",
  description: "Política de cancelaciones, devoluciones y reembolsos de Nival Tech.",
};

export default function RefundsPage() {
  const business = legalBusinessInfo();
  return (
    <main className="legalShell">
      <Link className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</Link>
      <section className="legalCard">
        <p className="eyebrow">ÚLTIMA ACTUALIZACIÓN: 24 DE SEPTIEMBRE DE 2026</p>
        <h1>Cancelaciones, devoluciones y reembolsos</h1>
        <p>Esta política complementa los Términos y condiciones. No limita los derechos irrenunciables que correspondan a la persona consumidora conforme a la legislación aplicable.</p>

        <h2>Servicios digitales y Nival Pay</h2>
        <p>Si un cobro fue duplicado, el producto pagado no se activó, el servicio no corresponde con lo ofrecido o existe otra incidencia atribuible a Nival, contáctanos para revisión y, cuando corresponda, reembolso o corrección. Si el servicio digital ya fue habilitado y utilizado correctamente, evaluaremos la solicitud de acuerdo con el estado de la prestación y los derechos aplicables.</p>

        <h2>Tarjetas físicas</h2>
        <p>Si una tarjeta llega dañada, con un defecto de fabricación o con un diseño distinto al pedido confirmado, repórtalo con evidencia del problema para gestionar reposición, corrección o la solución que legalmente corresponda. Una personalización producida conforme a las instrucciones aprobadas puede no ser reutilizable para otro cliente; esto no elimina derechos por defectos, incumplimiento o información incorrecta atribuible a Nival.</p>

        <h2>Pedidos aún no producidos</h2>
        <p>Si solicitas cancelar una tarjeta física antes de que comience su personalización o producción, revisaremos la cancelación y el reembolso del monto que corresponda. Si ya inició una personalización hecha específicamente para tu negocio, te informaremos el estado del pedido y la solución disponible antes de cerrar el caso.</p>

        <h2>Suscripciones mensuales</h2>
        <p>Puedes solicitar la cancelación de una suscripción recurrente para detener cargos futuros. La cancelación no autoriza nuevos cobros posteriores a su fecha efectiva. Cualquier cobro recurrente debe mostrarse de forma clara e informarse antes de contratarlo.</p>

        <h2>Cómo solicitar una aclaración o reembolso</h2>
        <p>Escribe a <a className="supportEmail" href={`mailto:${business.supportEmail}`}>{business.supportEmail}</a> e incluye el correo de la cuenta, nombre del negocio, producto, fecha aproximada y comprobante o identificador de la operación. No envíes NIP, CVV, contraseñas ni claves privadas.</p>

        <h2>Procesador de pago</h2>
        <p>Mercado Pago procesa determinados pagos. Sus tiempos bancarios de devolución pueden ser distintos del tiempo que tarda Nival en autorizar un reembolso.</p>

        <div className="legalLinks"><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link><Link href="/support">Soporte</Link></div>
      </section>
    </main>
  );
}
