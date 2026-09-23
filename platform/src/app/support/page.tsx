import Link from "next/link";
export const metadata = {
  title: "Soporte | Nival Tech",
  description: "Ayuda y contacto para usuarios de Nival Tech.",
};

export default function SupportPage() {
  return (
    <main className="legalShell">
      <Link className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</Link>
      <section className="legalCard">
        <p className="eyebrow">CENTRO DE AYUDA</p>
        <h1>Soporte de Nival Tech</h1>
        <p>¿Necesitas ayuda con Nival Pay, Nival Puntos, Nival Intelligence, tu cuenta o el uso de tus datos? Escríbenos con el contexto del caso para poder revisarlo.</p>
        <h2>Soporte y contacto</h2>
        <p><a className="supportEmail" href="mailto:rodrigoarchundia379@gmail.com">rodrigoarchundia379@gmail.com</a></p>
        <h2>Incluye en tu mensaje</h2>
        <ul>
          <li>Tu nombre, negocio y producto de Nival relacionado con el caso.</li>
          <li>Una descripción clara del problema.</li>
          <li>No envíes contraseñas, claves privadas ni datos bancarios.</li>
        </ul>
        <h2>Equipos y múltiples ubicaciones</h2><p>Si estás evaluando Nival para varias sucursales o quieres plantear un piloto, incluye el número aproximado de ubicaciones, el problema que buscas resolver y el producto que te interesa evaluar.</p><p>También puedes solicitar acceso, corrección o eliminación de tus datos personales por este medio.</p>
        <a className="textLink" href="/privacy">Consultar aviso de privacidad</a>
      </section>
    </main>
  );
}
