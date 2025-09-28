#!/bin/bash
# Script simples de migração (assume psql no PATH e DATABASE_URL definido)
if [ -z "$DATABASE_URL" ]; then
  echo "Defina DATABASE_URL antes de rodar"
  exit 1
fi
psql "$DATABASE_URL" -f db.sql
psql "$DATABASE_URL" -f seed.sql
echo "Migrations e seeds aplicadas."
