import 'server-only';
import { getPublicLoyaltyCard } from '@/app/points/actions';
import { createPointsAdminClient } from '@/lib/supabase/points-admin';
import { createApplePass } from '@/lib/apple-wallet';

export async function applePassForToken(token: string) {
  const card = await getPublicLoyaltyCard(token);
  if (!card) return null;
  const admin = createPointsAdminClient();
  const { data: message, error } = await admin.from('loyalty_wallet_messages')
    .select('title, body').eq('pass_serial', token).maybeSingle();
  if (error) throw error;
  return createApplePass({
    token,
    businessName: card.business_name,
    customerName: card.customer_first_name,
    points: Number(card.points_balance),
    visits: Number(card.visit_count),
    reward: card.reward_description,
  }, message);
}

export function passResponse(buffer: Buffer) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'content-type': 'application/vnd.apple.pkpass',
      'content-disposition': 'attachment; filename="nival-puntos.pkpass"',
      'cache-control': 'private, no-store',
    },
  });
}
