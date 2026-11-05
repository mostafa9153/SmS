-- Custom percentage concession ("25% off") alongside Full / Half / Free.
-- concession_percent is the percent off the fee structure: 0 full, 50 half, 100 free, 1-99 custom.
ALTER TABLE admission_invoices ADD COLUMN IF NOT EXISTS concession_percent NUMERIC(5,2);
ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS fee_concession_percent NUMERIC(5,2);

ALTER TABLE admission_invoices DROP CONSTRAINT IF EXISTS admission_invoices_concession_type_check;
ALTER TABLE admission_invoices
  ADD CONSTRAINT admission_invoices_concession_type_check CHECK (concession_type IN ('full', 'half', 'free', 'custom'));

ALTER TABLE admission_applications DROP CONSTRAINT IF EXISTS admission_applications_fee_concession_check;
ALTER TABLE admission_applications
  ADD CONSTRAINT admission_applications_fee_concession_check CHECK (fee_concession IN ('full', 'half', 'free', 'custom'));
