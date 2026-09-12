-- Migration: Normalize OBC-A, OBC-B, OBC A, OBC B into single 'OBC' category
UPDATE students
SET social_category = 'OBC'
WHERE UPPER(TRIM(social_category)) IN ('OBC-A', 'OBC-B', 'OBC A', 'OBC B', 'OBC_A', 'OBC_B');
