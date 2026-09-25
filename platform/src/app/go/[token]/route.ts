import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SmartLinkRouteProps {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, { params }: SmartLinkRouteProps) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_smart_link", { link_token: token });
  const destination = data?.[0]?.target_url;

  let validDestination: URL | null = null;
  try {
    const parsed = new URL(destination);
    if (['https:', 'http:'].includes(parsed.protocol) && parsed.hostname.includes('.')) validDestination = parsed;
  } catch { /* Existing incomplete links must not become a broken redirect. */ }

  if (error || !validDestination) {
    return NextResponse.redirect(new URL("/support", _request.url));
  }

  return NextResponse.redirect(validDestination, 307);
}
