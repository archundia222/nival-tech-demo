export const metadata = {
  title: "Soporte | Nival Tech",
  description: "Ayuda y contacto para usuarios de Nival Tech.",
};

export default function SupportPage() {
  return (
    <main className="legalShell">
      <a className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</a>
      <section className="legalCard">
        <p className="eyebrow">CENTRO DE AYUDA</p>
        <h1>Soporte de Nival Tech</h1>
        <p>¿Necesitas ayuda con tu tarjeta digital, tus puntos o el uso de tus datos? Escríbenos y revisaremos tu caso.</p>
        <h2>Contacto</h2>
        <p><a className="supportEmail" href="mailto:rodrigoarchundia379@gmail.com">rodrigoarchundia379@gmail.com</a></p>
        <h2>Incluye en tu mensaje</h2>
        <ul>
          <li>Tu nombre y el negocio donde utilizas la tarjeta.</li>
          <li>Una descripción clara del problema.</li>
          <li>No envíes contraseñas, claves privadas ni datos bancarios.</li>
        </ul>
        <p>También puedes solicitar acceso, corrección o eliminación de tus datos personales por este medio.</p>
        <a className="textLink" href="/privacy">Consultar aviso de privacidad</a>
      </section>
    </main>
  );
}
