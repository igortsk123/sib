# Core — Tier 1 короткие сводки

> Файлы по 2–3 KB. Читаются как первый drill-down из `INDEX.md`. Каждый имеет frontmatter
> (`topic`/`tier:1`/`scope`/`tier2`/`updated`) и финальную строку `Tier 2:` для расширения.
> Шаблон новой сводки — `_template.md`.

## Реестр сводок

<!-- GENERATED:core-registry START -->
<!-- Таблицу регенерирует tools/memory-audit.mjs из frontmatter. Не редактируй вручную. -->

| Файл | topic | Когда читать (scope) | Tier 2 | updated |
|------|-------|----------------------|--------|---------|
| `admin-panel.md` | admin-panel | Админка — реальные страницы, реестр, карточка, справочники, шаблоны, Excel-экспорт | `../domain/product-spec.md` | 2026-07-23 |
| `architecture.md` | architecture | Архитектура — пайплайн обработки писем, стек, слои, фоновые задачи | `../domain/product-spec.md` | 2026-07-23 |
| `data-model.md` | data-model | Модель данных — сущности и ключевые поля | `../domain/product-spec.md` | 2026-07-23 |
| `email-ingestion.md` | email-ingestion | Забор писем — IMAP/Яндекс, двойная пересылка, дедупликация | `../domain/insurer-recognition.md` | 2026-07-22 |
| `human-decisions.md` | human-decisions | Список решений, которые принимает ТОЛЬКО владелец — остальное агент решает сам | `../domain/product-spec.md` | 2026-07-23 |
| `lessons.md` | lessons | Перед планированием — уроки; что пробовали и что НЕ сработало, отброшенные подходы | `../anti-patterns.md` | 2026-07-23 |
| `recognition.md` | recognition | Распознавание — извлечение текста, поля, confidence, ручная проверка | `../domain/recognition-architecture.md` | 2026-07-23 |
| `roles-and-access.md` | roles-and-access | Роли, права доступа (RBAC), ПДн и безопасность | `../domain/product-spec.md` | 2026-07-22 |
<!-- GENERATED:core-registry END -->

> Глоссарий ДМС — `../glossary.md` (Tier 1). Реестр и decision tree в INDEX регенерирует
> `tools/memory-audit.mjs` из frontmatter. Создал сводку — проставь frontmatter и запусти аудит:
> он сам впишет её и в реестр, и в decision tree. Руками таблицы не правим.
