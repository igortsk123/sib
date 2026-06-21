---
tier: 1
topic: architecture
scope: Архитектура — пайплайн обработки писем, стек, слои, фоновые задачи
tier2: domain/product-spec.md
updated: 2026-06-21
importance: high
source: domain/product-spec.md §15
status: working
source_of_truth: supporting
last_verified: 2026-06-21
review_after: ""
---

# Архитектура — Tier 1 сводка

> Пайплайн «письмо → реестр». Детали компонентов — `domain/product-spec.md` §15.

## Стек (ADR D1)
- **Next.js (App Router) + TypeScript** (строго) — UI + server actions/route handlers.
- **Tailwind + shadcn/ui** — админка.
- **PostgreSQL + Drizzle ORM** — единая БД (письма, вложения, гарантии, справочники, пользователи, аудит).
- **Inngest** — durable-задачи и ретраи: IMAP-поллинг, обработка вложений, OCR, LLM. Тяжёлое — НЕ в request-пути.
- **OpenAI** (через RU-прокси) — LLM для сложных случаев распознавания.
- **Zod** — валидация внешних данных на границах (письма, LLM-ответы, формы, env); `drizzle-zod` для схем БД.
- **Клиент↔сервер** — Next App Router (Server Actions / Route Handlers) с явными DTO; tRPC не по умолчанию (ADR D7).

## Пайплайн обработки (этапы, §15)
1. **Email Collector** — IMAP-забор новых писем (`core/email-ingestion.md`).
2. **Email Parser** — заголовки, тело (text/html), пересылки (двойная — D5), вложения, nested `.eml`.
3. **Attachment Processor** — текст из PDF (текст/скан→OCR), DOC/DOCX, изображений; распаковка архивов.
4. **Archive Resolver** — сопоставление «архив ↔ письмо-с-паролем» (+ ручной fallback).
5. **Recognition Engine** — поля письма (regex + правила страховой + словари + LLM) → confidence (`core/recognition.md`).
6. **Validation Engine** — контроль полноты → высокая уверенность в реестр, иначе ручная очередь.
7. **Database** — оригиналы + извлечённое (проверяемость) (`core/data-model.md`).
8. **Admin Panel** — реестр/карточка/очередь/справочники (`core/admin-panel.md`).
9. **Export Service** — Excel-реестр.
10. **Audit & Security** — RBAC + аудит-лог (`core/roles-and-access.md`, ADR D4).

## Принципы реализации
- Каждый этап — отдельный шаг/функция Inngest: типизированный вход/выход, ретраи, идемпотентность.
- Внешние вызовы (IMAP, OpenAI, файловое хранилище) — только в обёртке (конституция).
- Срез = вертикаль через нужные этапы (не «весь Collector сразу»).

**Tier 2:** `domain/product-spec.md` §15 (архитектура), §6 (пользовательский сценарий).
