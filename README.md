# sib — агрегатор и распознавание гарантийных писем ДМС

Веб-продукт для медицинской клиники: собирает из почтовых ящиков письма страховых компаний по ДМС
(«гарантийные письма»), распознаёт их (тело, PDF, Word, архивы+пароль, OCR), сводит в единый
проверяемый реестр и даёт поиск по пациентам/полисам/страховым + экспорт в Excel.

Полный контекст, решения и навигация — в `.memory_bank/` (старт: `.memory_bank/INDEX.md`).

## Стек
Next.js 16 (App Router) · React 19 · TypeScript (строго) · Tailwind 4 · shadcn/ui (radix, new-york) ·
PostgreSQL + Drizzle · Zod · Inngest (durable-задачи, по мере срезов) · Яндекс IMAP/SMTP XOAUTH2 ·
OpenAI (через RU-прокси) · exceljs.

UI-фундамент (дизайн-токены + примитивы) портирован из WFM-admin; инфра/деплой-методология — по образцу
sup2, но полностью **независимо** (своё репо, ключ, сеть, БД, контейнер, порт).

## Разработка
```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck    # строгие типы
pnpm test         # vitest (unit)
pnpm build        # прод-сборка (гейт)
pnpm lint         # eslint
```
Окружение: скопируй `.env.example` → `.env.local`. На этапе каркаса все переменные опциональны
(образ собирается без живой БД — клиент Drizzle ленивый).

## База данных
```bash
pnpm db:generate  # сгенерировать миграции из lib/db/schema
pnpm db:migrate   # применить
pnpm db:studio    # drizzle studio
```

## Деплой
Push в `main` → сервер (`/opt/sib`) по systemd-таймеру (~2 мин) собирает образ с гейтом
typecheck+test → миграции → swap контейнера → smoke `/api/health` → rollback при провале.
Подробности и серверные скрипты — `deploy/`. Прод: `https://sib.docon.pro`.

## Процесс
План → «деплой» (`.claude/rules/agent-workflow.md`). Самопроверяемость: зелёный гейт перед «готово»
(`.claude/rules/engineering-principles.md`). ПДн/мед.тайна — `.claude/rules/guardrails.md`.
