# sib — агрегатор гарантийных писем ДМС. Продакшн-образ Next.js (сборка на сервере, CI/CD).
FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile

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
