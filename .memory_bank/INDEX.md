# Memory Bank — Index (Tier 0)

> Always-loaded тонкий указатель. Drill-down только когда нужно.

sib — агрегатор и распознавание гарантийных писем ДМС для медицинской клиники (Next.js/TS, до-MVP).

## Минимум правил (всегда)
- **План first** — задача → план-файл → ждать «деплой» (`.claude/rules/agent-workflow.md`).
- **Инженерная конституция** — срезы UI→БД, тесты рядом, зелёный гейт перед «готово», внешние вызовы
  в обёртке (Inngest) (`.claude/rules/engineering-principles.md`).
- **Спрашивай владельца только по `core/human-decisions.md`** — остальное решай сам + фиксируй в память.
- **Читай INDEX перед задачей**, дальше — только нужный Tier 1/Tier 2 (не сканируй всё).
- **Не дублируй память** — один факт в одном месте; сводка ≤3 KB со ссылкой на Tier 2.
- **Меняешь архитектуру/контракты → обнови память** (`.claude/rules/memory-discipline.md`).

## Decision tree — что читать

Идём: **Tier 1 (`core/<тема>.md`, сводки)** → drill-down в Tier 2 (`domain/`, `reference/`) при нехватке.

<!-- GENERATED:decision-tree START -->
<!-- Таблицу регенерирует tools/memory-audit.mjs из frontmatter. Не редактируй вручную. -->

| Задача (scope) | Tier 1 | Tier 2 |
|----------------|--------|--------|
| Админка — главный экран, реестр, карточка, очередь, справочники, Excel-экспорт | `core/admin-panel.md` | `domain/product-spec.md` |
| Архитектура — пайплайн обработки писем, стек, слои, фоновые задачи | `core/architecture.md` | `domain/product-spec.md` |
| Модель данных — сущности и ключевые поля | `core/data-model.md` | `domain/product-spec.md` |
| Забор писем — IMAP/Яндекс, двойная пересылка, дедупликация | `core/email-ingestion.md` | `domain/product-spec.md` |
| Список решений, которые принимает ТОЛЬКО владелец — остальное агент решает сам | `core/human-decisions.md` | `domain/product-spec.md` |
| Распознавание — извлечение текста, поля, confidence, ручная проверка | `core/recognition.md` | `domain/product-spec.md` |
| Роли, права доступа (RBAC), ПДн и безопасность | `core/roles-and-access.md` | `domain/product-spec.md` |
| Бизнес-контекст — зачем продукт, для кого, что в scope | `product_brief.md` | `domain/product-spec.md` |
| Термины ДМС/страхования и проекта — единый источник консистентности | `glossary.md` | — |
<!-- GENERATED:decision-tree END -->

**Правило:** сначала `core/<тема>.md`. Не хватает данных — drill в Tier 2 (указан в конце сводки).

## Always-on docs (Tier 0/1)
- `source-of-truth.md` — разрешение конфликтов источников.
- `project-state.md` — снимок «где проект сейчас» (обновлять после крупных изменений).
- `decisions.md` — ADR-лог архитектурных решений.

## Path-scoped rules (auto-loaded)
`.claude/rules/*.md` грузятся автоматически при работе с релевантными файлами (по `paths:`):
`agent-workflow`, `memory-discipline`, `engineering-principles`, `guardrails` (всегда); `code-standards`,
`ui-rules` (по путям кода/UI). Полные версии процесс-правил — в `guides/`.

## Plans workflow
1. `plans/<slug>.md` (status `draft`) → ждать «деплой».
2. Deploy → выполнить → `completed` → переместить в `completed_plans/`.
3. `partial` / `cancelled` остаются в `plans/`.
Шаблон: `plans/_template.md`. Реестры: `plans/README.md`, `completed_plans/README.md`.

## Index map
- `core/` — Tier 1 короткие сводки. `guides/` — полные процесс-доки.
- `domain/` — Tier 2 доменные детали (`product-spec.md` — полный бриф). `reference/` — стандарты качества.
- `archive/` — устаревшая, но ценная память. `changelog/memory-log.md` — лог изменений памяти.
- `_secrets/ACCESS.md` — доступы (gitignored, 600).

## Обслуживание памяти
- **Быстро** (regen decision-tree + orphan/stale/links): скилл `/memory-check` (без Node) или
  `node tools/memory-audit.mjs`.
- **Глубоко, после крупных изменений:** скилл `/memory-cleanup` (dry-run → подтверждение). Правила: `CLEANUP_POLICY.md`.
- Поля frontmatter и их значения: `METADATA_SCHEMA.md`.
