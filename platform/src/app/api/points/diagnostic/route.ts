import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? "unknown";
  return NextResponse.json({
    ok: projectRef === "wwuihvpudtsowjeaityr",
    environment: process.env.VERCEL_ENV ?? "local",
    projectRef,
  }, { headers: { "Cache-Control": "no-store" } });
}
