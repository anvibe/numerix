-- Fix RLS "policy always true" warnings for extractions (SECURITY)
-- 1. Add created_by so we can restrict INSERT/UPDATE/DELETE to the creating user
-- 2. Replace permissive policies with scoped ones
--
-- Note: "Leaked Password Protection" (HaveIBeenPwned) is an Auth setting.
-- Enable it in Supabase Dashboard: Authentication → Settings → Password Protection
-- https://supabase.com/docs/guides/auth/password-security

-- Add created_by (nullable for existing rows)
ALTER TABLE extractions
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN extractions.created_by IS 'User who inserted the row; used for RLS so users only modify their own extractions.';

-- Drop permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert extractions" ON extractions;
DROP POLICY IF EXISTS "Authenticated users can update extractions" ON extractions;

-- INSERT: only allow if the row's created_by equals the current user
CREATE POLICY "Authenticated users can insert own extractions"
  ON extractions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- UPDATE: only allow on rows you created
CREATE POLICY "Users can update own extractions"
  ON extractions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- DELETE: only allow on rows you created (needed for replaceExtractions)
CREATE POLICY "Users can delete own extractions"
  ON extractions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
