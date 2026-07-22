---
workstream: memory/kit-align
slug: kit-align
title: HEAL — выравнивание памяти sib под кит Memory Bank v1.3.0
status: completed
created: 2026-07-22
updated: 2026-07-22
completed: 2026-07-22
---

## Цель
Привести память проекта **sib** к текущему киту Memory Bank **v1.3.0** (HEAL-конвейер):
доставить новые концепции кита, починить 26 находок аудита, верифицировать против кода.

## Источник задачи
Владелец: «посмотри мемори-банк sib и обнови его всеми новыми концепциями из проекта-шаблона
memory-bank-template; сначала большой аудит и большой план; загляни в `HEAL.md` и `DEPLOY.md` кита».
→ Это сценарий **HEAL** (`memory-bank-template/HEAL.md`): свести → апгрейд → рехидратация → верификация.

## Разведка (Этап 0 — сделано, read-only)
- **Канон один**: `/home/pakar/igor/sib/.memory_bank` — единственная копия, дивергенции НЕТ.
- **Авто-память sib пуста** (`~/.claude/projects/-home-pakar-igor-sib/memory/` отсутствует) — утечки знаний нет.
- **sib = «v0»-деплой**: нет `.memory_bank/_kit/` → развёрнут китом ДО v1.2.0. Кит сейчас `1.3.0`.
- **Старый инструментарий**: `tools/memory-audit.mjs` без CODE-REF/FROZEN/footprint/metrics;
  нет `session-reminder.mjs`, `session-freshness.mjs`, `metrics-append.sh`, `merge-settings.*`.
- **Аудит новым инструментом кита**: 26 проблем (см. ниже). Tier 0 = 9.8 KB (2.3% корпуса).
- Git: remote `github-sib:igortsk123/sib.git`, банк отставал от кода (project-state 30д, коммиты по careType новее).

## Новые концепции кита, которых у sib НЕТ (v1.2.0 + v1.3.0)
1. **`_kit/`** — служебная папка: `manifest.txt` (хэши kit-owned для 3-way upgrade),
   `gate-mode.txt` (`warn`|`block`), `code-ref-ignore.txt` (allowlist для CODE-REF).
2. **Обновлённый audit** — проверки: `CODE-REF` (backtick-путь к коду сверяется с деревом репо),
   `FROZEN-MEMORY` (git: коммитов по коду после последнего коммита банка > порога), footprint %
   (доля Tier 0 в корпусе), флаг `--metrics`.
3. **CI merge-gate** — `.github/workflows/memory-audit.yml` (audit `--check` на PR/push в main),
   режим из `_kit/gate-mode.txt`.
4. **Амортизированный захват** — `_intake/session-scratch.md` (append-only блокнот; `/memory-check`
   Этап 1 консолидирует его вместо полной археологии диалога).
5. **Флот-метрики** — `tools/metrics-append.sh` → `changelog/metrics.log` (committed).
6. **Новая конвенция tier-указателей** — путь ОТНОСИТЕЛЬНО папки файла (`tier2: ../domain/x.md`,
   `tier1: ../core/y.md`). Старая root-относительная форма sib → причина всех 10 `BROKEN` в аудите.
7. **GENERATED-маркеры** в README реестров (`core/`, `plans/`, `completed_plans/`) — аудит
   регенерирует таблицы между маркерами; без них → `BROKEN` «нет маркеров GENERATED».
8. **Обновлённые kit-owned доки** — `METADATA_SCHEMA.md`, `CLEANUP_POLICY.md`, `archive/README.md`,
   `_secrets/README.md` (сверить diff'ом, слить локальные правки).

## Находки аудита (26) — сгруппированы
- **BROKEN tier-указатели (10)** — старая конвенция путей → переписать на `../`-относительную:
  7× `core/*` (`tier2: domain/product-spec.md` → `../domain/product-spec.md`),
  `domain/product-spec.md` (`tier1: product_brief.md` → `../product_brief.md`),
  2× `domain/{insurer-recognition,recognition-architecture}.md` (`tier1: core/recognition.md` → `../core/recognition.md`).
- **BROKEN README (3)** — нет GENERATED-маркеров в `core/`, `plans/`, `completed_plans/` README → апгрейд формата + регенерация аудитом.
- **NO-TIER1 (2)** — `domain/insurer-recognition.md`, `domain/recognition-architecture.md` без парной Tier 1 сводки → завести/дописать `core/recognition.md` как их tier1-вход (уже указывают на него — проверить после фикса путей).
- **BLOATED / TIER0/1-BLOAT (7)** — `project-state.md` 20 KB>12 (хронологию → `changelog/project-history.md`);
  `core/{architecture,data-model,human-decisions,recognition}.md` + `product_brief.md` >3 KB (детали → Tier 2);
  `CLAUDE.md+INDEX.md` 9.8>8 KB (ужать always-on секции).
- **PLAN-STUCK (1)** — `plans/recognition-roadmap.md` in_progress без движения с 2026-06-21 → расследовать: доделано→completed / иначе partial|cancelled (спросить владельца при сомнении).
- **INDEX-REF + REGISTRY-STALE (2)** — `product-spec.md` в INDEX не резолвится; decision-tree устарел → регенерация аудитом write-mode.
- **CODE-REF (1)** — `guides/code-standards.md` ссылается на `lib/api/` (в дереве нет; есть `lib/db`, `lib/inngest`, …) → обновить ссылку на реальный путь ИЛИ добавить в `_kit/code-ref-ignore.txt`.

## Скоуп — что входит
- Бэкап банка (+`.claude`, CLAUDE.md, tools) в `~/backups/`.
- Апгрейд kit-owned файлов через `upgrade.sh` (tools, CI, скиллы, `_kit/`, обновлённые доки).
- Перенос смысла в project-owned файлы кита (rules, `plans/_template.md` DoD+`title:`, README GENERATED).
- Починка 26 находок аудита (см. группы выше) → audit «чисто».
- Верификация против кода (факт-чек `core/*`, обратное покрытие по git 4–6 нед, drill 3–5 вопросов).
- Обновить `FLEET.md` кита (sib → v1.3.0 + дата), посеять авто-память sib (canon-путь).
- Коммит по вехам + push (проверка секретов ПЕРЕД каждым push).

## Скоуп — что НЕ входит
- **Код приложения sib не трогаем** (это выравнивание памяти). Продукт-баги, найденные при
  верификации, — выносим владельцу списком, НЕ чиним.
- Переключение гейта `warn→block` (действие владельца в GitHub branch protection).
- Вторую копию банка сводить не нужно (её нет).

## Файлы к изменению
**Апгрейд (upgrade.sh, kit-owned):**
- [ ] `tools/memory-audit.mjs`, `tools/session-reminder.mjs`, `tools/session-freshness.mjs`,
      `tools/metrics-append.sh`, `tools/merge-settings.{py,ps1}`, `tools/stop-hook.example.json`
- [ ] `.github/workflows/memory-audit.yml` (новый)
- [ ] `.claude/skills/{memory-init,memory-check,memory-cleanup}/SKILL.md`
- [ ] `.memory_bank/{METADATA_SCHEMA,CLEANUP_POLICY}.md`, `archive/README.md`, `_secrets/README.md`
- [ ] `.memory_bank/_kit/{manifest.txt,gate-mode.txt,code-ref-ignore.txt}` (новые)
- [ ] `.memory_bank/_intake/session-scratch.md` (новый)

**Починка находок (project-owned):**
- [ ] `core/{architecture,recognition,data-model,email-ingestion,human-decisions,admin-panel,roles-and-access}.md` — tier2-путь → `../domain/…`; bloat-сплит где >3 KB
- [ ] `domain/{product-spec,insurer-recognition,recognition-architecture}.md` — tier1-путь → `../…`
- [ ] `product_brief.md` — bloat-сплит (>3 KB)
- [ ] `project-state.md` — снимок ≤8–12 KB, хронология → `changelog/project-history.md`
- [ ] `core/README.md`, `plans/README.md`, `completed_plans/README.md` — GENERATED-маркеры
- [ ] `INDEX.md`, `CLAUDE.md` — ужать Tier 0 <8 KB; починить INDEX-REF; регенерация decision-tree
- [ ] `plans/recognition-roadmap.md` — статус по расследованию
- [ ] `guides/code-standards.md` — CODE-REF `lib/api/` → реальный путь или ignore
- [ ] `plans/_template.md` — DoD + `title:` (образец из кита)

## Задачи (по этапам HEAL)
- [ ] **Бэкап** первым действием (tar в `~/backups/sib-<дата>.tar.gz`).
- [ ] **B. Кит**: `bash memory-bank-template/upgrade.sh /home/pakar/igor/sib` → разобрать `*.kit-new`
      конфликты вручную (слить локальные правки METADATA/CLEANUP). Прогнать audit write-mode.
- [ ] **B. Смысл**: перенести обновления rules (agent-workflow гейт, memory-discipline, session-scratch),
      README GENERATED-маркеры, `plans/_template.md`.
- [ ] **C. Рехидратация**: починить 26 находок группами (агенты по НЕпересекающимся файлам);
      источники правды: код → decisions.md → project-state.
- [ ] **D. Верификация**: факт-чек `core/*` кодом, обратное покрытие (git-лог careType и др.),
      drill 3–5 вопросов только по INDEX→core. Продукт-баги — списком владельцу.
- [ ] **E. Фиксация**: коммиты+push (секрет-чек), `FLEET.md`, авто-память sib, план → `completed`.

## Критерии приёмки
- [ ] `node memory-bank-template/tools/memory-audit.mjs /home/pakar/igor/sib --check` → «проблем не найдено».
- [ ] `.memory_bank/_kit/VERSION` (или manifest) = 1.3.0; CI-workflow на месте; `_kit/gate-mode.txt=warn`.
- [ ] Все tier-указатели резолвятся (0 BROKEN); Tier 0 < 8 KB; project-state < 12 KB.
- [ ] Секреты не в git (`git check-ignore` на `_secrets/`, `settings.local.json`, `.env*`).
- [ ] Код приложения sib не тронут.
- [ ] `/memory-check` выполнен, audit «чисто».

## Лог выполнения
- 2026-07-22 — план создан (draft) по итогам Этапа 0 (разведка). Ждёт команду «деплой».

## Completion summary
**Сделано (HEAL-конвейер, 2026-07-22):**
- Бэкап банка+.claude+CLAUDE.md+tools → `~/backups/sib-memory-kit-align-2026-07-22.tar.gz`.
- Апгрейд kit-owned v0→**v1.3.0** (`upgrade.sh`): +7 файлов, 7 `.kit-new` сведены (приняты kit-версии).
  Досеяны `_kit/` (VERSION/manifest/gate-mode=warn/code-ref-ignore) и `_intake/session-scratch.md`.
- Перенос смысла в project-owned: гейт `/memory-check` (agent-workflow+CLAUDE), `title:` в plans/_template.
- **Аудит 26→0**: tier-указатели → `../`; NO-TIER1 (recognition↔recognition-architecture,
  email-ingestion↔insurer-recognition); INDEX-REF; CODE-REF (`lib/api/`→allowlist); README GENERATED-маркеры.
- **Разгрузка**: project-state 20→7 KB (хронология → `changelog/project-history.md`); 7 Tier1-сводок
  ужаты; Tier 0 10.1→7.5 KB. Детали → `domain/product-spec.md` §22–23.
- **Верификация против кода** (3 субагента по НЕпересекающимся файлам): все `core/*` сверены, даты
  обновлены. Стадия исправлена «greenfield» → **прод LIVE**.
- `recognition-roadmap` → `partial` (зонтичная карта). CI-гейт `--tier1-max-kb 4` (кириллица).
- tmux `igor` в sib подтверждён идентичным sup2 (`.vscode/settings.json`), tmux 3.6 рабочий.
- FLEET кита обновлён (sib → v1.3.0). Итог: `node tools/memory-audit.mjs . --check --tier1-max-kb 4` → чисто.

**Продукт-находки владельцу (НЕ баги, состояние — код НЕ трогали):** рантайм = каркас+seed-реестр;
конвейер извлечения живёт офлайн в `.mail-intake/` (Python), Inngest = `ping`-каркас, IMAP-поллинг и
RBAC-матрица правки полей и запись в AuditLog — ещё не в рантайме (роадмап S1+). Память это отражает.

## Follow-up work
- [ ] Владельцу: включить гейт `warn→block` (branch protection на main), если нужно enforcement.
- [ ] Периодически гонять `tools/metrics-append.sh /home/pakar/igor/sib` (сбор дрейф-метрик).
