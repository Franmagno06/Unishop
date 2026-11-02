#!/usr/bin/env bash
# Build Command do projeto unishop-api na Vercel (docs/deploy/deploy.md, seção 5.4).
set -euo pipefail

npx prisma generate

# migrate deploy usa a conexão DIRETA (DATABASE_URL_UNPOOLED, lida pelo prisma.config.ts).
# Aplica só migrações já versionadas. Nunca use "migrate dev" nem "migrate reset" aqui.
echo "Ambiente: ${VERCEL_ENV:-local}"
npx prisma migrate deploy
