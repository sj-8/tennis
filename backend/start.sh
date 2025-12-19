#!/bin/sh
set -e

echo "=== Starting Service ==="

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  echo "Please configure it in WeChat Cloud Hosting Console -> Settings -> Environment Variables."
  exit 1
fi

# Mask password for logging safety (assuming format mysql://user:pass@host:port/db)
SAFE_URL=$(echo "$DATABASE_URL" | sed -E 's/:([^:@]+)@/:****@/')
echo "Database Connection: $SAFE_URL"

echo "Running migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec npm start
