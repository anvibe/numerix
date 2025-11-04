#!/bin/bash

# ============================================================================
# Database Backup Script for Numerix
# Creates a logical dump before PostgreSQL upgrade
# ============================================================================

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/numerix_preupgrade_${TIMESTAMP}.dump"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  Database Backup Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create .env file with database connection details"
    exit 1
fi

# Extract connection details from .env
SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ Error: Could not find VITE_SUPABASE_URL in .env${NC}"
    exit 1
fi

# Extract project ref
PROJECT_REF=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|.supabase.co||')

echo "📡 Project: $PROJECT_REF"
echo ""

# Check if psql is available
if ! command -v pg_dump &> /dev/null; then
    echo -e "${YELLOW}⚠️  pg_dump not found locally${NC}"
    echo ""
    echo "OPTION 1: Use Supabase Dashboard Backup"
    echo "  → Go to: https://supabase.com/dashboard/project/$PROJECT_REF/database/backups"
    echo "  → Click 'Create Backup'"
    echo ""
    echo "OPTION 2: Install PostgreSQL client tools"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql-client"
    echo ""
    echo "OPTION 3: Use Supabase CLI"
    echo "  supabase db dump --project-ref $PROJECT_REF"
    echo ""
    exit 0
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📋 Backup Options:"
echo ""
echo "1. Full Database Backup (Recommended)"
echo "2. Schema Only"
echo "3. Data Only"
echo ""
read -p "Select option (1-3): " backup_option

case $backup_option in
    1)
        echo ""
        echo "📦 Creating FULL database backup..."
        echo ""
        echo "⚠️  You'll need to provide database connection details:"
        echo ""
        echo "Connection details needed:"
        echo "  • Host: db.$PROJECT_REF.supabase.co"
        echo "  • Database: postgres"
        echo "  • User: postgres"
        echo "  • Password: (from Supabase Dashboard → Settings → Database)"
        echo ""
        echo "Get connection string from:"
        echo "  https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
        echo ""
        read -p "Press Enter to continue or Ctrl+C to cancel..."
        echo ""
        
        read -p "Database host [db.$PROJECT_REF.supabase.co]: " DB_HOST
        DB_HOST=${DB_HOST:-db.$PROJECT_REF.supabase.co}
        
        read -p "Database name [postgres]: " DB_NAME
        DB_NAME=${DB_NAME:-postgres}
        
        read -p "Database user [postgres]: " DB_USER
        DB_USER=${DB_USER:-postgres}
        
        read -sp "Database password: " DB_PASSWORD
        echo ""
        
        echo ""
        echo "🚀 Starting backup..."
        
        PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "$DB_HOST" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -F c \
            -b \
            -v \
            -f "$BACKUP_FILE"
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ Backup completed successfully!${NC}"
            echo "📁 Backup file: $BACKUP_FILE"
            echo ""
            ls -lh "$BACKUP_FILE"
            echo ""
            echo "💡 To verify backup:"
            echo "   pg_restore --list $BACKUP_FILE"
        else
            echo ""
            echo -e "${RED}❌ Backup failed!${NC}"
            exit 1
        fi
        ;;
    2)
        echo "Schema-only backup not implemented in this script"
        echo "Use: pg_dump -h <host> -U <user> -d <db> --schema-only -f schema.sql"
        ;;
    3)
        echo "Data-only backup not implemented in this script"
        echo "Use: pg_dump -h <host> -U <user> -d <db> --data-only -f data.sql"
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. ✅ Verify backup file exists and has size > 0"
echo "2. ✅ Test restore to staging (if available)"
echo "3. ✅ Proceed with upgrade"
echo ""
echo "💡 Alternative: Use Supabase Dashboard → Database → Backups"
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/database/backups"
echo ""
