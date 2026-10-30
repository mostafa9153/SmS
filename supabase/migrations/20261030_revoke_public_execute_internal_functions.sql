-- ============================================================
-- Internal SECURITY DEFINER functions are only called by the server
-- with the service role (admit route, application-row, school-id
-- generator). Remove the default PUBLIC grant and the anon/authenticated
-- grants so /rest/v1/rpc cannot reach them.
-- Left as is on purpose: is_admin, is_staff_or_admin, get_my_role (used
-- by RLS policies) and verify_certificate_public / verify_invoice_public
-- (meant to be public).
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.generate_school_id(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_admission_counter(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_school_id(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.generate_school_id(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.next_admission_counter(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.next_school_id(text) TO service_role;
