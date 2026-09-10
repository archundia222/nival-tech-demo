import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface CardPageProps {
  params: Promise<{ token: string }>;
}

export default async function CardPage({ params }: CardPageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_loyalty_card_v2", {
    account_token: token,
  });
  if (error || !data?.[0]) notFound();
  const card = data[0];

  return (
    <main className="customerShell">
      <header className="customerBrand"><span className="brandmark">N</span><span>Tarjeta digital por <b>NIVAL tech</b></span></header>
      <section className="digitalCard">
        <div><p className="eyebrow">{card.program_name}</p><h1>{card.business_name}</h1></div>
        <div className="cardBalance"><strong>{card.points_balance}</strong><span>puntos</span></div>
        <div className="cardFooter"><span>{card.customer_name}</span><span>{card.visit_count} visitas</span></div>
      </section>
      <section className="rewardProgress">
        <div><span>Tu recompensa</span><strong>{card.reward_description}</strong></div>
        {card.points_balance >= card.reward_threshold
          ? <b>Premio disponible</b>
          : <b>Te faltan {card.reward_threshold - card.points_balance} puntos</b>}
      </section>
      <section className="cardNotice">
        <h2>Tu saldo está actualizado</h2>
        <p>Tu meta es llegar a {card.reward_threshold} puntos. Guarda tu tarjeta para tenerla siempre disponible.</p>
        <div className="walletActions">
          <a className="primaryButton" href={`/api/wallet/google/${encodeURIComponent(token)}`}>
            Agregar a Google Wallet
          </a>
        </div>
      </section>
    </main>
  );
}
