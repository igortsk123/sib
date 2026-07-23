# Memory Bank — Index (Tier 0)

sib — агрегатор и распознавание гарантийных писем ДМС для медицинской клиники (Next.js/TS, **прод LIVE**).

## Decision tree — что читать

**Tier 1 (`core/<тема>.md`, сводки)** → drill-down в Tier 2 (`domain/`, `reference/`) при нехватке.
Только нужное по дереву, не сканируй всё; не дублируй факт.

<!-- GENERATED:decision-tree START -->
<!-- Таблицу регенерирует tools/memory-audit.mjs из frontmatter. Не редактируй вручную. -->

| Задача (scope) | Tier 1 | Tier 2 |
|----------------|--------|--------|
| Админка — реальные страницы, реестр, карточка, справочники, шаблоны, Excel-экспорт | `core/admin-panel.md` | `../domain/product-spec.md` |
| Архитектура — пайплайн обработки писем, стек, слои, фоновые задачи | `core/architecture.md` | `../domain/product-spec.md` |
| Модель данных — сущности и ключевые поля | `core/data-model.md` | `../domain/product-spec.md` |
| Забор писем — IMAP/Яндекс, двойная пересылка, дедупликация | `core/email-ingestion.md` | `../domain/insurer-recognition.md` |
| Список решений, которые принимает ТОЛЬКО владелец — остальное агент решает сам | `core/human-decisions.md` | `../domain/product-spec.md` |
| Перед планированием — уроки; что пробовали и что НЕ сработало, отброшенные подходы | `core/lessons.md` | `../anti-patterns.md` |
| Бизнес-контекст — зачем продукт, для кого, что в scope | `product_brief.md` | `domain/product-spec.md` |
| Распознавание — извлечение текста, поля, confidence, ручная проверка | `core/recognition.md` | `../domain/recognition-architecture.md` |
| Роли, права доступа (RBAC), ПДн и безопасность | `core/roles-and-access.md` | `../domain/product-spec.md` |
| Термины ДМС/страхования и проекта — единый источник консистентности | `glossary.md` | — |
| Ценообразование сервиса и QR-допродажи — вилки РФ, экономический эффект, ICP (гипотеза владельца) | `core/pricing.md` | — |
<!-- GENERATED:decision-tree END -->

## Always-on docs (Tier 0/1)
- `source-of-truth.md` — разрешение конфликтов источников.
- `project-state.md` — снимок «где проект сейчас» (обновлять после крупных изменений).
- `decisions.md` — ADR-лог архитектурных решений.

## Plans workflow
`plans/<slug>.md` (`draft`) → ждать «деплой» → выполнить → `completed` в `completed_plans/`;
`partial`/`cancelled` остаются. Шаблон `plans/_template.md`, реестры в README (регенерирует аудит).

## Index map
- `core/` — Tier 1 сводки. `guides/` — процесс-доки. `domain/` — Tier 2 детали
  (`domain/product-spec.md` — полный бриф). `reference/` — стандарты качества. `archive/` — устаревшее ценное.
- `changelog/memory-log.md` — лог памяти, `changelog/project-history.md` — хронология.
  `_secrets/ACCESS.md` — доступы (gitignored, 600).

## Обслуживание памяти
Быстро — `/memory-check` (или `node tools/memory-audit.mjs`); глубоко — `/memory-cleanup` (dry-run).
Схема frontmatter — `METADATA_SCHEMA.md`, правила очистки — `CLEANUP_POLICY.md`.
