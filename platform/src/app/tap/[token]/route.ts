import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { PROFILE_UUID, signVisit } from '@/lib/pay-visit';

export const dynamic = 'force-dynamic';

// Record no event here: redirects, link previews and prefetches are not visits.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!PROFILE_UUID.test(token)) return new NextResponse(null, { status: 404 });
  const destination = new URL(`/pay/${token}`, request.url);
  destination.searchParams.set('visit', signVisit(token, randomUUID(), 'card'));
  const response = NextResponse.redirect(destination, 307);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
