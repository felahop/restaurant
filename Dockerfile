# syntax=docker/dockerfile:1
# Сборка сайта для сервера: зависимости → сборка Next.js (standalone) → лёгкий образ для запуска.
# Отдельная цель «migrate» применяет миграции базы и может запустить сид.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
# prisma generate (postinstall) читает конфиг, которому нужен DATABASE_URL — при сборке подойдёт заглушка.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY package.json package-lock.json prisma7.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build \
    NEXT_TELEMETRY_DISABLED=1 \
    BUILD_STANDALONE=1
# Адрес сайта попадает в sitemap, robots, canonical и ссылки — его нужно знать при сборке.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app \
 && mkdir -p /app/uploads && chown app:app /app/uploads
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

# Миграции (и при первом запуске — демо-наполнение): docker compose run --rm migrate
FROM builder AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]
