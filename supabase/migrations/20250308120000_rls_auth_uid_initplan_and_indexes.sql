-- Fix RLS "Auth RLS Initialization Plan" performance warnings.
-- Use (select auth.uid()) so the value is evaluated once per query instead of per row.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- Also add index on extractions(created_by) for FK (unindexed_foreign_keys lint).

-- ========== saved_combinations ==========
DROP POLICY IF EXISTS "Users can read own saved combinations" ON saved_combinations;
CREATE POLICY "Users can read own saved combinations"
  ON saved_combinations FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own saved combinations" ON saved_combinations;
CREATE POLICY "Users can insert own saved combinations"
  ON saved_combinations FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own saved combinations" ON saved_combinations;
CREATE POLICY "Users can update own saved combinations"
  ON saved_combinations FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own saved combinations" ON saved_combinations;
CREATE POLICY "Users can delete own saved combinations"
  ON saved_combinations FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ========== unsuccessful_combinations ==========
DROP POLICY IF EXISTS "Users can read own unsuccessful combinations" ON unsuccessful_combinations;
CREATE POLICY "Users can read own unsuccessful combinations"
  ON unsuccessful_combinations FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own unsuccessful combinations" ON unsuccessful_combinations;
CREATE POLICY "Users can insert own unsuccessful combinations"
  ON unsuccessful_combinations FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own unsuccessful combinations" ON unsuccessful_combinations;
CREATE POLICY "Users can update own unsuccessful combinations"
  ON unsuccessful_combinations FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own unsuccessful combinations" ON unsuccessful_combinations;
CREATE POLICY "Users can delete own unsuccessful combinations"
  ON unsuccessful_combinations FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ========== extractions ==========
DROP POLICY IF EXISTS "Authenticated users can insert own extractions" ON extractions;
CREATE POLICY "Authenticated users can insert own extractions"
  ON extractions FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can update own extractions" ON extractions;
CREATE POLICY "Users can update own extractions"
  ON extractions FOR UPDATE TO authenticated
  USING ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can delete own extractions" ON extractions;
CREATE POLICY "Users can delete own extractions"
  ON extractions FOR DELETE TO authenticated
  USING ((select auth.uid()) = created_by);

-- ========== Index for FK (unindexed_foreign_keys) ==========
CREATE INDEX IF NOT EXISTS idx_extractions_created_by ON extractions(created_by);
