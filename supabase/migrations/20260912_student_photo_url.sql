-- Migration: Add photo_url column to students table
-- Allows storing public URL for student passport photos

ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create student-photos storage bucket if not exists (handled automatically via API as well)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-photos',
  'student-photos',
  true,
  524288,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];
