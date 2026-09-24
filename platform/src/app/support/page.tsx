import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Soporte",
  description: "Ayuda y contacto para usuarios de Nival Tech.",
};

export default async function SupportPage() {
  const { data: legal } = await createAdminClient().from("site_legal_settings").select("phone,support_email").eq("id", "default").maybeSingle();
  const rawPhone = String(legal?.phone ?? "").replace(/\D/g, "");
  const phone = rawPhone.length === 10 ? `52${rawPhone}` : rawPhone;
  const whatsappMessage = "Hola, necesito ayuda o información sobre Nival Tech. Mi negocio es: ";
  const whatsappHref = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}` : null;
  const supportEmail = legal?.support_email ?? "rodrigoarchundia379@gmail.com";

  return (
    <main className="legalShell">
      <Link className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</Link>
      <section className="legalCard">
        <p className="eyebrow">CENTRO DE AYUDA</p>
        <h1>¿En qué te ayudamos?</h1>
        <p>Si estás configurando Nival, quieres cotizar una solución o algo no está funcionando, escríbenos con el contexto del caso.</p>

        <div className="supportContactGrid">
          {whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer"><span>RESPUESTA DIRECTA</span><strong>WhatsApp</strong><small>Ideal para dudas comerciales, configuración o una cotización.</small></a>}
          <a href={`mailto:${supportEmail}`}><span>CORREO</span><strong>{supportEmail}</strong><small>Útil si necesitas mandar detalles o dar seguimiento a un caso.</small></a>
        </div>

        <h2>Para ayudarte más rápido</h2>
        <ul>
          <li>Incluye tu nombre, negocio y el producto de Nival relacionado con el caso.</li>
          <li>Describe qué intentabas hacer y qué apareció en pantalla.</li>
          <li>No envíes contraseñas, claves privadas, NIP, CVV ni información sensible que no sea necesaria.</li>
        </ul>

        <h2>¿Estás evaluando Nival para tu negocio?</h2>
        <p>Cuéntanos si te interesa Nival Pay, Nival Puntos, Nival Growth (Puntos + Intelligence), una página web con IA o una implementación para varias ubicaciones. Podemos empezar por una necesidad concreta.</p>
        <p>También puedes solicitar acceso, corrección o eliminación de tus datos personales por estos mismos medios.</p>
        <a className="textLink" href="/privacy">Consultar aviso de privacidad</a>
      </section>
    </main>
  );
}
