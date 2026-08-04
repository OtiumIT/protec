ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS report_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS report_brand_name VARCHAR(255);
