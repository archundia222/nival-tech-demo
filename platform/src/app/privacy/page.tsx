import Link from "next/link";
import { LEGAL_VERSION, legalBusinessInfo, privacyDisclosuresReady } from "@/lib/legal";

export const metadata = {
  title: "Aviso de privacidad | Nival Tech",
  description: "Aviso de privacidad integral de Nival Tech.",
};

export default async function PrivacyPage() {
  const [business, privacyReady] = await Promise.all([legalBusinessInfo(), privacyDisclosuresReady()]);
  return (
    <main className="legalShell">
      <Link className="brand" href="/"><span className="brandmark">N</span>NIVAL tech</Link>
      <section className="legalCard">
        <p className="eyebrow">VERSIÓN {LEGAL_VERSION} · 24 DE SEPTIEMBRE DE 2026</p>
        <h1>Aviso de privacidad integral</h1>
        {!privacyReady && <p className="legalWarning" role="alert">La identidad legal y el domicilio del responsable aún no han sido configurados. Por seguridad jurídica, Nival mantiene deshabilitadas las nuevas altas de datos personales hasta completar esta información.</p>}
        <p><strong>Responsable.</strong> {business.legalName}, que opera comercialmente como {business.tradeName}, es responsable del tratamiento de los datos personales que obtiene directamente a través de la plataforma cuando actúa como responsable. Contacto para privacidad: <a className="supportEmail" href={`mailto:${business.supportEmail}`}>{business.supportEmail}</a>.</p>
        {business.address && <p><strong>Domicilio del responsable:</strong> {business.address}.</p>}
        {business.phone && <p><strong>Teléfono:</strong> {business.phone}.</p>}
        {business.rfc && <p><strong>RFC:</strong> {business.rfc}.</p>}

        <h2>Datos que tratamos</h2>
        <p>Según la función utilizada, podemos tratar nombre, correo, teléfono, negocio y rol, datos de configuración, consentimientos, visitas, puntos, recompensas, ventas o importes que el negocio decide registrar, archivos que el usuario carga, datos de entrega de tarjetas físicas y datos técnicos necesarios para seguridad y operación. Para Nival Pay podemos tratar y publicar, por instrucción expresa del negocio, beneficiario, banco, CLABE y otros datos de cobro.</p>

        <h2>Finalidades necesarias</h2>
        <ul>
          <li>Crear, autenticar y mantener cuentas y espacios de trabajo.</li>
          <li>Operar Nival Pay, páginas públicas, QR, enlaces, perfiles digitales, programas de puntos, recompensas y funciones contratadas.</li>
          <li>Procesar pedidos, pagos, suscripciones, soporte, entregas y prevención de fraude o abuso.</li>
          <li>Generar pases de Google Wallet cuando la persona usuaria solicite esa función.</li>
          <li>Generar métricas operativas propias como aperturas de páginas, copias de CLABE y clics en enlaces para mostrar resultados del producto.</li>
          <li>Cumplir obligaciones legales, atender derechos de titulares y proteger la seguridad de la plataforma.</li>
        </ul>

        <h2>Finalidades opcionales</h2>
        <p>El envío de promociones de un negocio a sus clientes es una finalidad opcional y se mantiene separada del alta necesaria al programa. No es requisito aceptar marketing para usar Nival Puntos. El consentimiento para promociones puede negarse o revocarse.</p>

        <h2>Datos financieros o patrimoniales publicados en Nival Pay</h2>
        <p>Cuando beneficiario, banco o CLABE correspondan a una persona física, solicitamos autorización expresa antes de guardar y publicar esos datos en la página Nival Pay. Nival no solicita NIP, CVV, contraseñas bancarias ni claves de banca electrónica para prestar esta función.</p>

        <h2>Proveedores y transferencias</h2>
        <p>Utilizamos proveedores que actúan como encargados o terceros necesarios para prestar funciones concretas: Vercel para alojamiento y entrega del sitio; Supabase para base de datos, autenticación y almacenamiento; Mercado Pago para procesar compras y suscripciones elegidas por el usuario; y Google Wallet cuando se solicita guardar un pase. Compartimos únicamente los datos necesarios para la función solicitada. Un enlace externo configurado por un negocio puede llevar a un servicio elegido por ese negocio y quedará sujeto a las políticas de ese tercero.</p>
        <p>No vendemos bases de datos personales ni usamos los datos de clientes de un negocio para vender publicidad conductual de Nival.</p>

        <h2>Cookies y tecnologías similares</h2>
        <p>Usamos cookies de sesión necesarias para autenticación y seguridad. Actualmente no instalamos herramientas de analítica publicitaria de terceros. Consulta la <Link href="/cookies">Política de cookies</Link> para conocer el detalle y cualquier cambio futuro.</p>

        <h2>Conservación y seguridad</h2>
        <p>Conservamos la información solo durante el tiempo razonablemente necesario para las finalidades descritas, la relación contractual, prevención de fraude, respaldo operativo y obligaciones legales aplicables. Aplicamos controles de acceso, separación por espacios de trabajo, validaciones del lado servidor y medidas técnicas razonables. Ningún sistema conectado a internet puede garantizar riesgo cero.</p>

        <h2>Derechos ARCO y revocación</h2>
        <p>Puedes solicitar acceso, rectificación, cancelación u oposición, así como revocar un consentimiento, escribiendo a <a className="supportEmail" href={`mailto:${business.supportEmail}`}>{business.supportEmail}</a>. Indica tu nombre, correo o teléfono asociado, negocio relacionado, derecho que deseas ejercer y la información necesaria para localizar el registro. Podemos pedir información razonable para verificar identidad antes de entregar o modificar datos. Responderemos conforme a los plazos legales aplicables.</p>

        <h2>Limitación de uso o divulgación</h2>
        <p>Puedes negarte a comunicaciones promocionales desde el momento de registro cuando exista esa opción o solicitar posteriormente que se detengan por el canal de privacidad. La negativa a finalidades opcionales no impide usar funciones esenciales del servicio.</p>

        <h2>Clientes de negocios que usan Nival</h2>
        <p>Cuando un negocio introduce o importa datos de sus propios clientes, ese negocio debe contar con una base legítima y los avisos o autorizaciones que correspondan. Nival trata esa información para prestar las funciones contratadas y no la reutiliza para marketing propio.</p>
        <p>Cuando una persona se registra directamente mediante un formulario público alojado por Nival, Nival recopila los datos indicados en el aviso simplificado para crear y operar la cuenta o tarjeta solicitada y los pone a disposición del negocio participante para prestar ese programa. El negocio es responsable de cualquier uso posterior que haga para sus propios fines. El envío de promociones del negocio permanece separado y requiere la elección opcional correspondiente.</p>

        <h2>Cambios al aviso</h2>
        <p>Publicaremos en esta misma dirección cualquier cambio material y actualizaremos la fecha y versión. Si una nueva finalidad requiere consentimiento adicional, lo solicitaremos antes de usar los datos para esa finalidad.</p>

        <div className="legalLinks"><Link href="/cookies">Cookies</Link><Link href="/terms">Términos</Link><Link href="/refunds">Reembolsos</Link><Link href="/support">Soporte</Link></div>
      </section>
    </main>
  );
}
