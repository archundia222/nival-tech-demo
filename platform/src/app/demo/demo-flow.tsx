"use client";

import Link from "next/link";
import { useState } from "react";
import { PaymentPageView } from "../pay/[token]/payment-page-view";

type Section = "inicio" | "pay" | "reseñas" | "wifi" | "landing";
const sections: { id: Section; title: string; hint: string }[] = [
  { id: "inicio", title: "Inicio", hint: "Conoce las tarjetas del negocio" },
  { id: "pay", title: "Pay", hint: "Escribe datos de ejemplo" },
  { id: "reseñas", title: "Reseñas de Google", hint: "Conecta un enlace de ejemplo" },
  { id: "wifi", title: "WiFi", hint: "Prepara el acceso de invitados" },
  { id: "landing", title: "Landing page", hint: "Mira la página del negocio" },
];

export function DemoFlow() {
  const [section, setSection] = useState<Section>("inicio");
  const [business, setBusiness] = useState("Café de ejemplo");
  const [holder, setHolder] = useState("María González");
  const [bank, setBank] = useState("BBVA");
  const [clabe, setClabe] = useState("000000000000000000");
  const [reviewUrl, setReviewUrl] = useState("");
  const [wifi, setWifi] = useState("Café Invitados");
  const [description, setDescription] = useState("Café, bebidas y momentos para compartir.");
  const index = sections.findIndex(item => item.id === section);
  const next = () => setSection(sections[Math.min(index + 1, sections.length - 1)].id);
  const profile = { business_name: business || "Tu negocio", business_slug: null, points_enabled: false, logo_url: null, brand_color: "#147a50", account_holder: holder, bank_name: bank, clabe, concept: "Pago de consumo", payment_url: null, holder_visible: true, bank_visible: true, clabe_visible: true, concept_visible: true, payment_url_visible: false, custom_sections: [] };
  return <main className="dashboardApp nivalDashboard demoDashboard">
    <aside className="dashboardSidebar professionalSidebar demoSidebar">
      <Link className="professionalBrand" href="/"><span>T</span><b>TOCARIO</b></Link>
      <div className="workspaceSwitcher"><span>{business.slice(0,1).toUpperCase()}</span><div><small>NEGOCIO DE EJEMPLO</small><strong>{business}</strong></div></div>
      <nav className="sidebarNav professionalNav" aria-label="Secciones de la demostración">
        {sections.map((item, position) => <button type="button" key={item.id} className={`sidebarMainProduct demoNavItem ${section === item.id ? "active" : ""}`} onClick={() => setSection(item.id)}><span className="demoNavNumber">{position + 1}</span><span>{item.title}</span></button>)}
      </nav>
      <p className="demoSidebarNote">Puedes probar todos los campos. Son datos de ejemplo y no se publican.</p>
    </aside>
    <div className="dashboardContent demoContent">
      <header className="dashboardContentTopbar"><div><span>Panel del negocio · demostración</span><b>Paso {index + 1} de {sections.length}</b></div><span className="ready">Sin cuenta</span></header>
      <nav className="demoMobileSteps" aria-label="Pasos de la demostración">{sections.map((item, position) => <button type="button" key={item.id} aria-current={section === item.id ? "step" : undefined} onClick={() => setSection(item.id)}>{position + 1}. {item.title}</button>)}</nav>
      <div className="demoInstruction"><strong>Haz esto ahora</strong><span>{sections[index].hint}. Después pulsa «Siguiente paso».</span><span>{index + 1} / {sections.length}</span></div>
      {section === "inicio" && <><section className="dashboardHero nivalHomeHero"><div><p className="eyebrow">TU NEGOCIO EN TOCARIO</p><h1>{business}</h1><p>Este es el mismo tipo de panel que recibe un negocio al entrar.</p></div></section><section className="homeCardSections"><div className="homeCardsHeader"><p className="eyebrow">TUS TARJETAS</p><h2>Lo que puedes compartir</h2></div>{sections.slice(1,4).map(item => <button type="button" className="homeCardSection demoSectionButton" key={item.id} onClick={() => setSection(item.id)}><span>{item.title}</span><strong>Explorar tarjeta →</strong></button>)}</section><button className="demoNextButton" onClick={next}>Siguiente paso: Pay →</button></>}
      {section === "pay" && <><section className="payHeading"><p className="eyebrow">MI TARJETA PAY</p><h1>Configura tus datos de cobro</h1><p>Las etiquetas te indican qué llenar. La vista de la derecha cambia mientras escribes.</p></section><div className="demoEditorGrid"><div className="demoEditForm"><label>1. Nombre del negocio<input value={business} onChange={e => setBusiness(e.target.value)} maxLength={100}/></label><label>2. Beneficiario<input value={holder} onChange={e => setHolder(e.target.value)} maxLength={100}/></label><label>3. Banco<input value={bank} onChange={e => setBank(e.target.value)} maxLength={80}/></label><label>4. CLABE de ejemplo<input value={clabe} inputMode="numeric" onChange={e => setClabe(e.target.value.replace(/\D/g, "").slice(0,18))}/></label><small>Los datos de esta demo no se guardan ni sirven para cobrar.</small></div><div className="demoCustomerPreview"><span>ASÍ LO VE TU CLIENTE</span><PaymentPageView profile={profile} embedded /></div></div><button className="demoNextButton" onClick={next}>Siguiente paso: Reseñas →</button></>}
      {section === "reseñas" && <><section className="payHeading"><p className="eyebrow">RESEÑAS DE GOOGLE</p><h1>Facilita que te dejen una reseña</h1><p>Al acercar el celular a la tarjeta, tu cliente abre directamente tu enlace de reseñas de Google.</p></section><div className="demoEditorGrid"><div className="demoEditForm"><label>1. Pega el enlace de reseñas de Google<input type="url" placeholder="https://g.page/r/..." value={reviewUrl} onChange={e=>setReviewUrl(e.target.value)}/></label><small>Este ejemplo no abre ni publica el enlace que escribas.</small></div><div className="demoReviewPreview"><span>ASÍ LO VE TU CLIENTE</span><strong>Reseñas de Google</strong><h2>¿Cómo fue tu experiencia en {business}?</h2><p>Tu opinión honesta ayuda a otras personas a conocer el negocio.</p><span className="demoPreviewAction">Abrir reseñas de Google →</span></div></div><button className="demoNextButton" onClick={next}>Siguiente paso: WiFi →</button></>}
      {section === "wifi" && <><section className="payHeading"><p className="eyebrow">TARJETA WIFI</p><h1>Comparte el acceso de invitados</h1><p>El cliente acerca su celular y abre el acceso de tu red.</p></section><div className="demoEditorGrid"><div className="demoEditForm"><label>1. Nombre de tu red de invitados<input value={wifi} onChange={e=>setWifi(e.target.value)}/></label><small>En el panel real configuras el enlace de acceso seguro.</small></div><div className="demoReviewPreview"><span>ASÍ LO VE TU CLIENTE</span><strong>WiFi para clientes</strong><h2>{business}</h2><p>Red: {wifi || "Tu red"}</p><span className="demoPreviewAction">Abrir acceso WiFi →</span></div></div><button className="demoNextButton" onClick={next}>Siguiente paso: Landing page →</button></>}
      {section === "landing" && <><section className="payHeading"><p className="eyebrow">LANDING PAGE DEL NEGOCIO</p><h1>Todo en una página</h1><p>Escribe una descripción y revisa cómo se presenta tu negocio.</p></section><div className="demoEditorGrid"><div className="demoEditForm"><label>1. Nombre del negocio<input value={business} onChange={e=>setBusiness(e.target.value)}/></label><label>2. Descripción<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={240}/></label></div><div className="demoReviewPreview"><span>PERFIL DEL NEGOCIO</span><h2>{business}</h2><p>{description}</p><div className="demoLandingActions"><span>Pagar</span><span>Reseñas de Google</span><span>WiFi</span></div></div></div><Link className="demoNextButton" href="/auth">Crear mi negocio →</Link></>}
    </div>
  </main>;
}
