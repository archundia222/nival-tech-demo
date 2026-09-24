import Link from "next/link";
import { legalBusinessInfo } from "@/lib/legal";
export const metadata = {
  title: "Soporte | Nival Tech",
  description: "Ayuda y contacto para usuarios de Nival Tech.",
};

export default async function SupportPage() {
  const business = await legalBusinessInfo();
  return (
    <main className="legalShell">
      <Link className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</Link>
      <section className="legalCard">
        <p className="eyebrow">CENTRO DE AYUDA</p>
        <h1>Soporte de Nival Tech</h1>
        <p>¿Necesitas ayuda con Nival Pay, Nival Puntos, Nival Intelligence, tu cuenta o el uso de tus datos? Escríbenos con el contexto del caso para poder revisarlo.</p>
        <h2>Proveedor y contacto</h2><p><strong>{business.legalName}</strong> · nombre comercial {business.tradeName}</p>{business.rfc && <p>RFC: {business.rfc}</p>}{business.address && <p>Domicilio: {business.address}</p>}{business.phone && <p>Teléfono: {business.phone}</p>}<p><a className="supportEmail" href={`mailto:${business.supportEmail}`}>{business.supportEmail}</a></p>
        <h2>Incluye en tu mensaje</h2>
        <ul>
          <li>Tu nombre, negocio y producto de Nival relacionado con el caso.</li>
          <li>Una descripción clara del problema.</li>
          <li>No envíes contraseñas, claves privadas ni datos bancarios.</li>
        </ul>
        <h2>Equipos y múltiples ubicaciones</h2><p>Si estás evaluando Nival para varias sucursales o quieres plantear un piloto, incluye el número aproximado de ubicaciones, el problema que buscas resolver y el producto que te interesa evaluar.</p><p>También puedes solicitar acceso, corrección o eliminación de tus datos personales por este medio.</p>
        <div className="legalLinks"><Link href="/privacy">Privacidad</Link><Link href="/terms">Términos</Link><Link href="/cookies">Cookies</Link><Link href="/refunds">Reembolsos</Link></div>
      </section>
    </main>
  );
}
