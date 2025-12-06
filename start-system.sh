#!/bin/bash
#
# Lindgren-X v2.0 System Startup Script
# Starts PostgreSQL and the application
#

set -e

echo "================================================================================"
echo "  LINDGREN-X v2.0 - SYSTEM STARTUP"
echo "================================================================================"
echo ""

# Check if PostgreSQL is running
echo "[1] Checking PostgreSQL status..."
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "    → PostgreSQL is not running. Starting..."
    service postgresql start
    sleep 2

    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        echo "    ✓ PostgreSQL started successfully"
    else
        echo "    ✗ Failed to start PostgreSQL"
        exit 1
    fi
else
    echo "    ✓ PostgreSQL is already running"
fi

# Check if database exists
echo ""
echo "[2] Verifying database..."
if psql -U postgres -h localhost -lqt | cut -d \| -f 1 | grep -qw lindgren_x_v2; then
    echo "    ✓ Database 'lindgren_x_v2' exists"
else
    echo "    ✗ Database 'lindgren_x_v2' not found"
    echo "    → Please run: psql -U postgres -h localhost -f schema-clean.sql"
    exit 1
fi

# Check if application is already running
echo ""
echo "[3] Checking application status..."
if curl -s http://localhost:3000/api/stats >/dev/null 2>&1; then
    echo "    ⚠  Application is already running on port 3000"
    echo "    → To restart, run: pkill -f 'node lindgren-x-v2.js' && npm start"
    exit 0
fi

# Start the application
echo "    → Starting Lindgren-X v2.0..."
echo ""

# Run in foreground
node lindgren-x-v2.js
