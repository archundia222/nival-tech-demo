import { notFound } from "next/navigation";
import { getPublicLoyaltyCard } from "@/app/points/actions";
import { RotatingPointsQr } from "./rotating-points-qr";

interface CardPageProps { params: Promise<{ token: string }>; }

export default async function CardPage({ params }: CardPageProps) {
  const { token } = await params;
  let card;
  try { card = await getPublicLoyaltyCard(token); } catch { notFound(); }
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
    <RotatingPointsQr accountToken={token} />
    <p className="pointsPrivacyNote">Tu teléfono no se muestra en esta tarjeta. El QR temporal solo sirve para identificar tu cuenta en caja.</p>
  </main>;
}
