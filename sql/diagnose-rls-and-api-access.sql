-- Diagnose RLS policies + table privileges for Numerix tables.
-- Run in Supabase: SQL Editor → New query → paste → Run.
--
-- How to read results:
-- 1) relrowsecurity = true with ZERO policies on a command → that operation is denied for everyone.
-- 2) Policies must cover the roles your client uses: anon (logged out), authenticated (logged in).
-- 3) If policies exist but REST still returns 403, check GRANTS: anon/authenticated need USAGE on
--    schema public and appropriate SELECT/INSERT/... on the table (Data API layer).

-- ---------------------------------------------------------------------------
-- A) Is RLS enabled? (relrowsecurity = t means RLS is ON)
-- ---------------------------------------------------------------------------
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('extractions', 'saved_combinations', 'unsuccessful_combinations')
ORDER BY c.relname;

-- ---------------------------------------------------------------------------
-- B) All RLS policies (commands, roles, expressions)
-- ---------------------------------------------------------------------------
SELECT schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual AS using_expression,
       with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('extractions', 'saved_combinations', 'unsuccessful_combinations')
ORDER BY tablename,
         CASE cmd
           WHEN 'SELECT' THEN 1
           WHEN 'INSERT' THEN 2
           WHEN 'UPDATE' THEN 3
           WHEN 'DELETE' THEN 4
           ELSE 5
         END,
         policyname;

-- ---------------------------------------------------------------------------
-- C) Table privileges for API roles (missing rows = likely 403 from PostgREST)
-- ---------------------------------------------------------------------------
SELECT table_schema,
       table_name,
       grantee,
       string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('extractions', 'saved_combinations', 'unsuccessful_combinations')
  AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
GROUP BY table_schema, table_name, grantee
ORDER BY table_name, grantee;

-- ---------------------------------------------------------------------------
-- D) Quick boolean checks (expect extractions: anon SELECT true if "public read")
-- ---------------------------------------------------------------------------
SELECT 'anon → extractions SELECT' AS check_name,
       has_table_privilege('anon', 'public.extractions', 'SELECT') AS ok
UNION ALL
SELECT 'authenticated → extractions SELECT',
       has_table_privilege('authenticated', 'public.extractions', 'SELECT')
UNION ALL
SELECT 'authenticated → saved_combinations SELECT',
       has_table_privilege('authenticated', 'public.saved_combinations', 'SELECT')
UNION ALL
SELECT 'authenticated → unsuccessful_combinations SELECT',
       has_table_privilege('authenticated', 'public.unsuccessful_combinations', 'SELECT');

-- ---------------------------------------------------------------------------
-- E) Optional: policy count per table/command (spot gaps)
-- ---------------------------------------------------------------------------
SELECT tablename,
       cmd,
       count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('extractions', 'saved_combinations', 'unsuccessful_combinations')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;

-- ---------------------------------------------------------------------------
-- F) Remediation helpers for Supabase lints 0026/0027 (pg_graphql exposure)
--
-- These lints mean the object is discoverable via GraphQL schema introspection
-- because the role has SELECT privileges on it.
--
-- Choose ONE approach per table:
--   F1) Hide completely from anon/authenticated (most secure)
--   F2) Keep access but rely on RLS to restrict rows (still discoverable)
--   F3) Expose a safer view/function instead of the base table
-- ---------------------------------------------------------------------------

-- F1) Hide completely from GraphQL schema for anon/authenticated:
-- (Run if these tables should NOT be discoverable to logged-out users and/or
--  to every signed-in user.)
REVOKE SELECT ON TABLE public.extractions FROM anon;
REVOKE SELECT ON TABLE public.extractions FROM authenticated;
REVOKE SELECT ON TABLE public.saved_combinations FROM authenticated;
REVOKE SELECT ON TABLE public.unsuccessful_combinations FROM authenticated;

-- F1 sanity check (should become false after the REVOKE):
SELECT 'anon → extractions SELECT (after revoke)' AS check_name,
       has_table_privilege('anon', 'public.extractions', 'SELECT') AS ok
UNION ALL
SELECT 'authenticated → extractions SELECT (after revoke)',
       has_table_privilege('authenticated', 'public.extractions', 'SELECT')
UNION ALL
SELECT 'authenticated → saved_combinations SELECT (after revoke)',
       has_table_privilege('authenticated', 'public.saved_combinations', 'SELECT')
UNION ALL
SELECT 'authenticated → unsuccessful_combinations SELECT (after revoke)',
       has_table_privilege('authenticated', 'public.unsuccessful_combinations', 'SELECT');

-- F2) If your app NEEDS direct reads from these tables, re-grant SELECT and
-- enforce access via RLS (still discoverable in GraphQL schema):
-- GRANT SELECT ON TABLE public.extractions TO authenticated;
-- GRANT SELECT ON TABLE public.saved_combinations TO authenticated;
-- GRANT SELECT ON TABLE public.unsuccessful_combinations TO authenticated;
-- -- For public reads (NOT recommended unless truly intended):
-- -- GRANT SELECT ON TABLE public.extractions TO anon;

-- F3) Best practice when you want public-ish access but not raw tables:
-- - Keep base tables locked down (F1)
-- - Create a view / security definer RPC that returns only the fields/rows you
--   want to expose, then GRANT SELECT/EXECUTE on *that* object instead.
