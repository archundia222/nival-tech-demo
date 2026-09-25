import { appleWalletReady } from '@/lib/apple-wallet';
import { applePassForToken, passResponse } from '@/lib/apple-wallet-pass-service';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!appleWalletReady()) return Response.json({ error: 'Apple Wallet todavía no está configurado.' }, { status: 503 });
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new Response(null, { status: 404 });
  try {
    const pass = await applePassForToken(token);
    return pass ? passResponse(pass) : new Response(null, { status: 404 });
  } catch (error) {
    console.error('[apple-wallet] pass generation failed', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'No se pudo preparar el pase.' }, { status: 503 });
  }
}
