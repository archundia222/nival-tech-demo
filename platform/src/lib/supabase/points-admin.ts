import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createPointsAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error("Nival Puntos server credentials are not configured.");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
