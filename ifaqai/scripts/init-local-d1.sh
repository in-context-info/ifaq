#!/bin/bash
# Initialize local D1 database with schema
# This script creates the Users table in the local D1 database

echo "Initializing local D1 database schema..."

# Check if wrangler is available
if ! command -v wrangler &> /dev/null; then
    echo "Error: wrangler is not installed. Run 'npm install' first."
    exit 1
fi

# Run the SQL schema
wrangler d1 execute hippocampus --local --file=./scripts/init-d1-schema.sql

echo "✅ Local D1 database schema initialized!"
echo ""
echo "To verify, run:"
echo "  wrangler d1 execute hippocampus --local --command \"SELECT name FROM sqlite_master WHERE type='table';\""

