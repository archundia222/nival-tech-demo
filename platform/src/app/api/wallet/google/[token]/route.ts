import { NextRequest, NextResponse } from "next/server";
import { createGoogleWalletJwt, syncGoogleWalletObject } from "@/lib/google-wallet";
import { getPublicLoyaltyCard } from "@/app/points/actions";
import { createPointsAdminClient } from "@/lib/supabase/points-admin";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { token } = await params;

  let card;
  try {
    card = await getPublicLoyaltyCard(token);
  } catch (error) {
    console.error("Google Wallet card lookup failed", error);
    return NextResponse.json({ error: "No pudimos cargar la tarjeta." }, { status: 500 });
  }

  if (!card) {
    return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 });
  }

  const admin = createPointsAdminClient();
  const { data: account } = await admin.from('loyalty_accounts')
    .select('business_id')
    .eq('public_token', token)
    .maybeSingle();
  const { data: entitlement } = account?.business_id
    ? await admin.from('business_product_entitlements')
        .select('status')
        .eq('business_id', account.business_id)
        .eq('product_code', 'nival_points')
        .maybeSingle()
    : { data: null };

  if (entitlement?.status !== 'active') {
    return NextResponse.json({ error: "Google Wallet está disponible con Nival Puntos Pro." }, { status: 403 });
  }

  // A returning customer may already have saved this object. Refresh its
  // current balance before opening the Google Wallet save link again.
  try {
    await syncGoogleWalletObject({
      token,
      businessName: card.business_name,
      customerName: card.customer_first_name,
      points: Number(card.points_balance),
      visits: Number(card.visit_count),
    });
  } catch (error) {
    // New cards do not have a Wallet object yet. Saving the JWT creates one.
    if (!(error instanceof Error && error.message.includes("status 404"))) {
      console.error("Google Wallet existing card refresh failed", error);
    }
  }

  try {
    const jwt = createGoogleWalletJwt(
      {
        token,
        businessName: card.business_name,
        customerName: card.customer_first_name,
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
