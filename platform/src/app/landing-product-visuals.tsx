"use client";

import { PaymentPageView } from "./pay/[token]/payment-page-view";

const payProfile = {
  business_name: "Café Nival",
  business_slug: null,
  points_enabled: false,
  logo_url: null,
  brand_color: "#cdae67",
  account_holder: "Café Nival",
  bank_name: "BBVA",
  clabe: "000000000000000000",
  concept: "Pago de consumo",
  payment_url: null,
  holder_visible: true,
  bank_visible: true,
  clabe_visible: true,
  concept_visible: true,
  payment_url_visible: false,
  custom_sections: [],
};

export function LandingProductVisuals() {
  return <div className="heroRealProducts" aria-label="Vistas reales de los productos Nival">
    <div className="heroRealProduct heroRealPay">
      <span className="heroRealLabel">NIVAL PAY</span>
      <div className="heroRealViewport">
        <PaymentPageView profile={payProfile} embedded />
      </div>
    </div>

    <div className="heroRealProduct heroRealPoints">
      <span className="heroRealLabel">NIVAL PUNTOS</span>
      <div className="heroPointsExact nivalDashboard">
        <section className="pointsCustomerCard">
          <div className="pointsCustomerCardTop">
            <div className="pointsBusinessIdentity"><span>C</span><div><p className="pointsCustomerProgram">Clientes frecuentes</p><h1>Café Nival</h1></div></div>
            <span className="pointsCustomerMemberBadge">MIEMBRO</span>
          </div>
          <div className="pointsCustomerGreeting"><span>Hola, Ana</span><small>Tu saldo actual</small></div>
          <div className="pointsBalance"><strong>7</strong><span>puntos</span></div>
          <div className="pointsProgressBlock"><div className="pointsProgressMeta"><span>Progreso</span><b>7 / 10</b></div><div className="pointsProgress"><i style={{ width: "70%" }} /></div></div>
          <div className="pointsReward"><div><span>PRÓXIMA RECOMPENSA</span><strong>Café gratis</strong></div><b>Te faltan 3 puntos</b></div>
        </section>
      </div>
    </div>

    <div className="heroRealProduct heroRealReviews">
      <span className="heroRealLabel">NIVAL RESEÑAS</span>
      <div className="heroReviewExact">
        <div className="heroReviewStars">★★★★★</div>
        <strong>¿Cómo fue tu experiencia?</strong>
        <p>Tu opinión ayuda a este negocio.</p>
        <button type="button">Dejar reseña</button>
      </div>
    </div>
  </div>;
}
