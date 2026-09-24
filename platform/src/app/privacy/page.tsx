import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Privacidad",
  description: "Aviso de privacidad de la plataforma Nival Tech.",
};

export default async function PrivacyPage() {
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
        <p className="eyebrow">ÚLTIMA ACTUALIZACIÓN: 24 DE SEPTIEMBRE DE 2026</p>
        <h1>Aviso de privacidad</h1>
        <p>{legalName}, operando bajo el nombre comercial {tradeName}, es responsable del tratamiento descrito en este aviso. Domicilio de contacto: {address}.</p>

        <div className="legalIdentity" aria-label="Identidad del responsable">
          <span>RESPONSABLE</span>
          <strong>{legalName}</strong>
          <p>{tradeName} · {address}</p>
          <p>{supportEmail}{legal?.phone ? ` · ${legal.phone}` : ""}</p>
        </div>

        <p>Nival Tech ofrece herramientas digitales para negocios, incluyendo páginas de cobro informativas, programas de lealtad, perfiles digitales y funciones de análisis y recomendaciones. Este aviso explica qué datos podemos tratar, para qué los utilizamos y cómo puedes ejercer tus derechos.</p>

        <h2>Datos que podemos tratar</h2>
        <p>Dependiendo del producto utilizado, podemos tratar nombre, teléfono, correo electrónico, consentimientos, negocio asociado, visitas, puntos, recompensas, ventas o importes que el negocio decida registrar, la relación opcional de esas ventas con clientes, configuraciones del negocio y datos técnicos necesarios para operar el servicio. Nival Pay puede mostrar los datos de transferencia que el propio negocio decide publicar; Nival Tech no solicita NIP, CVV ni contraseñas bancarias para esa función.</p>

        <h2>Finalidades</h2>
        <ul>
          <li>Crear y mantener cuentas, perfiles y configuraciones de los productos Nival.</li>
          <li>Operar páginas de cobro informativas, registrar visitas, puntos, beneficios y actividad necesaria para las funciones contratadas.</li>
          <li>Generar y actualizar pases de Google Wallet cuando lo solicites.</li>
          <li>Brindar soporte, prevenir abuso y mantener la seguridad del servicio.</li>
          <li>Enviar promociones únicamente cuando exista el consentimiento registrado para ello.</li>
        </ul>

        <h2>Proveedores y transferencias</h2>
        <p>Utilizamos proveedores tecnológicos para alojamiento, base de datos, procesamiento de pagos y emisión de pases, incluyendo Vercel, Supabase, Mercado Pago y Google Wallet según la función utilizada. Compartimos únicamente la información necesaria para prestar esas funciones. No vendemos tus datos personales.</p>

        <h2>Conservación y seguridad</h2>
        <p>Conservamos la información durante el tiempo necesario para operar el programa, atender solicitudes y cumplir obligaciones aplicables. Aplicamos controles de acceso y medidas técnicas razonables para protegerla.</p>

        <h2>Tus derechos</h2>
        <p>Puedes solicitar acceso, corrección, eliminación, oposición al tratamiento o revocar tu consentimiento escribiendo a <a className="supportEmail" href={`mailto:${supportEmail}`}>{supportEmail}</a>. Incluye información suficiente para identificar tu cuenta y el negocio relacionado.</p>

        <h2>Cambios</h2>
        <p>Podremos actualizar este aviso conforme evolucione el servicio. La versión vigente siempre estará disponible en esta página.</p>
        <Link className="textLink" href="/support">Ir al centro de soporte</Link>
      </section>
    </main>
  );
}
