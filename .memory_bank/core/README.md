# Core — Tier 1 короткие сводки

> Файлы по 2–3 KB. Читаются как первый drill-down из `INDEX.md`. Каждый имеет frontmatter
> (`topic`/`tier:1`/`scope`/`tier2`/`updated`) и финальную строку `Tier 2:` для расширения.
> Шаблон новой сводки — `_template.md`.

## Реестр сводок

| Файл | Тема (topic) | Tier 2 |
|------|--------------|--------|
| `architecture.md` | пайплайн обработки, стек, слои | `domain/product-spec.md` |
| `email-ingestion.md` | IMAP/Яндекс, двойная пересылка, дедуп | `domain/product-spec.md` |
| `recognition.md` | извлечение текста, поля, confidence, ручная проверка | `domain/product-spec.md` |
| `data-model.md` | сущности и поля (EmailMessage/Attachment/GuaranteeLetter/…) | `domain/product-spec.md` |
| `admin-panel.md` | реестр, карточка, очередь, справочники, Excel | `domain/product-spec.md` |
| `roles-and-access.md` | роли, RBAC, ПДн/безопасность | `domain/product-spec.md` |
| `human-decisions.md` | что спрашивать у владельца | `domain/product-spec.md` |

> Глоссарий ДМС — `../glossary.md` (Tier 1). Реестр и decision tree в INDEX держатся в согласии через
> `tools/memory-audit.mjs` (регенерирует из frontmatter). Создал сводку — проставь frontmatter и запусти аудит.
