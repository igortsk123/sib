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

## 2026-07-23 — апгрейд кита v1.3.0 → v1.4.0
Команда: upgrade.sh

- UPGRADE  kit-owned файлы — обновлено: 8, добавлено: 3, конфликтов: 1 (*.kit-new)

## 2026-07-22 — HEAL: выравнивание памяти под кит v1.3.0
Команда: HEAL-конвейер (план `completed_plans/kit-align.md`)
Approval: владелец («деплой»)

- UPGRADE  kit-owned до v1.3.0: +7 файлов (session-reminder/-freshness, metrics-append, merge-settings,
  CI `memory-audit.yml`, `_secrets/README`); 7 `.kit-new` конфликтов сведены (приняты kit-версии —
  локальных правок не было): memory-audit.mjs, stop-hook, 3 скилла, METADATA_SCHEMA, archive/README.
- ADD      `_kit/` (VERSION 1.3.0, manifest, gate-mode=warn, code-ref-ignore); `_intake/session-scratch.md`.
- FIX      tier-указатели (10) → `../`-конвенция кита; NO-TIER1 → recognition→recognition-architecture,
  email-ingestion→insurer-recognition; INDEX-REF, CODE-REF (`lib/api/` → allowlist).
- FIX      README реестров (core/plans/completed_plans) → GENERATED-маркеры; decision-tree регенерирован.
- COMPRESS project-state 20→7 KB (хронология → `changelog/project-history.md`); 7 Tier1-сводок ужаты;
  Tier 0 (CLAUDE+INDEX) 10.1→7.5 KB. Детали ушли в `domain/product-spec.md` §22–23.
- VERIFY   все `core/*` сверены с кодом (updated/last_verified → 2026-07-22). Ключевое: конвейер
  распознавания (pdftotext/xlrd/…), IMAP-поллинг, RBAC-матрица правки, AuditLog — пока **spec/офлайн
  (`.mail-intake/`), в рантайме код = каркас/seed**. Память приведена к этой реальности.
- FIX      стадия в CLAUDE/INDEX: «greenfield/до-MVP, кода нет» → **прод LIVE** (было устаревшим).
- PLAN     `recognition-roadmap` in_progress → **partial** (зонтичная карта, срезы — отдельными планами).
- CFG      CI-гейт: `--tier1-max-kb 4` (кириллица ~2 байта/символ). Audit «чисто».

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
