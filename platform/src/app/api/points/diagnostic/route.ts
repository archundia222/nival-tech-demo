import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? "unknown";
  const admin = createAdminClient();
  const { data, error } = await admin.from("businesses").select("id").eq("slug", "cafe-puntos-qa").maybeSingle();
  return NextResponse.json({
    ok: projectRef === "wwuihvpudtsowjeaityr" && Boolean(data) && !error,
    environment: process.env.VERCEL_ENV ?? "local",
    projectRef,
    testDatabaseReachable: Boolean(data) && !error,
  }, { headers: { "Cache-Control": "no-store" } });
}
