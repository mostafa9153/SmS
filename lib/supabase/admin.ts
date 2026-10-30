import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses RLS. Server code only (enforced by `server-only`).
 * Missing credentials fail loudly in production instead of silently degrading
 * to the anon key, which used to return RLS-filtered (often empty) data.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Supabase admin client misconfigured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    }
    console.warn("[supabase/admin] service-role env missing; falling back to anon key (dev only)");
  }

  return createClient(
    url || "https://placeholder-project.supabase.co",
    key || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
