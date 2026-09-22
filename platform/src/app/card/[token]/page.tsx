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
  return <main className="pointsCustomerShell nivalDashboard">
    <header className="pointsCustomerBrand"><span className="brandmark">N</span><span>Tarjeta digital por <b>NIVAL tech</b></span></header>
    <section className="pointsCustomerCard">
      <div><p className="eyebrow">{card.program_name}</p><h1>{card.business_name}</h1><span className="pointsCustomerName">{card.customer_first_name}</span></div>
      <div className="pointsBalance"><strong>{card.points_balance}</strong><span>puntos</span></div>
      <div className="pointsProgress" aria-label={`${progress}% hacia la recompensa`}><i style={{ width: `${progress}%` }} /></div>
      <div className="pointsReward"><span>Tu recompensa</span><strong>{card.reward_description}</strong>
        {Number(card.points_remaining) === 0 ? <b>Premio disponible</b> : <b>Te faltan {card.points_remaining} puntos</b>}
      </div>
    </section>
    <details className="pointsCustomerRewards">
      <summary className="nvPrimaryButton">Ver recompensas</summary>
      <div className="pointsRewardList">
        <h2>Recompensas disponibles</h2>
        {rewards.filter((reward: { redeemed_at: string | null }) => !reward.redeemed_at).length ? rewards.filter((reward: { redeemed_at: string | null }) => !reward.redeemed_at).map((reward: { id: string; description: string; earned_at: string }) => <article key={reward.id}><strong>{reward.description}</strong><span>Disponible · obtenida {new Intl.DateTimeFormat("es-MX",{dateStyle:"medium",timeZone:"America/Mexico_City"}).format(new Date(reward.earned_at))}</span><p>Muestra tu QR temporal en caja para canjearla.</p></article>) : <p className="pointsMuted">Todavía no tienes recompensas disponibles.</p>}
        <h2>Historial</h2>
        {rewards.filter((reward: { redeemed_at: string | null }) => reward.redeemed_at).length ? rewards.filter((reward: { redeemed_at: string | null }) => reward.redeemed_at).map((reward: { id: string; description: string; redeemed_at: string }) => <article key={reward.id}><strong>{reward.description}</strong><span>Canjeada · {new Intl.DateTimeFormat("es-MX",{dateStyle:"medium",timeZone:"America/Mexico_City"}).format(new Date(reward.redeemed_at))}</span></article>) : <p className="pointsMuted">Aún no has canjeado recompensas.</p>}
      </div>
    </details>
    <RotatingPointsQr accountToken={token} />
    <p className="pointsPrivacyNote">Tu teléfono no se muestra en esta tarjeta. El QR temporal solo sirve para identificar tu cuenta en caja.</p>
  </main>;
}
