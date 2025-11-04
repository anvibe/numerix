-- ============================================================================
-- PostgreSQL Upgrade Checks for Numerix
-- Project: kmndhvzjyhyiwwdmgyqg
-- Current Version: supabase-postgres-17.4.1.064
-- ============================================================================
-- 
-- INSTRUCTIONS:
-- 1. Run PRE-UPGRADE checks BEFORE upgrading your database
-- 2. Save the results for comparison
-- 3. Perform the upgrade via Supabase Dashboard
-- 4. Run POST-UPGRADE checks AFTER the upgrade
-- 5. Compare results to ensure everything is working correctly
--
-- Run each query separately in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PRE-UPGRADE CHECKS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Current Postgres Version
-- ----------------------------------------------------------------------------
-- Run this FIRST to record your current version
SELECT version() AS current_postgres_version;

-- Get detailed version info
SELECT 
    current_setting('server_version') AS server_version,
    current_setting('server_version_num') AS server_version_num;

-- ----------------------------------------------------------------------------
-- 2. Installed Extensions and Versions
-- ----------------------------------------------------------------------------
-- Critical: Save this output! Extensions must be compatible after upgrade
SELECT 
    extname AS extension_name,
    extversion AS extension_version
FROM pg_extension
ORDER BY extname;

-- ----------------------------------------------------------------------------
-- 3. Extension Objects (Compatibility Check)
-- ----------------------------------------------------------------------------
-- Identify extensions that might cause compatibility issues
SELECT 
    e.extname AS extension_name,
    n.nspname AS schema_name,
    c.relname AS example_object
FROM pg_extension e
LEFT JOIN pg_namespace n ON e.extnamespace = n.oid
LEFT JOIN pg_class c ON c.relnamespace = n.oid
WHERE e.extname NOT IN ('plpgsql') -- Core extensions excluded
GROUP BY e.extname, n.nspname, c.relname
ORDER BY e.extname;

-- ----------------------------------------------------------------------------
-- 4. Critical Extensions Version Check
-- ----------------------------------------------------------------------------
-- Check for extensions commonly sensitive to version changes
SELECT 
    extname AS extension_name,
    extversion AS extension_version,
    CASE 
        WHEN extname IN ('postgis','timescaledb','pglogical','citus','pgaudit') 
        THEN '⚠️ Sensitive to version changes'
        ELSE '✓ Standard'
    END AS status
FROM pg_extension
WHERE extname IN ('postgis','timescaledb','pglogical','citus','pgaudit')
ORDER BY extname;

-- ----------------------------------------------------------------------------
-- 5. Active Connections Snapshot
-- ----------------------------------------------------------------------------
-- Know how many connections you have before upgrade
SELECT 
    usename AS username,
    COUNT(*) AS connection_count,
    COUNT(*) FILTER (WHERE state = 'active') AS active_queries,
    COUNT(*) FILTER (WHERE state = 'idle') AS idle_connections
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
GROUP BY usename
ORDER BY connection_count DESC;

-- ----------------------------------------------------------------------------
-- 6. Long-Running Queries
-- ----------------------------------------------------------------------------
-- Identify queries that might be affected by upgrade
SELECT 
    pid,
    usename AS username,
    state,
    query_start,
    now() - query_start AS duration,
    LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE now() - query_start > interval '1 minute'
    AND pid <> pg_backend_pid()
ORDER BY duration DESC;

-- ----------------------------------------------------------------------------
-- 7. Table Row Counts (Critical Tables)
-- ----------------------------------------------------------------------------
-- Verify data integrity after upgrade by comparing counts
SELECT 
    schemaname AS schema_name,
    relname AS table_name,
    n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- ----------------------------------------------------------------------------
-- 8. Index Bloat / Vacuum Indicators
-- ----------------------------------------------------------------------------
-- Check database health before upgrade
SELECT 
    schemaname AS schema_name,
    relname AS table_name,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    ROUND(100.0 * n_dead_tup / GREATEST(1, n_live_tup + n_dead_tup), 2) AS dead_percentage,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC
LIMIT 20;

-- ----------------------------------------------------------------------------
-- 9. Replication Status (if applicable)
-- ----------------------------------------------------------------------------
-- Check replication slots (Supabase managed)
SELECT * FROM pg_replication_slots;

-- Check if in recovery mode
SELECT pg_is_in_recovery() AS is_in_recovery;

-- CRITICAL: Check for logical replication slots (must be dropped before upgrade)
SELECT 
    slot_name,
    slot_type,
    active,
    CASE 
        WHEN slot_type = 'logical' THEN '⚠️ Must drop before upgrade'
        ELSE '✓ Safe'
    END AS status
FROM pg_replication_slots;

-- ----------------------------------------------------------------------------
-- 9b. Open Prepared Transactions (CRITICAL)
-- ----------------------------------------------------------------------------
-- Open prepared transactions can cause upgrade failures
SELECT COUNT(*) AS open_prepared_transactions
FROM pg_catalog.pg_prepared_xacts;

-- If count > 0, you must commit or rollback before upgrade
-- To see details:
SELECT gid, prepared, owner, database, transaction 
FROM pg_catalog.pg_prepared_xacts;

-- ----------------------------------------------------------------------------
-- 9c. Unsupported Data Types (CRITICAL)
-- ----------------------------------------------------------------------------
-- reg* data types are not supported during upgrades
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type,
    '⚠️ Must convert before upgrade' AS status
FROM information_schema.columns
WHERE data_type IN ('regproc', 'regprocedure', 'regoper', 'regoperator', 'regconfig', 'regdictionary');

-- ----------------------------------------------------------------------------
-- 10. Extension Compatibility Check
-- ----------------------------------------------------------------------------
-- Verify all installed extensions are compatible with target version
SELECT 
    name AS extension_name,
    default_version AS available_version,
    installed_version AS current_version,
    CASE 
        WHEN installed_version IS NOT NULL AND default_version != installed_version 
        THEN '⚠️ Version mismatch - may need update'
        WHEN installed_version IS NOT NULL 
        THEN '✓ Installed'
        ELSE 'Not installed'
    END AS status
FROM pg_available_extensions
WHERE installed_version IS NOT NULL
ORDER BY name;

-- ----------------------------------------------------------------------------
-- 11. Security-Definer Functions
-- ----------------------------------------------------------------------------
-- Functions that may need review post-upgrade
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE prosecdef -- SECURITY DEFINER functions
    AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, p.proname
LIMIT 50;

-- ----------------------------------------------------------------------------
-- 12. Deprecated Features Check
-- ----------------------------------------------------------------------------
-- Look for potentially deprecated features
SELECT 
    routine_schema,
    routine_name,
    routine_type,
    LEFT(routine_definition, 150) AS definition_preview
FROM information_schema.routines
WHERE routine_definition ILIKE '%pg_stat_activity%' 
   OR routine_definition ILIKE '%pg_ls_dir%'
   OR routine_definition ILIKE '%pg_read_file%'
LIMIT 50;

-- ----------------------------------------------------------------------------
-- 13. Numerix-Specific Tables Health Check
-- ----------------------------------------------------------------------------
-- Check your application's critical tables
SELECT 
    'extractions' AS table_name,
    COUNT(*) AS row_count
FROM extractions
UNION ALL
SELECT 
    'saved_combinations' AS table_name,
    COUNT(*) AS row_count
FROM saved_combinations
UNION ALL
SELECT 
    'unsuccessful_combinations' AS table_name,
    COUNT(*) AS row_count
FROM unsuccessful_combinations;

-- Check table sizes
SELECT 
    tablename AS table_name,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size('public.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size('public.'||tablename) - pg_relation_size('public.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('extractions', 'saved_combinations', 'unsuccessful_combinations')
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

-- ============================================================================
-- POST-UPGRADE CHECKS
-- ============================================================================
-- Run these AFTER upgrading to verify everything is working correctly
-- Compare results with PRE-UPGRADE checks

-- ----------------------------------------------------------------------------
-- POST-UPGRADE 1: Verify New Version
-- ----------------------------------------------------------------------------
-- Should show the new upgraded version
SELECT version() AS new_postgres_version;

SELECT 
    current_setting('server_version') AS server_version,
    current_setting('server_version_num') AS server_version_num;

-- ----------------------------------------------------------------------------
-- POST-UPGRADE 2: Verify Extensions Still Present
-- ----------------------------------------------------------------------------
-- Compare with PRE-UPGRADE results
SELECT 
    extname AS extension_name,
    extversion AS extension_version
FROM pg_extension
ORDER BY extname;

-- ----------------------------------------------------------------------------
-- POST-UPGRADE 3: Verify Connections Normal
-- ----------------------------------------------------------------------------
-- Should return to normal connection patterns
SELECT 
    usename AS username,
    COUNT(*) AS connection_count,
    COUNT(*) FILTER (WHERE state = 'active') AS active_queries,
    COUNT(*) FILTER (WHERE state = 'idle') AS idle_connections
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
GROUP BY usename
ORDER BY connection_count DESC;

-- ----------------------------------------------------------------------------
-- POST-UPGRADE 4: Check for Stuck Queries
-- ----------------------------------------------------------------------------
-- Should be empty or minimal
SELECT 
    pid,
    usename AS username,
    state,
    query_start,
    now() - query_start AS duration,
    LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE now() - query_start > interval '1 minute'
    AND pid <> pg_backend_pid()
ORDER BY duration DESC;

-- ----------------------------------------------------------------------------
-- POST-UPGRADE 5: Verify Row Counts Match
-- ----------------------------------------------------------------------------
-- Compare with PRE-UPGRADE counts - should match exactly
SELECT 
    schemaname AS schema_name,
    relname AS table_name,
    n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Numerix-specific table counts
SELECT 
    'extractions' AS table_name,
    COUNT(*) AS row_count
FROM extractions
UNION ALL
SELECT 
    'saved_combinations' AS table_name,
    COUNT(*) AS row_count
FROM saved_combinations
UNION ALL
SELECT 
    'unsuccessful_combinations' AS table_name,
    COUNT(*) AS row_count
FROM unsuccessful_combinations;

-- ----------------------------------------------------------------------------
-- POST-UPGRADE 6: Verify Replication Status
-- ----------------------------------------------------------------------------
SELECT * FROM pg_replication_slots;

SELECT pg_is_in_recovery() AS is_in_recovery;

-- ----------------------------------------------------------------------------
-- POST-UPGRADE 6b: Check for Invalid Indexes (CRITICAL)
-- ----------------------------------------------------------------------------
-- Invalid indexes must be rebuilt after upgrade
SELECT 
    n.nspname AS schema_name,
    c.relname AS index_name,
    t.relname AS table_name,
    '⚠️ Must REINDEX' AS action_required
FROM pg_class c
JOIN pg_index i ON c.oid = i.indexrelid
JOIN pg_class t ON i.indrelid = t.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE NOT i.indisvalid
    AND n.nspname = 'public';

-- If any invalid indexes found, rebuild them:
-- REINDEX TABLE schema.table_name;
-- or
-- REINDEX INDEX schema.index_name;

-- ----------------------------------------------------------------------------
-- POST-UPGRADE 6c: Database Integrity Validation
-- ----------------------------------------------------------------------------
-- Compare database sizes with pre-upgrade values
SELECT 
    datname AS database_name,
    pg_size_pretty(pg_database_size(datname)) AS database_size,
    pg_database_size(datname) AS size_bytes
FROM pg_database
WHERE datistemplate = false
ORDER BY pg_database_size(datname) DESC;

-- ----------------------------------------------------------------------------
-- POST-UPGRADE 7: Test Critical Queries
-- ----------------------------------------------------------------------------
-- Run these to ensure your application queries work

-- Test extractions query
SELECT COUNT(*) AS extraction_count, game_type
FROM extractions
GROUP BY game_type
ORDER BY game_type;

-- Test saved combinations query (requires auth)
-- SELECT COUNT(*) AS saved_count FROM saved_combinations;

-- Test unsuccessful combinations query (requires auth)
-- SELECT COUNT(*) AS unsuccessful_count FROM unsuccessful_combinations;

-- ----------------------------------------------------------------------------
-- POST-UPGRADE 8: Performance Check
-- ----------------------------------------------------------------------------
-- Check if queries are performing well
EXPLAIN ANALYZE
SELECT * FROM extractions 
WHERE game_type = 'superenalotto' 
ORDER BY extraction_date DESC 
LIMIT 10;

-- ----------------------------------------------------------------------------
-- POST-UPGRADE 9: Update Statistics (Recommended)
-- ----------------------------------------------------------------------------
-- Run ANALYZE to update query planner statistics
-- Run VACUUM on large tables if needed
-- Note: Run these manually, not in this script

-- ANALYZE;  -- Updates statistics for query planner
-- VACUUM ANALYZE extractions;  -- For large tables
-- VACUUM ANALYZE saved_combinations;
-- VACUUM ANALYZE unsuccessful_combinations;

-- Check if ANALYZE is needed
SELECT 
    schemaname,
    relname,
    last_analyze,
    last_autoanalyze,
    CASE 
        WHEN last_analyze IS NULL AND last_autoanalyze IS NULL 
        THEN '⚠️ Never analyzed'
        WHEN last_analyze < now() - interval '7 days' AND last_autoanalyze < now() - interval '7 days'
        THEN '⚠️ Stale statistics'
        ELSE '✓ Current'
    END AS analyze_status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;

-- ============================================================================
-- SUMMARY QUERIES
-- ============================================================================
-- Quick overview checks

-- Database Overview
SELECT 
    current_database() AS database_name,
    version() AS postgres_version,
    pg_size_pretty(pg_database_size(current_database())) AS database_size,
    (SELECT COUNT(*) FROM pg_extension) AS extension_count,
    (SELECT COUNT(*) FROM pg_stat_user_tables WHERE schemaname = 'public') AS table_count;

-- Tables Summary
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- END OF SQL CHECKS
-- ============================================================================
