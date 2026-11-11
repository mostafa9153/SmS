import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

/**
 * Client for server-side reads behind a permission gate.
 *
 * RLS on staff tables (students, admission, certificates) lets only Admin and
 * Staff through, so a Teacher gets zero rows from the cookie client even with
 * the permission. What a Teacher may do is decided by requireStaff() on the
 * API route and by the proxy on the page, so after that gate their reads use
 * the service role. Call this only from code that sits behind such a gate.
 */
export async function createDataClient() {
  const auth = await getAuthenticatedUserRole();
  if (auth.role === "Teacher") return createAdminClient() as unknown as Awaited<ReturnType<typeof createClient>>;
  return createClient();
}
