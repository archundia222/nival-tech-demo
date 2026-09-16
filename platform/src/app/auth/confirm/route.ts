import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const requestedNext = searchParams.get("next") ?? "/dashboard";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));

    const { data: { user } } = await supabase.auth.getUser();
    if (user) return NextResponse.redirect(new URL(next, request.url));

    console.warn("[auth/confirm] Email confirmed but session exchange failed", {
      message: error.message,
    });

    const message = "Tu correo ya fue confirmado. Inicia sesión para continuar.";
    return NextResponse.redirect(
      new URL(`/auth?message=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`, request.url),
    );
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(
    new URL(`/auth?error=${encodeURIComponent("El enlace no es válido o ya venció.")}`, request.url),
  );
}
