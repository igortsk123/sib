# sib — агрегатор гарантийных писем ДМС. Продакшн-образ Next.js (сборка на сервере, CI/CD).
FROM node:20-alpine AS base
# Ретраи на транзиентные сетевые сбои npmjs (сеть сервера бывает нестабильна).
RUN npm install -g pnpm@9 \
      --fetch-retries=5 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# Ретраи на транзиентные сетевые сбои реестра (иначе деплой падает на сетевом блипе).
RUN pnpm config set fetch-retries 5 \
 && pnpm config set fetch-retry-mintimeout 5000 \
 && pnpm config set fetch-retry-maxtimeout 120000 \
 && pnpm config set network-concurrency 4 \
 && pnpm install --no-frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Гейты сборки: типы + unit-тесты. Падение здесь = деплой НЕ свапает контейнер.
RUN pnpm typecheck
RUN pnpm test
RUN pnpm build

FROM base AS run
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Provenance: коммит запекается в образ → отдаётся в /api/health.
ARG GIT_COMMIT=""
ENV GIT_COMMIT=$GIT_COMMIT
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm","start"]
