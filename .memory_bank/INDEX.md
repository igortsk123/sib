# Memory Bank — Index (Tier 0)

sib — агрегатор и распознавание гарантийных писем ДМС для медицинской клиники (Next.js/TS, **прод LIVE**).

## Decision tree — что читать

**Tier 1 (`core/*`) → drill в Tier 2** по дереву; не сканируй всё, не дублируй факт.

<!-- GENERATED:decision-tree START -->
<!-- Таблицу регенерирует tools/memory-audit.mjs из frontmatter. Не редактируй вручную. -->

| Задача (scope) | Tier 1 | Tier 2 |
|----------------|--------|--------|
| Админка — реальные страницы, реестр, карточка, справочники, шаблоны, Excel-экспорт | `core/admin-panel.md` | `../domain/product-spec.md` |
| Архитектура — пайплайн обработки писем, стек, слои, фоновые задачи | `core/architecture.md` | `../domain/product-spec.md` |
| Конвейер покрытия: документы страховых → правила → карточка пациента | `core/coverage-pipeline.md` | `../guides/coverage-extraction-prompt.md` |
| Модель данных — сущности и ключевые поля | `core/data-model.md` | `../domain/product-spec.md` |
| Реклама — спрос и семантика Wordstat (сколько и что ищут) | `core/demand-semantics.md` | `../domain/demand-semantics.md` |
| Забор писем — IMAP/Яндекс, двойная пересылка, дедупликация | `core/email-ingestion.md` | `../domain/insurer-recognition.md` |
| Решения ТОЛЬКО владельца — остальное агент решает сам | `core/human-decisions.md` | `../domain/product-spec.md` |
| Перед планированием — уроки; что пробовали и что НЕ сработало, отброшенные подходы | `core/lessons.md` | `../anti-patterns.md` |
| Бизнес-контекст — зачем продукт, для кого, что в scope | `product_brief.md` | `domain/product-spec.md` |
| Распознавание — извлечение текста, поля, confidence, ручная проверка | `core/recognition.md` | `../domain/recognition-architecture.md` |
| Роли, права доступа (RBAC), ПДн и безопасность | `core/roles-and-access.md` | `../domain/product-spec.md` |
| Кампании Директа — статус, структура, лендинг, запуск | `core/ads-campaigns.md` | `../domain/ads-campaigns-structure.md` |
| Термины ДМС/страхования и проекта — единый источник консистентности | `glossary.md` | — |
| Ценообразование и тарифы — решения владельца | `core/pricing.md` | `../domain/pricing-research.md` |
| Бизнес-идея ассистента покрытия — эталон для сверки решений | `core/coverage-assistant-vision.md` | `../plans/coverage-roadmap.md` |
<!-- GENERATED:decision-tree END -->

## Always-on docs (Tier 0/1)
- `source-of-truth.md` — разрешение конфликтов источников.
- `project-state.md` — снимок «где проект сейчас» (обновлять после крупных изменений).
- `decisions.md` — ADR-лог архитектурных решений.

## Plans workflow
`plans/<slug>.md` → `completed` → `completed_plans/`; `partial`/`cancelled` остаются. Реестры — README.

## Index map
`core/` Tier 1 · `guides/` процесс · `domain/` Tier 2 (`domain/product-spec.md` — бриф) · `reference/` стандарты ·
`archive/` · `changelog/` (memory-log, project-history) · `_secrets/ACCESS.md` (gitignored, 600).

## Обслуживание памяти
`/memory-check` — audit ТОЛЬКО с `--tier1-max-kb 4` (кириллица 2 б/симв; без флага 11 ложных
TIER1-BLOAT) · глубоко `/memory-cleanup`. Права рукописные — `apply.sh --permission-mode` не запускать.
