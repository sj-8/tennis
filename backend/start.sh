#!/bin/sh
set -e

echo "=== Starting Service ==="

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  echo "Please configure it in WeChat Cloud Hosting Console -> Settings -> Environment Variables."
  exit 1
fi

# 自动修复：将中文冒号替换为英文冒号
if echo "$DATABASE_URL" | grep -q "："; then
  echo "WARNING: Detected Chinese colon in DATABASE_URL. Auto-fixing..."
  export DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/：/:/g')
fi

# Mask password for logging safety (assuming format mysql://user:pass@host:port/db)
SAFE_URL=$(echo "$DATABASE_URL" | sed -E 's/:([^:@]+)@/:****@/')
echo "Database Connection: $SAFE_URL"

echo "Running migrations..."
# 尝试解决 baseline 问题：如果数据库非空但没有迁移记录，尝试标记第一次迁移为已应用
npx prisma migrate resolve --applied 0_init || true
# 强制推送 schema 到数据库，确保表结构与 schema.prisma 一致
npx prisma db push --accept-data-loss
npx prisma migrate deploy

echo "Starting application..."
exec npm start
