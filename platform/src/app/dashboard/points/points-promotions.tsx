"use client";

import { useMemo, useState, useTransition } from "react";
import { sendPointsWalletPromotion } from "./promotions-actions";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  marketing_consent_at: string | null;
};

const templates = [
  {
    label: "10% de descuento",
    title: "10% de descuento para ti",
    body: "Hola {{nombre}}, tienes 10% de descuento en tu próxima visita. Muéstranos este mensaje antes de pagar. Aplican condiciones del negocio.",
  },
  {
    label: "Regresa esta semana",
    title: "Tenemos algo para ti",
    body: "Hola {{nombre}}, vuelve esta semana y sigue avanzando hacia tu próxima recompensa. Te esperamos.",
  },
  {
    label: "San Valentín",
    title: "Una promo para celebrar",
    body: "Hola {{nombre}}, esta semana tenemos una promoción especial de San Valentín. Pregunta por ella en tu próxima visita.",
  },
  {
    label: "Black Friday",
    title: "Black Friday en tu negocio favorito",
    body: "Hola {{nombre}}, tenemos una promoción especial de Black Friday por tiempo limitado. Ven antes de que termine.",
  },
];

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  return digits;
}

export function PointsPromotionsPanel({ businessName, customers }: { businessName: string; customers: Customer[] }) {
  const eligible = useMemo(() => customers.filter((customer) => customer.marketing_consent_at), [customers]);
  const whatsappEligible = eligible.filter((customer) => customer.phone);
  const [title, setTitle] = useState("Tenemos algo para ti");
  const [body, setBody] = useState("Hola {{nombre}}, vuelve pronto a " + businessName + " y sigue avanzando hacia tu próxima recompensa.");
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();

  function whatsappUrl(customer: Customer) {
    const firstName = customer.name.split(" ")[0] || customer.name;
    const personalized = body.replaceAll("{{nombre}}", firstName);
    return `https://wa.me/${normalizePhone(customer.phone ?? "")}?text=${encodeURIComponent(personalized)}`;
  }

  function sendWallet() {
    setStatus("");
    startTransition(async () => {
      const result = await sendPointsWalletPromotion({ title, body });
      if (result.ok) {
        setStatus(`Notificación enviada a ${result.sent} tarjeta${result.sent === 1 ? "" : "s"} de Google Wallet.${result.failed ? ` ${result.failed} no pudieron recibirla.` : ""}`);
      } else {
        setStatus(result.error ?? "No pudimos enviar la notificación.");
      }
    });
  }

  return <section className="pointsPromotions">
    <div className="pointsSectionHeading">
      <div><span>PROMOCIONES + WALLET</span><h2>Manda descuentos y haz que vuelvan</h2></div>
      <p>Envía una notificación a las tarjetas guardadas en Google Wallet o abre WhatsApp con el mensaje listo. Solo aparecen clientes que aceptaron recibir promociones.</p>
    </div>

    <div className="pointsPromotionStats">
      <article><small>AUTORIZADOS</small><strong>{eligible.length}</strong><span>clientes con consentimiento</span></article>
      <article><small>WHATSAPP</small><strong>{whatsappEligible.length}</strong><span>con teléfono disponible</span></article>
      <article><small>GOOGLE WALLET</small><strong>Push</strong><span>para tarjetas guardadas y con notificaciones activas</span></article>
    </div>

    <div className="pointsPromotionWorkspace">
      <article className="pointsPromotionComposer">
        <span className="pointsPromoEyebrow">CREAR PROMOCIÓN</span>
        <h3>Escribe una vez. Personaliza con el nombre.</h3>
        <p>Usa <code>{"{{nombre}}"}</code> para insertar automáticamente el primer nombre del cliente.</p>

        <div className="pointsPromoTemplates">
          {templates.map((template) => <button key={template.label} type="button" onClick={() => {
            setTitle(template.title);
            setBody(template.body);
          }}>{template.label}</button>)}
        </div>

        <label>Título de la notificación
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={60} />
        </label>
        <label>Mensaje
          <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={280} rows={5} />
        </label>

        <div className="pointsPromoActions">
          <button type="button" className="nvPrimaryButton" onClick={sendWallet} disabled={pending || !eligible.length}>
            {pending ? "Enviando…" : "Enviar notificación a Google Wallet"}
          </button>
          <small>Google limita las notificaciones de Wallet para evitar spam. El cliente también debe tener la tarjeta guardada y sus notificaciones activas.</small>
        </div>
        {status && <p className="pointsStatus">{status}</p>}
      </article>

      <article className="pointsPromotionRecipients">
        <span className="pointsPromoEyebrow">ENVÍO DIRECTO</span>
        <h3>WhatsApp, cliente por cliente</h3>
        <p>Abre el chat con el mensaje listo. Tú decides cuándo enviarlo.</p>
        {!whatsappEligible.length ? <div className="pointsEmptyState">Todavía no hay clientes con teléfono y consentimiento comercial.</div> :
          <div className="pointsPromoCustomerList">
            {whatsappEligible.slice(0, 30).map((customer) => <div key={customer.id}>
              <span><strong>{customer.name}</strong><small>{customer.phone}</small></span>
              <a href={whatsappUrl(customer)} target="_blank" rel="noreferrer">Abrir WhatsApp →</a>
            </div>)}
          </div>}
      </article>
    </div>

    <div className="pointsWalletExplainer">
      <div><span>FLUJO COMPLETO</span><h3>QR → tarjeta móvil → puntos → premio → promoción</h3></div>
      <ol>
        <li><b>1</b><span>El cliente escanea el QR y se registra.</span></li>
        <li><b>2</b><span>Abre su tarjeta desde el teléfono y puede guardarla en Google Wallet.</span></li>
        <li><b>3</b><span>Cada visita suma hasta llegar a la recompensa que configuraste.</span></li>
        <li><b>4</b><span>Si aceptó promociones, puedes volver a contactarlo por WhatsApp o Wallet.</span></li>
      </ol>
    </div>
  </section>;
}
