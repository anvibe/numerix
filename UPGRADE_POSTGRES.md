# PostgreSQL Upgrade Guide

Your Supabase database is currently running Postgres version `supabase-postgres-17.4.1.064` which has security patches available.

## Option 1: Upgrade via Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `kmndhvzjyhyiwwdmgyqg`

2. **Navigate to Database Settings**
   - Click on "Settings" in the left sidebar
   - Go to "Database" section

3. **Upgrade Postgres Version**
   - Look for "Postgres Version" or "Database Version" section
   - Click "Upgrade" or "Change Version"
   - Select the latest available version (usually the most recent)
   - Follow the upgrade wizard

4. **Important Notes Before Upgrading**
   - ⚠️ **Backup your data**: The upgrade process is usually safe, but always backup important data
   - ⏱️ **Downtime**: There may be a brief downtime during the upgrade
   - 🔄 **Migration**: Supabase will handle the migration automatically
   - 📊 **Run Pre-Upgrade Checks**: Use the SQL checks file before upgrading (see below)

## Option 2: Check Current Version via CLI

Run the following command to check your current database version:

```bash
supabase db version
```

## Option 3: Upgrade via Supabase CLI (if supported)

```bash
# Link to your project (if not already linked)
supabase link --project-ref kmndhvzjyhyiwwdmgyqg

# Check current version
supabase db version

# Upgrade database (if CLI supports it)
# Note: This may require dashboard access
```

## SQL Checks - Pre and Post Upgrade

**⚠️ IMPORTANT**: Run SQL checks before and after upgrading!

A comprehensive SQL checks file is available at:
```
sql/postgres-upgrade-checks.sql
```

### How to Use:

1. **Before Upgrade**:
   - Open Supabase Dashboard → SQL Editor
   - Copy and run the **PRE-UPGRADE CHECKS** queries from `sql/postgres-upgrade-checks.sql`
   - Save the results for comparison

2. **After Upgrade**:
   - Run the **POST-UPGRADE CHECKS** queries
   - Compare results with pre-upgrade checks
   - Verify row counts match, extensions are present, and connections are normal

### Quick Checks:

The SQL file includes checks for:
- ✅ Current Postgres version
- ✅ Installed extensions and versions
- ✅ Active connections
- ✅ Table row counts (your critical tables)
- ✅ Database health indicators
- ✅ Replication status
- ✅ Performance checks

## Verification

After upgrading, verify the new version:

1. In Supabase Dashboard → Settings → Database
2. Check the "Postgres Version" shows the latest version
3. Run the POST-UPGRADE checks from `sql/postgres-upgrade-checks.sql`
4. Run your application and verify everything works correctly
5. Compare pre-upgrade and post-upgrade results

## Troubleshooting

If you encounter issues after upgrading:

1. **Check Migration Status**
   ```bash
   supabase migration list
   ```

2. **Verify Database Connection**
   - Check your `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Test the connection in your app

3. **Rollback (if needed)**
   - Contact Supabase support if you need to rollback
   - They can assist with version downgrades if necessary

## Security Benefits

Upgrading will provide:
- ✅ Latest security patches
- ✅ Performance improvements
- ✅ Bug fixes
- ✅ Compliance with security best practices

---

**Reference**: [Supabase Upgrade Guide](https://supabase.com/docs/guides/platform/upgrading)
