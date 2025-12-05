#!/bin/bash

# Lindgren-X v2.0 Startup Script
# Ensures all dependencies are running before starting the application

set -e

echo "========================================================================"
echo "  Starting Lindgren-X v2.0 - Mineral License Intelligence System"
echo "========================================================================"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "✗ ERROR: PostgreSQL is not installed"
    echo "  Please install PostgreSQL before running Lindgren-X"
    exit 1
fi

echo "✓ PostgreSQL is installed"

# Check if PostgreSQL service is running
echo ""
echo "Checking PostgreSQL service status..."
if ! service postgresql status > /dev/null 2>&1; then
    echo "✗ PostgreSQL is not running. Starting PostgreSQL..."

    # Try to start PostgreSQL
    if service postgresql start; then
        echo "✓ PostgreSQL started successfully"
        sleep 2  # Give PostgreSQL time to fully start
    else
        echo "✗ Failed to start PostgreSQL"
        echo "  Please check your PostgreSQL installation and permissions"
        exit 1
    fi
else
    echo "✓ PostgreSQL is already running"
fi

# Check if database exists
echo ""
echo "Checking database connection..."
if ! PGPASSWORD="$DB_PASSWORD" psql -h localhost -U postgres -d lindgren_x_v2 -c "SELECT 1;" > /dev/null 2>&1; then
    echo "⚠  Database 'lindgren_x_v2' not found or connection failed"
    echo ""
    echo "Would you like to create the database now? (y/n)"
    read -r response

    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Creating database..."
        PGPASSWORD="Orig1972!" psql -h localhost -U postgres -c "CREATE DATABASE lindgren_x_v2;" 2>/dev/null || echo "  Database may already exist"

        if [ -f "database/schema.sql" ]; then
            echo "Loading schema..."
            PGPASSWORD="Orig1972!" psql -h localhost -U postgres -d lindgren_x_v2 -f database/schema.sql
            echo "✓ Database created and schema loaded"
        elif [ -f "schema-clean.sql" ]; then
            echo "Loading schema..."
            PGPASSWORD="Orig1972!" psql -h localhost -U postgres -d lindgren_x_v2 -f schema-clean.sql
            echo "✓ Database created and schema loaded"
        else
            echo "⚠  Schema file not found. Database created but empty."
        fi
    else
        echo "  Continuing without database setup..."
    fi
else
    echo "✓ Database connection successful"
fi

# Check if Node.js is installed
echo ""
if ! command -v node &> /dev/null; then
    echo "✗ ERROR: Node.js is not installed"
    echo "  Please install Node.js before running Lindgren-X"
    exit 1
fi

echo "✓ Node.js is installed ($(node --version))"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "⚠  Node modules not found. Installing dependencies..."
    npm install
    echo "✓ Dependencies installed"
fi

# Start the application
echo ""
echo "========================================================================"
echo "  All prerequisites satisfied. Starting Lindgren-X v2.0..."
echo "========================================================================"
echo ""

node lindgren-x-v2.js
