---
tier: 1
topic: architecture
scope: Архитектура — пайплайн обработки писем, стек, слои, фоновые задачи
tier2: ../domain/product-spec.md
updated: 2026-07-23
importance: high
source: domain/product-spec.md §15,§22
status: working
source_of_truth: supporting
last_verified: 2026-07-22
review_after: ""
---

# Архитектура — Tier 1 сводка

> Пайплайн «письмо → реестр». Полный стек, слои `lib/server/*`, маршруты — `product-spec.md` §22.

## Стек (ADR D1, сверено с кодом 2026-07-22)
- **Next 16 (App Router) + React 19 + TS**; **Tailwind v4 + radix-ui** (стиль shadcn, пакета нет).
- **PostgreSQL + Drizzle**; границы валидирует **Zod** (`drizzle-zod` НЕ используется).
- **Inngest** — задумывался как durable-слой (IMAP, вложения, OCR, LLM). **ОТКЛОНЕНИЕ (ADR D16):** живой
  приём реализован как **серверный python-раннер на systemd-таймере** (`/opt/sib-intake`, каждые 3 мин),
  переиспользующий рабочую offline-распознавалку — не порт в Inngest. В коде Inngest остаётся `ping`.
- **OpenAI через RU-прокси** (`lib/server/llm/openai.ts`, `fetch`, без SDK; из РФ 403 ⇒
  `OPENAI_BASE_URL` обязателен). Модель `gpt-5.4-mini`, Structured Outputs strict.
- **Auth:** телефон → код в Telegram (порт sup2, бот `doconpro_bot`, прокси + long-poll).
- **Оригиналы (ПДн):** `lib/storage.ts` `STORAGE_DIR` вне БД/git, в БД путь + sha256. Excel — `exceljs`.

## Пайплайн (дизайн §15 — S1 РЕАЛИЗОВАН и живёт, см. D16 + `project-state.md`)
> S1 (Collector→Recognition→ingest) в проде: боевые ящики read-only → распознавание → реестр каждые 3 мин.
> Ниже — полный дизайн-конвейер; этапы 3–4 (OCR/архивы) покрыты распознавалкой, 8–10 — админкой/экспортом.
1. Collector — IMAP-забор (`core/email-ingestion.md`).
2. Parser — заголовки, тело text/html, пересылки (двойная D5), вложения, nested `.eml`.
3. Attachment Processor — PDF (скан→OCR), DOC/DOCX, изображения; распаковка архивов.
4. Archive Resolver — «архив ↔ письмо-с-паролем» (+ ручной fallback).
5. Recognition — regex + правила страховой + словари + LLM → confidence (`core/recognition.md`).
6. Validation — полнота → реестр либо очередь ручной проверки.
7. Database — оригиналы + извлечённое (`core/data-model.md`).
8. Admin Panel — реестр/карточка/очередь/справочники (`core/admin-panel.md`).
9. Export — Excel-реестр. 10. Audit & Security — RBAC + аудит-лог (`core/roles-and-access.md`, D4).

## Принципы
- Каждый этап — свой шаг Inngest (типизированный I/O, ретраи, идемпотентность); внешние вызовы —
  только в обёртке. Срез = вертикаль через этапы.

**Tier 2:** `domain/product-spec.md` §22 (факт кода), §15 (дизайн), §6 (сценарий).
