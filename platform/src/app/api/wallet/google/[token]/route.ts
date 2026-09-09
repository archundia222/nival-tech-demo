import { NextRequest, NextResponse } from "next/server";
import { createGoogleWalletJwt } from "@/lib/google-wallet";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_loyalty_card", {
    account_token: token,
  });

  if (error || !data?.[0]) {
    return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 });
  }

  const card = data[0];

  try {
    const jwt = createGoogleWalletJwt(
      {
        token,
        businessName: card.business_name,
        customerName: card.customer_name,
        points: Number(card.points_balance),
        visits: Number(card.visit_count),
      },
      request.nextUrl.origin,
    );

    return NextResponse.redirect(`https://pay.google.com/gp/v/save/${jwt}`);
  } catch (error) {
    console.error("Google Wallet configuration error", error);
    return NextResponse.json(
      { error: "Google Wallet todavía no está configurado." },
      { status: 503 },
    );
  }
}
