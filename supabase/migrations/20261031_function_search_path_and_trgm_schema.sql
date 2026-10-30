-- Pin search_path on functions flagged by the Supabase linter, and move pg_trgm out of public.
-- GIN indexes keep working: they bind to the operator class by OID, not by schema.
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_my_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_staff_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_school_id(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.next_admission_counter(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.next_school_id(text) SET search_path = public, pg_temp;

CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
