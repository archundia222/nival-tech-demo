import { redirect } from 'next/navigation';
import { DashboardNavigation } from '../dashboard-navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveBusinessMembership } from '@/lib/active-business';
import styles from './page.module.css';

export default async function AiWebsiteServicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Fdashboard%2Fweb-ia');

  const membership = await getActiveBusinessMembership(user.id);
  if (!membership) redirect('/dashboard');

  const [{ data: business }, { data: legal }] = await Promise.all([
    supabase.from('businesses').select('name').eq('id', membership.business_id).maybeSingle(),
    createAdminClient().from('site_legal_settings').select('phone').eq('id', 'default').maybeSingle(),
  ]);

  const businessName = business?.name ?? 'Tu negocio';
  const rawPhone = String(legal?.phone ?? '').replace(/\D/g, '');
  const whatsappPhone = rawPhone.length === 10 ? `52${rawPhone}` : rawPhone;
  const message = [
    'Hola, quiero cotizar una página web con inteligencia artificial con Nival Tech.',
    `Mi negocio es: ${businessName}.`,
    'Me gustaría saber qué incluye, tiempos de entrega y precio.',
  ].join('\n');
  const whatsappHref = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;

  return <main className="dashboardApp nivalDashboard">
    <DashboardNavigation businessName={businessName} active="web-ia" />
    <div className={`dashboardContent ${styles.shell}`}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>SERVICIO A LA MEDIDA</span>
          <h1>Tu página web, creada con IA y terminada por Nival.</h1>
          <p>No es una plantilla genérica. Diseñamos una presencia digital pensada para tu negocio, tus clientes y el objetivo que quieres conseguir.</p>
          <div className={styles.heroActions}>
            <a className={styles.primary} href={whatsappHref} target="_blank" rel="noreferrer">Cotizar por WhatsApp →</a>
            <span>Precio y alcance se cotizan por separado.</span>
          </div>
        </div>
        <div className={styles.preview} aria-hidden="true">
          <div className={styles.browserBar}><i/><i/><i/><span>tunegocio.mx</span></div>
          <div className={styles.previewBody}>
            <small>DISEÑADO PARA CONVERTIR</small>
            <strong>Una web que se siente hecha para tu marca.</strong>
            <div className={styles.previewCards}><span/><span/><span/></div>
            <button type="button" tabIndex={-1}>Reservar / Comprar / Contactar</button>
          </div>
        </div>
      </section>

      <section className={styles.valueGrid}>
        <article><span>01</span><h2>Diseño profesional</h2><p>Jerarquía, tipografía, imágenes, movimiento y experiencia móvil adaptados al negocio.</p></article>
        <article><span>02</span><h2>Contenido con IA</h2><p>Usamos IA para acelerar estructura, textos e ideas, pero el resultado se revisa y aterriza para que no parezca una página genérica.</p></article>
        <article><span>03</span><h2>Funciones que sí sirven</h2><p>Podemos integrar WhatsApp, formularios, reservas, catálogo, pagos, reseñas, mapas o funciones especiales según el proyecto.</p></article>
        <article><span>04</span><h2>Publicada y lista</h2><p>La cotización puede contemplar dominio, configuración, despliegue y acompañamiento para dejarla funcionando.</p></article>
      </section>

      <section className={styles.process}>
        <div><span>CÓMO FUNCIONA</span><h2>Primero entendemos qué necesitas. Después te cotizamos.</h2></div>
        <ol>
          <li><b>1</b><span><strong>Nos escribes</strong><small>Cuéntanos qué vende tu negocio y qué quieres lograr con la página.</small></span></li>
          <li><b>2</b><span><strong>Definimos alcance</strong><small>Landing, sitio completo, catálogo, reservas, pagos o una solución especial.</small></span></li>
          <li><b>3</b><span><strong>Recibes cotización</strong><small>Precio, entregables y tiempo estimado antes de empezar.</small></span></li>
        </ol>
      </section>

      <section className={styles.finalCta}>
        <div><span>PÁGINAS WEB CON IA</span><h2>¿Quieres una para {businessName}?</h2><p>El mensaje ya lleva el nombre de tu negocio para que solo tengas que enviarlo.</p></div>
        <a href={whatsappHref} target="_blank" rel="noreferrer">Solicitar cotización →</a>
      </section>
    </div>
  </main>;
}
