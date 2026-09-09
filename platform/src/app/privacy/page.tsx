export const metadata = {
  title: "Privacidad | Nival Tech",
  description: "Aviso de privacidad de la plataforma Nival Tech.",
};

export default function PrivacyPage() {
  return (
    <main className="legalShell">
      <a className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</a>
      <section className="legalCard">
        <p className="eyebrow">ÚLTIMA ACTUALIZACIÓN: 9 DE SEPTIEMBRE DE 2026</p>
        <h1>Aviso de privacidad</h1>
        <p>Nival Tech opera una plataforma de lealtad digital para negocios. Este aviso explica qué datos tratamos, para qué los utilizamos y cómo puedes ejercer tus derechos.</p>
        <h2>Datos que podemos tratar</h2>
        <p>Nombre, teléfono, correo electrónico opcional, consentimientos, negocio asociado, visitas, puntos y datos técnicos necesarios para operar la tarjeta digital.</p>
        <h2>Finalidades</h2>
        <ul>
          <li>Crear y mantener tu cuenta de lealtad.</li>
          <li>Registrar visitas, puntos y beneficios.</li>
          <li>Generar y actualizar pases de Google Wallet cuando lo solicites.</li>
          <li>Brindar soporte, prevenir abuso y mantener la seguridad del servicio.</li>
          <li>Enviar promociones únicamente cuando hayas dado tu consentimiento.</li>
        </ul>
        <h2>Proveedores y transferencias</h2>
        <p>Utilizamos proveedores tecnológicos para alojamiento, base de datos y emisión de pases, incluyendo Vercel, Supabase y Google Wallet. Compartimos únicamente la información necesaria para prestar estas funciones. No vendemos tus datos personales.</p>
        <h2>Conservación y seguridad</h2>
        <p>Conservamos la información durante el tiempo necesario para operar el programa, atender solicitudes y cumplir obligaciones aplicables. Aplicamos controles de acceso y medidas técnicas razonables para protegerla.</p>
        <h2>Tus derechos</h2>
        <p>Puedes solicitar acceso, corrección, eliminación, oposición al tratamiento o revocar tu consentimiento escribiendo a <a className="supportEmail" href="mailto:rodrigoarchundia379@gmail.com">rodrigoarchundia379@gmail.com</a>. Incluye información suficiente para identificar tu cuenta y el negocio relacionado.</p>
        <h2>Cambios</h2>
        <p>Podremos actualizar este aviso conforme evolucione el servicio. La versión vigente siempre estará disponible en esta página.</p>
        <a className="textLink" href="/support">Ir al centro de soporte</a>
      </section>
    </main>
  );
}
