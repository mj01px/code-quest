#!/bin/bash
# Dump do banco do CodeQuest, rodado pelo crontab (deploy/crontab) todo dia.
# Gera ~/backups/codequest-AAAAMMDD-HHMMSS.sql.gz, confere o arquivo e apaga os
# com mais de 7 dias. Fica na propria VPS: para sobreviver a perda do droplet,
# ligar tambem os Backups do droplet na DigitalOcean ou baixar copias com scp.
#
# Restaurar (banco vazio, com os containers no ar):
#   gunzip -c ~/backups/ARQUIVO.sql.gz | docker compose exec -T db \
#     sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
set -euo pipefail

cd "$(dirname "$0")/.."
umask 077

destino="${HOME}/backups"
mkdir -p "$destino"
arquivo="$destino/codequest-$(date -u +%Y%m%d-%H%M%S).sql.gz"

docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' \
    | gzip > "$arquivo.tmp"

# So vale como backup se o gzip esta integro e o dump terminou.
gzip -t "$arquivo.tmp"
gunzip -c "$arquivo.tmp" | tail -n 5 | grep -q "PostgreSQL database dump complete"
mv "$arquivo.tmp" "$arquivo"

find "$destino" -name 'codequest-*.sql.gz' -mtime +7 -delete
echo "$(date -u +%FT%TZ) backup ok: $arquivo ($(du -h "$arquivo" | cut -f1))"
