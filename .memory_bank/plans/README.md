# Plans — активные планы

## Lifecycle
```
draft → in_progress → completed → перенос в completed_plans/
                   ↘ partial   → остаётся здесь
        cancelled → остаётся здесь
```
Только `completed` переносятся в `completed_plans/`. `partial`/`cancelled` остаются здесь.
**Гейт:** план не становится `completed`, пока не выполнен `/memory-check` и audit не «чисто»
(см. `.claude/rules/agent-workflow.md`).

## Статусы
| Статус | Описание |
|--------|----------|
| `draft` | Создан, ждёт команду «деплой» |
| `in_progress` | Деплой начат |
| `partial` | Прерван, часть выполнена — НЕ переносить |
| `completed` | Всё выполнено → перенести в `completed_plans/` |
| `cancelled` | Отменён явно |

## Реестр активных планов

<!-- GENERATED:plans-registry START -->
<!-- Таблицу регенерирует tools/memory-audit.mjs из frontmatter. Не редактируй вручную. -->

| slug | Название | status | created | updated |
|------|----------|--------|---------|---------|
| registry-data-quality-audit | — | in_progress | — | 2026-07-23 |
| llm-to-deterministic | — | draft | — | 2026-07-23 |
| mail-backfill-2026 | — | draft | 2026-07-22 | 2026-07-22 |
| self-healing-recognition | — | draft | 2026-06-22 | 2026-06-22 |
| per-template-parse-journal | — | draft | 2026-06-22 | 2026-06-22 |
| care-type-split-ambulatory-dentistry | — | draft | 2026-06-22 | 2026-06-22 |
| recognition-roadmap | — | partial | 2026-06-21 | 2026-07-22 |
<!-- GENERATED:plans-registry END -->

> Шаблон нового плана — `_template.md`. Реестр регенерирует аудит — руками не правим.
> Audit также ловит зомби: `in_progress` без движения (PLAN-STUCK) и `completed`,
> забытый в этой папке (PLAN-MISPLACED).
