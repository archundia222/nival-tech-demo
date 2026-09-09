import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase.auth.getUser();

  const connected = !error || error.name === "AuthSessionMissingError";

  return NextResponse.json(
    {
      service: "nival-tech-platform",
      database: connected ? "reachable" : "unavailable",
    },
    { status: connected ? 200 : 503 },
  );
}
