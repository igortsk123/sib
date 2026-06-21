# _optional — каталог подключаемых модулей

> Эти модули **не копируются** в проект по умолчанию. `/memory-init` (или ты вручную) копирует
> нужные по релевантности — чтобы свежий memory bank не раздувался лишним. После копирования
> проставь frontmatter и зарегистрируй в `INDEX.md` (decision tree это сделает аудит).

## Куда копировать
- `memory/*` → `.memory_bank/` (Tier 1/2 доки).
- `rules/*` → `.claude/rules/` (path-scoped или always-on правила).
- `quality-standards/*` → `.memory_bank/reference/quality-standards/` (переносимые эталоны качества).

## Каталог

| Модуль | Когда брать | Куда |
|--------|-------------|------|
| `memory/anti-patterns.md` | используешь кодоген (v0/copilot) или есть повторяющиеся грабли | `.memory_bank/` |
| `memory/patterns.md` | есть типовые повторяющиеся фичи/экраны | `.memory_bank/` |
| `memory/glossary.md` | важна консистентность терминов/токенов/тона | `.memory_bank/` |
| `memory/sync-with-external.md` | проект зависит от внешнего источника правды (backend, др. репо) | `.memory_bank/` |
| `memory/deployment.md` | есть прод/CI-CD | `.memory_bank/` |
| `memory/quality-criteria.md` | готовишься к проду/пилоту, хочешь поднять зрелость качества по эталонам | `.memory_bank/` |
| `quality-standards/*` | нужен полный свод senior-критериев (backend/sql/frontend/android) как канон | `.memory_bank/reference/quality-standards/` |
| `rules/guardrails.md` | есть боевой трафик / нельзя ломать живой флоу | `.claude/rules/` |
| `rules/agent-orchestration.md` | планируешь запускать несколько агентов параллельно | `.claude/rules/` |

> Не уверен — не копируй. Модуль легко добавить позже; лишний модуль зашумляет навигацию.
