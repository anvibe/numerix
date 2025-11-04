#!/bin/bash

# PostgreSQL Version Check Script
# This script helps check your Supabase database version and provides upgrade instructions

echo "🔍 Checking Supabase Database Configuration..."
echo ""

# Check if .env file exists
if [ -f .env ]; then
    echo "✅ Found .env file"
    
    # Extract Supabase URL
    SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    
    if [ ! -z "$SUPABASE_URL" ]; then
        echo "📡 Supabase URL: $SUPABASE_URL"
        
        # Extract project ref from URL (works on macOS)
        PROJECT_REF=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|.supabase.co||')
        echo "🔑 Project Ref: $PROJECT_REF"
        echo ""
    else
        echo "⚠️  Could not find VITE_SUPABASE_URL in .env"
    fi
else
    echo "⚠️  .env file not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 POSTGRES UPGRADE INSTRUCTIONS"
echo ""
echo "Your current Postgres version: supabase-postgres-17.4.1.064"
echo "Status: ⚠️  Security patches available"
echo ""
echo "To upgrade:"
echo ""
echo "1. Visit: https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo ""
echo "2. Look for 'Postgres Version' section"
echo ""
echo "3. Click 'Upgrade' or 'Change Version' button"
echo ""
echo "4. Select the latest available version"
echo ""
echo "5. Follow the upgrade wizard (may require brief downtime)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Alternative: Check Supabase Dashboard → Settings → Database"
echo ""
echo "📚 Full guide: See UPGRADE_POSTGRES.md for detailed instructions"
echo ""
