import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { getPublicLoyaltyCard, getPublicLoyaltyRewards } from "@/app/points/actions";
import { CustomerPointsActions } from "./customer-points-actions";
import { CardSaveActions } from "./card-save-actions";

export const metadata = { robots: { index: false, follow: false } };

interface CardPageProps { params: Promise<{ token: string }>; }

export default async function CardPage({ params }: CardPageProps) {
  const { token } = await params;
  let card;
  let rewards;
  try { [card, rewards] = await Promise.all([getPublicLoyaltyCard(token), getPublicLoyaltyRewards(token)]); } catch { notFound(); }
  if (!card) notFound();

  const progress = Math.min(100, Math.round((Number(card.points_balance) / Number(card.reward_threshold)) * 100));
  const availableRewards = rewards.filter((reward: { redeemed_at: string | null }) => !reward.redeemed_at);
  const userAgent = (await headers()).get("user-agent") ?? "";
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const googleWalletReady = Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
    process.env.GOOGLE_WALLET_CLASS_SUFFIX &&
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_WALLET_PRIVATE_KEY
  );
  return <main className="pointsCustomerShell nivalDashboard" style={{ "--nv-accent": card.business_brand_color || "#C8A65A" } as CSSProperties}>
    <header className="pointsCustomerBrand"><span className="pointsCustomerNivalMark">N</span><span>Beneficios digitales por <Link href="/?from=nival-puntos"><b>NIVAL tech</b></Link></span></header>
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
    <section className="pointsWalletSaveCard">
      <div>
        <span>TU TARJETA EN EL CELULAR</span>
        <strong>{googleWalletReady ? "Google Wallet + avisos de promociones" : "Tenla siempre a la mano"}</strong>
        <p>{googleWalletReady
          ? isIOS
            ? "En Android puedes agregar esta tarjeta a Google Wallet y recibir avisos de promociones y descuentos del negocio. En iPhone puedes guardar este acceso y volver cuando quieras."
            : "Agrégala a Google Wallet para llevar tus puntos contigo y recibir avisos de promociones y descuentos cuando el negocio los envíe."
          : "Google Wallet aún no está habilitado para este negocio. Mientras tanto puedes guardar el enlace de tu tarjeta para volver a consultar tus puntos."}</p>
      </div>
      <div className="pointsWalletSaveActions">
        {googleWalletReady && !isIOS && <a href={`/api/wallet/google/${encodeURIComponent(token)}`}>Agregar a Google Wallet →</a>}
        {googleWalletReady && isIOS && <span className="pointsMuted">Google Wallet está disponible en Android.</span>}
        {!googleWalletReady && <span className="pointsMuted">La opción de agregar a Google Wallet estará disponible cuando se complete su configuración.</span>}
        <CardSaveActions />
      </div>
    </section>
    <CustomerPointsActions accountToken={token} rewards={rewards} pointsRemaining={Number(card.points_remaining)} />
    <p className="pointsPrivacyNote">Tu teléfono no se muestra en esta tarjeta. El QR temporal solo sirve para identificar tu cuenta en caja.</p>
    {card.business_slug && <Link className="publicBusinessHub" href={`/p/${card.business_slug}`}><span><small>MÁS DE {card.business_name.toUpperCase()}</small><strong>Pagar, contactar o ver otros accesos del negocio</strong></span><b>→</b></Link>}
    <aside className="publicNivalPromo"><div><span>¿TAMBIÉN TIENES UN NEGOCIO?</span><strong>Crea tu propio programa de lealtad.</strong><p>Nival Puntos te ayuda a registrar visitas y premiar la recurrencia con una tarjeta digital sencilla.</p></div><Link href="/?from=nival-puntos#productos">Conocer Nival Tech →</Link></aside>
  </main>;
}
