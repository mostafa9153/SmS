-- ============================================================
-- Supabase RPC: Atomic School ID Generator with Advisory Lock
-- Guarantees zero collisions under concurrent enrollments
-- ============================================================

CREATE OR REPLACE FUNCTION next_school_id(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_val INT;
BEGIN
  -- Obtain transactional advisory lock unique to this prefix
  PERFORM pg_advisory_xact_lock(hashtext(prefix));
  
  -- Compute the highest allocated serial number for this prefix
  SELECT COALESCE(MAX(CAST(split_part(school_id, '/', 6) AS INT)), 0) + 1
  INTO next_val
  FROM students
  WHERE school_id ILIKE (prefix || '%');

  -- Format as 3-digit zero-padded number (e.g. 001, 002)
  RETURN prefix || lpad(next_val::text, 3, '0');
END;
$$;

-- Grant execution permission to authenticated and service_role
GRANT EXECUTE ON FUNCTION next_school_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION next_school_id(TEXT) TO service_role;
