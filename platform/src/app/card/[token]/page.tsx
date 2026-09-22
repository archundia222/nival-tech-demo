import { notFound } from "next/navigation";
import { getPublicLoyaltyCard, getPublicLoyaltyRewards } from "@/app/points/actions";
import { RotatingPointsQr } from "./rotating-points-qr";

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
  return <main className="pointsCustomerShell nivalDashboard">
    <header className="pointsCustomerBrand"><span className="pointsCustomerNivalMark">N</span><span>Beneficios digitales por <b>NIVAL tech</b></span></header>
    <section className="pointsCustomerCard">
      <div className="pointsCustomerCardTop"><div><p className="pointsCustomerProgram">{card.program_name}</p><h1>{card.business_name}</h1></div><span className="pointsCustomerMemberBadge">MIEMBRO</span></div>
      <div className="pointsCustomerGreeting"><span>Hola, {card.customer_first_name}</span><small>Tu saldo actual</small></div>
      <div className="pointsBalance"><strong>{card.points_balance}</strong><span>puntos</span></div>
      <div className="pointsProgressBlock"><div className="pointsProgressMeta"><span>Progreso</span><b>{card.points_balance} / {card.reward_threshold}</b></div><div className="pointsProgress" aria-label={`${progress}% hacia la recompensa`}><i style={{ width: `${progress}%` }} /></div></div>
      <div className="pointsReward"><div><span>PRÓXIMA RECOMPENSA</span><strong>{card.reward_description}</strong></div>
        {Number(card.points_remaining) === 0 ? <b>Lista para usar</b> : <b>Te faltan {card.points_remaining} puntos</b>}
      </div>
      {availableRewards.length > 0 && <div className="pointsAvailableNotice"><span>✓</span><div><strong>{availableRewards.length} {availableRewards.length === 1 ? "recompensa disponible" : "recompensas disponibles"}</strong><small>Ya puedes canjear {availableRewards.length === 1 ? "tu premio" : "tus premios"} en caja.</small></div></div>}
    </section>
    <details className="pointsCustomerRewards">
      <summary><span>Ver recompensas</span><b>{availableRewards.length > 0 ? availableRewards.length : "›"}</b></summary>
      <div className="pointsRewardList">
        <h2>Recompensas disponibles</h2>
        {availableRewards.length ? availableRewards.map((reward: { id: string; description: string; earned_at: string }) => <article key={reward.id} className="pointsRewardAvailable"><div className="pointsRewardAvailableTop"><span className="pointsRewardGift">★</span><strong>{reward.description}</strong></div><span>Disponible · obtenida {new Intl.DateTimeFormat("es-MX",{dateStyle:"medium",timeZone:"America/Mexico_City"}).format(new Date(reward.earned_at))}</span><p>Tu recompensa ya está guardada. Para usarla, genera tu código temporal y muéstralo en caja.</p><a className="pointsRedeemCta" href="#codigo-temporal">Canjear recompensa <span>→</span></a></article>) : <p className="pointsMuted">Todavía no tienes recompensas disponibles.</p>}
        <h2>Historial</h2>
        {redeemedRewards.length ? redeemedRewards.map((reward: { id: string; description: string; redeemed_at: string }) => <article key={reward.id}><strong>{reward.description}</strong><span>Canjeada · {new Intl.DateTimeFormat("es-MX",{dateStyle:"medium",timeZone:"America/Mexico_City"}).format(new Date(reward.redeemed_at))}</span></article>) : <p className="pointsMuted">Aún no has canjeado recompensas.</p>}
      </div>
    </details>
    <div id="codigo-temporal"><RotatingPointsQr accountToken={token} /></div>
    <p className="pointsPrivacyNote">Tu teléfono no se muestra en esta tarjeta. El QR temporal solo sirve para identificar tu cuenta en caja.</p>
  </main>;
}
