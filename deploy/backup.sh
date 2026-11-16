#!/usr/bin/env bash
# Резервная копия базы и загруженных фото. Пример для cron (каждую ночь в 04:15):
#   15 4 * * * cd /opt/restaurant && ./deploy/backup.sh >> backups/backup.log 2>&1
# Копии старше 14 дней удаляются. Храните копии и вне сервера (например, в S3).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
stamp=$(date +%Y-%m-%d_%H%M)
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db \
  pg_dump -U restaurant -d restaurant --format=custom > "backups/db_${stamp}.dump"
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T app \
  tar -C /app -czf - uploads > "backups/uploads_${stamp}.tar.gz"
find backups -type f \( -name 'db_*.dump' -o -name 'uploads_*.tar.gz' \) -mtime +14 -delete
echo "Готово: backups/db_${stamp}.dump, backups/uploads_${stamp}.tar.gz"
