# sib — Агрегатор и распознавание гарантийных писем ДМС

Веб-продукт для медицинской клиники: собирает из почтовых ящиков письма страховых по ДМС
(«гарантийные письма»), распознаёт (тело, PDF, Word, архивы+пароль, OCR), сводит в проверяемый
реестр с поиском по пациентам/полисам/страховым + экспорт в Excel для внутренней системы клиники.
Стек: Next.js + TypeScript (Zod на границах) + Tailwind/shadcn; PostgreSQL + Drizzle; Inngest
(durable-задачи, ретраи); почта — Яндекс IMAP/SMTP XOAUTH2; LLM — OpenAI (через прокси).
Стадия: **прод LIVE** (https://sib.docon.pro), идут пост-MVP правки распознавания/UX.
Где сейчас — `.memory_bank/project-state.md`.

## Иерархия памяти
- **Tier 0 (auto-loaded):** этот файл + импортированный INDEX + `.claude/rules/*.md`
  (без `paths:` — всегда; с `paths:` — при касании подходящих файлов).
- **Tier 2 (details):** `.memory_bank/**/*.md` + `domain/product-spec.md` — по decision tree.

## Навигация памяти (грузится всегда, переживает компакцию)
@.memory_bank/INDEX.md

## Сначала прочитай
1. `.memory_bank/source-of-truth.md` — что считать истиной при конфликте.
2. `.memory_bank/project-state.md` — где проект сейчас.

## Компакция контекста
При сжатии контекста ОБЯЗАТЕЛЬНО сохранить: активный план (slug+статус), изменённые файлы,
команды гейта, next steps, содержимое `.memory_bank/_intake/session-scratch.md`.

## Критично — инженерная конституция (`.claude/rules/engineering-principles.md`)
- **Режим AUTOPILOT** (`.claude/rules/agent-workflow.md`): работаем автономно — план→выполнение→деплой без
  ожидания команды «деплой». Обязательны: зелёный гейт, память+audit, эскалация только по `human-decisions`, guardrails.
- **Самопроверяемость:** владелец НЕ ревьюит построчно. «Готово» = зелёный гейт (typecheck+lint+
  unit+integration+e2e+build) + e2e на затронутый поток. Срезы вертикальные UI→БД, с тестами.
- **Гипотезы, не аксиомы:** контракт/схема — допущение; расхождение → отклонись и запиши ADR в `decisions.md`.
- **Внешние вызовы — в обёртке:** типизированный результат + ретрай через Inngest + user-facing ошибка.
- **Спрашивай владельца только по `core/human-decisions.md`**; остальное решай сам + фиксируй.
- **ПДн/мед.тайна:** данные пациентов — повышенные требования (`guardrails.md`, `core/roles-and-access.md`).
- Конфликт источников → `source-of-truth.md` решает; расхождение фиксируем явно.
- **Конец задачи = `/memory-check`.** План не `completed`, пока durable сессии не в `.memory_bank/`
  и audit не «чисто». Захват на ходу — `.memory_bank/_intake/session-scratch.md` (append-only блокнот).

## Path-scoped правила (.claude/rules/)
Всегда: `agent-workflow` (план→деплой), `memory-discipline` (память), `engineering-principles`
(конституция), `guardrails` (ПДн/секреты). По путям: `code-standards` (`**/*.{ts,tsx}`),
`ui-rules` (`app/**`, `components/**`).
