import { validApplePassRequest } from '@/lib/apple-wallet';
import { applePassForToken, passResponse } from '@/lib/apple-wallet-pass-service';

export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ passType: string; serial: string }> }) {
  const { passType, serial } = await params;
  if (!validApplePassRequest(serial, passType, request.headers.get('authorization'))) return new Response(null, { status: 401 });
  try {
    const pass = await applePassForToken(serial);
    return pass ? passResponse(pass) : new Response(null, { status: 404 });
  } catch (error) {
    console.error('[apple-wallet] update failed', error instanceof Error ? error.message : 'unknown');
    return new Response(null, { status: 503 });
  }
}
