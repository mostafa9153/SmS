import { createAdminClient } from "@/lib/supabase/admin";
import { currentYearIST } from "@/lib/utils/academic-year";

const TTL_MS = 60_000;
let cached: { year: number; at: number } | null = null;

/**
 * Server-side current academic year: `admission_settings.current_academic_year`, else the
 * IST calendar year. The client reads the same setting through `useAcademicYear()`, so both
 * sides agree between January and the session change. Cached for 60s per server instance.
 */
export async function getAcademicYear(): Promise<number> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.year;
  let year = currentYearIST();
  try {
    const { data } = await createAdminClient()
      .from("admission_settings")
      .select("current_academic_year")
      .eq("school_id", "default")
      .maybeSingle();
    const saved = Number(data?.current_academic_year);
    if (saved > 0) year = saved;
  } catch {
    // Settings unreadable: the calendar year is the documented fallback.
  }
  cached = { year, at: Date.now() };
  return year;
}

/** Call after the settings change so this instance does not serve the old year for a minute. */
export function clearAcademicYearCache() {
  cached = null;
}
