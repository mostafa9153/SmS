-- Per-student admission fee concession (Full / Half / Free for poor students).
-- fee_items on the invoice holds the items as charged, so total_amount = sum(fee_items);
-- gross_amount keeps the fee structure total before the concession.
ALTER TABLE admission_invoices
  ADD COLUMN IF NOT EXISTS concession_type TEXT NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(10,2);

ALTER TABLE admission_applications
  ADD COLUMN IF NOT EXISTS fee_concession TEXT NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS fee_gross_amount NUMERIC(10,2);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admission_invoices_concession_type_check') THEN
    ALTER TABLE admission_invoices
      ADD CONSTRAINT admission_invoices_concession_type_check CHECK (concession_type IN ('full', 'half', 'free'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admission_applications_fee_concession_check') THEN
    ALTER TABLE admission_applications
      ADD CONSTRAINT admission_applications_fee_concession_check CHECK (fee_concession IN ('full', 'half', 'free'));
  END IF;
END $$;
