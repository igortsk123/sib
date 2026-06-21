# Memory Log — журнал очисток и архиваций

> Append-only лог изменений памяти, сделанных `/memory-cleanup` (и ручных архиваций).
> Нужен для прозрачности и обратимости: видно, что/когда/почему изменили или заархивировали.
> Новые записи добавляются СВЕРХУ. Этот файл исключён из аудита.

## Формат записи

```
## YYYY-MM-DD — <короткий заголовок прогона>
Команда: /memory-cleanup [--apply]
Approval: <кто подтвердил / «dry-run, без применения»>

- ARCHIVE  <путь> → archive/YYYY/MM/<файл>  — причина: <...>
- MERGE    <путь A> + <путь B> → <итог>      — причина: <дубль>
- COMPRESS <путь>                            — было N KB, стало M KB
- DELETE   <путь> (архивная копия: archive/YYYY/MM/<файл>) — причина: <...>
- VERIFY   <путь>                            — поднят вопрос: <...>
- FIX      INDEX/ссылки                      — <что починили>
```

---

<!-- Реальные записи прогонов очистки добавляются ниже (сверху — свежие). -->

## 2026-06-21 — Развёртывание Memory Bank (sib) из шаблона
Команда: ручное развёртывание `memory-bank-template` → `sib` + memory-init/-check
Approval: владелец («план в целом принимаю»)

- INIT   каркас из `memory-bank-template` (autopilot, dev); tmux-сессия `igor` (`.vscode/settings.json`)
- ADD    Яндекс-почта перенесена из sup2; IMAP проверен рабочим (ADR D2) → `_secrets/ACCESS.md` (600), `.env.local`
- GEN    Tier 0/1: `CLAUDE.md`, `INDEX.md`, `product_brief`, `source-of-truth`, `project-state`, `decisions` (D1–D7)
- GEN    `core/`: architecture, email-ingestion, recognition, data-model, admin-panel, roles-and-access, human-decisions
- GEN    rules: `engineering-principles` (конституция), `guardrails` (ПДн), `code-standards` (TS/Zod)
- ACT    optional: sync-with-external, quality-criteria, glossary, anti-patterns, deployment, `reference/quality-standards/*`
- MOVE   бриф → `domain/product-spec.md` (Tier 2, +frontmatter); intake → `_intake/_processed/`
- ADR    D7: типизация — простые типы + явные DTO + Zod на границах; tRPC отложен
