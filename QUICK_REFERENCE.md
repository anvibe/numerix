# PostgreSQL Upgrade - Quick Reference Guide

## 🚨 CRITICAL PRE-UPGRADE CHECKS

These checks **MUST** be run before upgrading. Any issues found must be resolved before proceeding.

### 1. Open Prepared Transactions
```sql
SELECT COUNT(*) FROM pg_catalog.pg_prepared_xacts;
```
**Action Required**: If count > 0, commit or rollback all prepared transactions.

### 2. Logical Replication Slots
```sql
SELECT slot_name, slot_type FROM pg_replication_slots WHERE slot_type = 'logical';
```
**Action Required**: Drop any logical replication slots before upgrade:
```sql
SELECT pg_drop_replication_slot('slot_name');
```

### 3. Unsupported Data Types (reg*)
```sql
SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE data_type IN ('regproc', 'regprocedure', 'regoper', 'regoperator', 'regconfig', 'regdictionary');
```
**Action Required**: Convert any reg* data types to supported alternatives.

### 4. Extension Compatibility
```sql
SELECT name, default_version, installed_version
FROM pg_available_extensions
WHERE installed_version IS NOT NULL;
```
**Action Required**: Verify all extensions are compatible with target Postgres version.

---

## 📋 ESSENTIAL PRE-UPGRADE CHECKS

Run these and **save the results** for post-upgrade comparison:

1. **Version Info**
   ```sql
   SELECT version();
   SELECT current_setting('server_version'), current_setting('server_version_num');
   ```

2. **Extensions**
   ```sql
   SELECT extname, extversion FROM pg_extension ORDER BY extname;
   ```

3. **Row Counts** (Critical tables)
   ```sql
   SELECT COUNT(*) FROM extractions;
   SELECT COUNT(*) FROM saved_combinations;
   SELECT COUNT(*) FROM unsuccessful_combinations;
   ```

4. **Table Sizes**
   ```sql
   SELECT tablename, pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
   FROM pg_tables WHERE schemaname = 'public';
   ```

5. **Active Connections**
   ```sql
   SELECT usename, COUNT(*) FROM pg_stat_activity 
   WHERE pid <> pg_backend_pid() GROUP BY usename;
   ```

---

## 🔄 UPGRADE PROCESS

1. ✅ Complete all pre-upgrade checks
2. ✅ Create database backup
3. ✅ Schedule maintenance window
4. ✅ Go to Supabase Dashboard → Settings → Database
5. ✅ Click "Upgrade" and follow wizard
6. ✅ Wait for completion (5-15 minutes)

---

## ✅ POST-UPGRADE VERIFICATION

### Immediate Checks

1. **Verify Version**
   ```sql
   SELECT version();
   ```
   Should show new upgraded version.

2. **Check Invalid Indexes** ⚠️ CRITICAL
   ```sql
   SELECT n.nspname, c.relname AS index_name, t.relname AS table_name
   FROM pg_class c
   JOIN pg_index i ON c.oid = i.indexrelid
   JOIN pg_class t ON i.indrelid = t.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE NOT i.indisvalid AND n.nspname = 'public';
   ```
   **Action**: If any found, rebuild:
   ```sql
   REINDEX TABLE schema.table_name;
   ```

3. **Compare Row Counts**
   Compare with pre-upgrade results - should match exactly.

4. **Verify Extensions**
   ```sql
   SELECT extname, extversion FROM pg_extension ORDER BY extname;
   ```
   All extensions should still be present.

5. **Update Statistics** (Recommended)
   ```sql
   ANALYZE;
   VACUUM ANALYZE extractions;
   VACUUM ANALYZE saved_combinations;
   VACUUM ANALYZE unsuccessful_combinations;
   ```

---

## 🔧 COMMON ISSUES & FIXES

### Extension Missing After Upgrade
```sql
-- Reinstall extension
CREATE EXTENSION IF NOT EXISTS extension_name;

-- Or update to latest version
ALTER EXTENSION extension_name UPDATE TO 'latest';
```

### Performance Regression
```sql
-- Rebuild indexes
REINDEX TABLE schema.table_name;

-- Update statistics
ANALYZE schema.table_name;
```

### Connection Issues
- Check Supabase Dashboard → Database → Connection Pooling
- Verify connection string hasn't changed
- Restart application clients

---

## 📁 FILES REFERENCE

- **Full SQL Checks**: `sql/postgres-upgrade-checks.sql`
- **Upgrade Guide**: `UPGRADE_POSTGRES.md`
- **Backup Script**: `backup-database.sh`
- **Checklist**: `pre-upgrade-checklist.sh`

---

## 🆘 ROLLBACK PROCEDURE

If upgrade causes issues:

1. **Stop the upgrade** (if still in progress)
2. **Contact Supabase Support** for rollback assistance
3. **Restore from backup** if needed:
   ```bash
   pg_restore -h <host> -U <user> -d <database> backup_file.dump
   ```

---

## 📞 SUPPORT

- **Supabase Dashboard**: https://supabase.com/dashboard/project/kmndhvzjyhyiwwdmgyqg
- **Supabase Docs**: https://supabase.com/docs/guides/platform/upgrading
- **Supabase Support**: Via Dashboard → Support

---

**Last Updated**: $(date)
**Current Version**: supabase-postgres-17.4.1.064
**Target**: Latest patched version available in Supabase Dashboard
