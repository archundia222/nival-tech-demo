import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface CardPageProps {
  params: Promise<{ token: string }>;
}

export default async function CardPage({ params }: CardPageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_loyalty_card", {
    account_token: token,
  });
  if (error || !data?.[0]) notFound();
  const card = data[0];

  return (
    <main className="customerShell">
      <header className="customerBrand"><span className="brandmark">N</span><span>Tarjeta digital por <b>NIVAL tech</b></span></header>
      <section className="digitalCard">
        <div><p className="eyebrow">TARJETA DE LEALTAD</p><h1>{card.business_name}</h1></div>
        <div className="cardBalance"><strong>{card.points_balance}</strong><span>puntos</span></div>
        <div className="cardFooter"><span>{card.customer_name}</span><span>{card.visit_count} visitas</span></div>
      </section>
      <section className="cardNotice"><h2>Tu saldo está actualizado</h2><p>Esta dirección identifica tu cuenta de lealtad. Próximamente podrás guardarla directamente en Apple Wallet o Google Wallet.</p></section>
    </main>
  );
}
