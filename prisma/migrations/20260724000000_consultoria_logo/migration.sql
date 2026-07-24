ALTER TABLE "consultorias"
  ADD COLUMN IF NOT EXISTS "logo_path" TEXT,
  ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
