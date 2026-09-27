import Image from "next/image";
import Link from "next/link";
import { LandingReveal } from "./landing-reveal";
import { PaymentPageView } from "./pay/[token]/payment-page-view";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  NIVAL_PAY_FOUNDER_PRICE_CENTS,
  NIVAL_POINTS_FOUNDER_PRICE_CENTS,
  NIVAL_POINTS_FREE_CUSTOMER_LIMIT,
  NIVAL_TRIAL_DAYS,
  mxn,
} from "@/lib/commercial";

const payFreeUrl = "/auth?mode=signup&next=%2Fdashboard%2Fpay";
const payProUrl = "/auth?mode=signup&next=%2Fcheckout";
const pointsUrl = "/auth?mode=signup&next=%2Fdashboard%2Fpoints";

const payPreview = {
  business_name: "Café Nival",
  business_slug: null,
  points_enabled: false,
  logo_url: null,
  brand_color: "#b89a5a",
  account_holder: "Café Nival Demo",
  bank_name: "BBVA",
  clabe: "012180015022688507",
  concept: "Pago de consumo",
  payment_url: null,
  holder_visible: true,
  bank_visible: true,
  clabe_visible: true,
  concept_visible: true,
  payment_url_visible: false,
  custom_sections: [],
};

export default async function Home() {
  const { data: legal } = await createAdminClient()
    .from("site_legal_settings")
    .select("phone")
    .eq("id", "default")
    .maybeSingle();

  const rawSalesPhone = String(legal?.phone ?? "").replace(/\D/g, "");
  const salesPhone = rawSalesPhone.length === 10 ? `52${rawSalesPhone}` : rawSalesPhone;
  const salesWhatsappHref = salesPhone
    ? `https://wa.me/${salesPhone}?text=${encodeURIComponent("Hola, quiero saber qué opción de Nival conviene para mi negocio.")}`
    : "/support";

  return (
    <main className="landing landingV2" id="inicio">
      <LandingReveal />

      <nav className="landingNav" aria-label="Navegación principal">
        <Link className="landingBrand" href="#inicio" aria-label="Nival Tech, inicio">
          <Image src="/wallet/nival-logo.svg" alt="" width={38} height={38} priority />
          <span>Nival Tech</span>
        </Link>
        <div className="landingNavLinks">
          <a href="#productos">Productos</a>
          <a href="#experiencia">Así lo ve tu cliente</a>
          <a href="#planes">Planes</a>
        </div>
        <div className="landingNavCtas">
          <Link className="landingLogin" href="/auth">Entrar</Link>
        </div>
      </nav>

      <section className="landingHero landingV2Hero">
        <div className="landingHeroCopy">
          <p className="landingKicker heroReveal heroReveal1"><span /> Tecnología para hacer crecer tu negocio</p>
          <h1 className="heroReveal heroReveal2">
            <span>Cobra fácil.</span>
            <span>Fideliza clientes.</span>
            <span>Crece.</span>
          </h1>
          <p className="landingHeroLead heroReveal heroReveal3">
            Nival te ayuda a cobrar mejor y hacer que tus clientes regresen, sin cambiar la forma en que ya trabajas.
          </p>
          <div className="landingHeroActions heroReveal heroReveal4">
            <a className="landingPrimary" href="#planes">Ver planes <b>↓</b></a>
            <a className="landingSecondary" href="#experiencia">Ver la experiencia</a>
          </div>
          <div className="landingOwnerProof heroReveal heroReveal5">
            <span>Tu cliente no instala nada</span>
            <span>Funciona desde su celular</span>
            <span>Tú controlas todo desde Nival</span>
          </div>
        </div>

        <div className="landingV2Visual heroVisualReveal" aria-label="Vista de Nival Pay y Nival Puntos">
          <div className="landingFloatCard pay">
            <small>NIVAL PAY</small>
            <strong>Tu cliente encuentra cómo pagarte en segundos.</strong>
            <div><span>QR</span><span>Link</span><span>Acercar celular</span></div>
          </div>
          <div className="landingFloatCard points">
            <small>NIVAL PUNTOS</small>
            <strong>Cada visita acerca al cliente a una recompensa.</strong>
            <div className="landingMiniProgress"><i /></div>
            <span>7 de 10 visitas</span>
          </div>
        </div>
      </section>

      <section className="landingV2Products scrollReveal" id="productos">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">DOS PRODUCTOS. DOS PROBLEMAS.</p>
          <h2>Dos problemas comunes. Dos soluciones fáciles de entender.</h2>
        </div>
        <div className="landingV2ProductGrid">
          <article>
            <span>COBRAR MEJOR</span>
            <h3>Nival Pay</h3>
            <p>Haz que pagar sea más rápido y evita repetir tus datos de cobro una y otra vez.</p>
            <div className="landingOutcomeList"><b>Comparte una sola página</b><b>Actualiza tus datos sin cambiar el acceso</b><b>Úsalo en mostrador, mesa o redes</b></div>
          </article>
          <article>
            <span>HACER QUE REGRESEN</span>
            <h3>Nival Puntos</h3>
            <p>Dales una razón clara para regresar y lleva puntos, visitas y recompensas sin tarjetas de papel.</p>
            <div className="landingOutcomeList"><b>Registro sencillo por QR</b><b>Progreso visible en el celular</b><b>Premios y visitas en un solo lugar</b></div>
          </article>
        </div>
      </section>

      <section className="landingExperience scrollReveal" id="experiencia">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">ASÍ LO VE TU CLIENTE</p>
          <h2>No te lo imagines. Esto es lo que recibe.</h2>
          <p>La vista pública está pensada para ser clara incluso para alguien que nunca ha usado Nival.</p>
        </div>

        <div className="landingExperienceGrid">
          <article className="landingExperiencePanel">
            <div className="landingExperienceLabel"><span>NIVAL PAY</span><strong>Datos listos para pagar</strong></div>
            <PaymentPageView profile={payPreview} embedded />
          </article>

          <article className="landingExperiencePanel">
            <div className="landingExperienceLabel"><span>NIVAL PUNTOS</span><strong>Tarjeta digital del cliente</strong></div>
            <div className="landingPointsExact nivalDashboard">
              <header className="pointsCustomerBrand"><span className="pointsCustomerNivalMark">N</span><span>Beneficios digitales por <b>NIVAL tech</b></span></header>
              <section className="pointsCustomerCard">
                <div className="pointsCustomerCardTop">
                  <div className="pointsBusinessIdentity"><span>C</span><div><p className="pointsCustomerProgram">Clientes frecuentes</p><h1>Café Nival</h1></div></div>
                  <span className="pointsCustomerMemberBadge">MIEMBRO</span>
                </div>
                <div className="pointsCustomerGreeting"><span>Hola, Ana</span><small>Tu saldo actual</small></div>
                <div className="pointsBalance"><strong>7</strong><span>puntos</span></div>
                <div className="pointsProgressBlock">
                  <div className="pointsProgressMeta"><span>Progreso</span><b>7 / 10</b></div>
                  <div className="pointsProgress"><i style={{ width: "70%" }} /></div>
                </div>
                <div className="pointsReward"><div><span>PRÓXIMA RECOMPENSA</span><strong>Café de la casa gratis</strong></div><b>Te faltan 3 puntos</b></div>
              </section>
            </div>
          </article>
        </div>
      </section>

      <section className="landingPlansV2 scrollReveal" id="planes">
        <div className="landingSectionHeading compact">
          <p className="landingEyebrow">PLANES</p>
          <h2>Elige lo que necesitas. El precio y lo que incluye están aquí mismo.</h2>
        </div>

        <div className="landingPlanProduct">
          <div className="landingPlanTitle"><span>NIVAL PAY</span><h3>Haz más fácil que te paguen.</h3></div>
          <div className="landingPlanChoices">
            <article>
              <span>GRATIS</span>
              <strong>$0</strong>
              <p>Una página para que tus clientes vean cómo pagarte desde su celular.</p>
              <Link href={payFreeUrl}>Empezar gratis</Link>
            </article>
            <article className="featured">
              <span>COMPLETO</span>
              <strong>{mxn(NIVAL_PAY_FOUNDER_PRICE_CENTS)}</strong>
              <small>pago único</small>
              <p>Todo lo anterior + pago acercando el celular en tu negocio y 3 formas de cobro configurables.</p>
              <Link href={payProUrl}>Comprar Nival Pay</Link>
            </article>
          </div>
        </div>

        <div className="landingPlanProduct">
          <div className="landingPlanTitle"><span>NIVAL PUNTOS</span><h3>Dales una razón para volver.</h3></div>
          <div className="landingPlanChoices">
            <article>
              <span>GRATIS</span>
              <strong>$0</strong>
              <p>Programa de puntos para empezar con hasta {NIVAL_POINTS_FREE_CUSTOMER_LIMIT} clientes.</p>
              <Link href={pointsUrl}>Empezar gratis</Link>
            </article>
            <article className="featured">
              <span>PRO</span>
              <strong>{mxn(NIVAL_POINTS_FOUNDER_PRICE_CENTS)}</strong>
              <small>al mes · {NIVAL_TRIAL_DAYS} días de prueba</small>
              <p>Más capacidad, más control del programa y herramientas para volver a contactar clientes.</p>
              <Link href={pointsUrl}>Probar Nival Puntos Pro</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="landingV2How scrollReveal">
        <div><span>1</span><strong>Crea tu cuenta</strong><p>Correo, contraseña y nombre de tu negocio.</p></div>
        <div><span>2</span><strong>Elige Pay o Puntos</strong><p>Empieza gratis o activa el plan de paga cuando quieras.</p></div>
        <div><span>3</span><strong>Compártelo</strong><p>Tu cliente abre Nival desde su celular y sabe qué hacer.</p></div>
      </section>

      <section className="landingFinalCta landingV2Final scrollReveal">
        <p className="landingEyebrow">EMPIEZA SIMPLE</p>
        <h2>Primero resuelve un problema. Después decides si necesitas más.</h2>
        <div className="landingHeroActions">
          <a className="landingPrimary" href="#planes">Elegir plan</a>
          <a className="landingSecondary" href={salesWhatsappHref} target={salesPhone ? "_blank" : undefined} rel={salesPhone ? "noreferrer" : undefined}>Necesito ayuda por WhatsApp</a>
        </div>
      </section>

      <footer className="landingFooter">
        <Link className="landingBrand" href="#inicio">
          <Image src="/wallet/nival-logo.svg" alt="" width={34} height={34} />
          <span>Nival Tech</span>
        </Link>
        <p>Herramientas simples para cobrar mejor y hacer que tus clientes regresen.</p>
        <div><Link href="/support">Soporte</Link><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link><Link href="/refunds">Reembolsos</Link><Link href="/auth">Entrar</Link></div>
      </footer>
    </main>
  );
}
