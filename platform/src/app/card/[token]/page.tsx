import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { getPublicLoyaltyCard, getPublicLoyaltyRewards } from "@/app/points/actions";
import { CustomerPointsActions } from "./customer-points-actions";

interface CardPageProps { params: Promise<{ token: string }>; }

export default async function CardPage({ params }: CardPageProps) {
  const { token } = await params;
  let card;
  let rewards;
  try { [card, rewards] = await Promise.all([getPublicLoyaltyCard(token), getPublicLoyaltyRewards(token)]); } catch { notFound(); }
  if (!card) notFound();

  const progress = Math.min(100, Math.round((Number(card.points_balance) / Number(card.reward_threshold)) * 100));
  const availableRewards = rewards.filter((reward: { redeemed_at: string | null }) => !reward.redeemed_at);
  const redeemedRewards = rewards.filter((reward: { redeemed_at: string | null }) => reward.redeemed_at);
  return <main className="pointsCustomerShell nivalDashboard" style={{ "--nv-accent": card.business_brand_color || "#C8A65A" } as CSSProperties}>
    <header className="pointsCustomerBrand"><span className="pointsCustomerNivalMark">N</span><span>Beneficios digitales por <a href="/?from=nival-puntos"><b>NIVAL tech</b></a></span></header>
    <section className="pointsCustomerCard">
      <div className="pointsCustomerCardTop"><div className="pointsBusinessIdentity">{card.business_logo_url ? <img src={card.business_logo_url} alt={`Logo de ${card.business_name}`}/> : <span>{card.business_name.slice(0,1).toUpperCase()}</span>}<div><p className="pointsCustomerProgram">{card.program_name}</p><h1>{card.business_name}</h1></div></div><span className="pointsCustomerMemberBadge">MIEMBRO</span></div>
      <div className="pointsCustomerGreeting"><span>Hola, {card.customer_first_name}</span><small>Tu saldo actual</small></div>
      <div className="pointsBalance"><strong>{card.points_balance}</strong><span>puntos</span></div>
      <div className="pointsProgressBlock"><div className="pointsProgressMeta"><span>Progreso</span><b>{card.points_balance} / {card.reward_threshold}</b></div><div className="pointsProgress" aria-label={`${progress}% hacia la recompensa`}><i style={{ width: `${progress}%` }} /></div></div>
      <div className="pointsReward"><div><span>PRÓXIMA RECOMPENSA</span><strong>{card.reward_description}</strong></div>
        {Number(card.points_remaining) === 0 ? <b>Lista para usar</b> : <b>Te faltan {card.points_remaining} puntos</b>}
      </div>
      {availableRewards.length > 0 && <div className="pointsAvailableNotice"><span>✓</span><div><strong>{availableRewards.length} {availableRewards.length === 1 ? "recompensa disponible" : "recompensas disponibles"}</strong><small>Ya puedes canjear {availableRewards.length === 1 ? "tu premio" : "tus premios"} en caja.</small></div></div>}
    </section>
    <CustomerPointsActions accountToken={token} rewards={rewards} pointsRemaining={Number(card.points_remaining)} />
    <p className="pointsPrivacyNote">Tu teléfono no se muestra en esta tarjeta. El QR temporal solo sirve para identificar tu cuenta en caja.</p>
    {card.business_slug && <a className="publicBusinessHub" href={`/p/${card.business_slug}`}><span><small>MÁS DE {card.business_name.toUpperCase()}</small><strong>Pagar, contactar o ver otros accesos del negocio</strong></span><b>→</b></a>}
    <aside className="publicNivalPromo"><div><span>¿TAMBIÉN TIENES UN NEGOCIO?</span><strong>Crea tu propio programa de lealtad.</strong><p>Nival Puntos te ayuda a registrar visitas, premiar recurrencia y entender quién vuelve.</p></div><a href="/?from=nival-puntos#productos">Conocer Nival Tech →</a></aside>
  </main>;
}
