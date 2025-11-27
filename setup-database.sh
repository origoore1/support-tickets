#!/bin/bash
#
# Lindgren-X v2.0 - Database Setup Script
# Automates PostgreSQL database creation and schema initialization
#

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║          Lindgren-X v2.0 Database Setup                          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
DB_NAME="lindgren_x_v2"
DB_USER="${DB_USER:-postgres}"
SCHEMA_FILE="database/schema.sql"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if PostgreSQL is running
echo "Step 1: Checking PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    echo -e "${RED}✗ PostgreSQL is not installed!${NC}"
    echo ""
    echo "Please install PostgreSQL first:"
    echo "  - Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib postgis"
    echo "  - macOS: brew install postgresql postgis"
    echo "  - Windows: Download from https://www.postgresql.org/download/windows/"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL is installed${NC}"
PSQL_VERSION=$(psql --version)
echo "  Version: $PSQL_VERSION"
echo ""

# Step 2: Check if PostgreSQL is running
echo "Step 2: Checking if PostgreSQL is running..."
if ! pg_isready -q; then
    echo -e "${RED}✗ PostgreSQL is not running!${NC}"
    echo ""
    echo "Please start PostgreSQL service:"
    echo "  - Ubuntu/Debian: sudo service postgresql start"
    echo "  - macOS: brew services start postgresql"
    echo "  - Windows: Open Services and start 'PostgreSQL' service"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL is running${NC}"
echo ""

# Step 3: Check if database already exists
echo "Step 3: Checking if database exists..."
if psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}⚠ Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to drop and recreate it? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        echo "Dropping existing database..."
        dropdb -U "$DB_USER" "$DB_NAME" 2>/dev/null || {
            echo -e "${RED}✗ Failed to drop database. You may need to stop the application first.${NC}"
            exit 1
        }
        echo -e "${GREEN}✓ Existing database dropped${NC}"
    else
        echo "Skipping database creation. Will only reload schema."
    fi
fi

# Step 4: Create database
if ! psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "Step 4: Creating database '$DB_NAME'..."
    createdb -U "$DB_USER" "$DB_NAME" || {
        echo -e "${RED}✗ Failed to create database${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo "Step 4: Database already exists, skipping creation..."
fi
echo ""

# Step 5: Enable PostGIS extension
echo "Step 5: Enabling PostGIS extension..."
psql -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS postgis;" || {
    echo -e "${YELLOW}⚠ Could not enable PostGIS. Installing PostGIS...${NC}"
    echo "  - Ubuntu/Debian: sudo apt-get install postgis postgresql-16-postgis-3"
    echo "  - macOS: brew install postgis"
    echo "  - Windows: PostGIS should be included with PostgreSQL installer"
    echo ""
    echo "After installing PostGIS, run this script again."
    exit 1
}
echo -e "${GREEN}✓ PostGIS extension enabled${NC}"
echo ""

# Step 6: Load schema
echo "Step 6: Loading database schema..."
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}✗ Schema file not found: $SCHEMA_FILE${NC}"
    exit 1
fi

psql -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE" || {
    echo -e "${RED}✗ Failed to load schema${NC}"
    exit 1
}
echo -e "${GREEN}✓ Schema loaded successfully${NC}"
echo ""

# Step 7: Verify setup
echo "Step 7: Verifying database setup..."
TABLE_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")

if [ "$TABLE_COUNT" -ge 4 ]; then
    echo -e "${GREEN}✓ Database setup complete!${NC}"
    echo ""
    echo "Database Statistics:"
    psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
    "
else
    echo -e "${RED}✗ Schema verification failed${NC}"
    echo "Expected at least 4 tables, found: $TABLE_COUNT"
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                    ✓ Setup Complete!                             ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Edit .env file and set DB_PASSWORD"
echo "  2. Run: npm start"
echo "  3. Open: http://localhost:3000"
echo ""
