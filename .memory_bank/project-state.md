---
tier: 1
topic: project-state
scope: Снимок «где проект сейчас» — точка ресинхронизации при /clear и resume
tier2: ""
updated: 2026-07-22
importance: high
source: manual
status: working
source_of_truth: canonical
last_verified: 2026-07-22
review_after: ""
---

# Project State — снимок состояния

> Обновлять после каждого крупного изменения. Это первое, что читает агент при resume/`/clear`.

## Режим работы
**AUTOPILOT включён** (владелец, 2026-07-22): агент автономно план→выполнение→деплой без ожидания команды.
Обязательны: зелёный гейт, память+`/memory-check`, эскалация только по `core/human-decisions.md`, guardrails
(секреты/ПДн/read-only почты). Правило — `.claude/rules/agent-workflow.md`.

## Где
- **Прод:** ✅ https://sib.docon.pro (каркас, health=200). Сервер `193.160.208.41` (тот же, что sup2),
  контейнер `sib-frontend`:3006 + `sib-db`:5434, сеть `sib-net`. Изолировано от sup2 (ADR D8).
- **Репозиторий:** `igortsk123/sib` (приватный), локально `/home/pakar/igor/sib`, чекаут на сервере `/opt/sib`.
  Deploy-ключ `sib_deploy` (алиас `github-sib`).
- **Деплой:** push в `main` → systemd-таймер `sib-deploy.timer` (~2 мин): build (гейт typecheck+test) →
  migrate → swap → smoke `/api/health` → rollback. Полный playbook — `deployment.md`.
- **Окружение / сервер:** долгосрочное размещение ПДн / оператор данных — всё ещё решение владельца (ADR D4).

## Сейчас (снимок 2026-07-22)
Прод **LIVE**, идут пост-MVP правки по распознаванию/UX. Полная хронология достижений (Phase 0,
админ-панель, демо-реестр, серия правок точности) — `changelog/project-history.md`.

- ✅ **Каркас + инфра + CI/CD** (ADR D1/D3/D8/D9): Next 16/React 19/TS/Tailwind4/shadcn(WFM-токены)/
  Drizzle/Zod/vitest/exceljs/Inngest; push→systemd-деплой (гейт typecheck+test+build → migrate → swap →
  smoke → rollback), контейнер за https://sib.docon.pro, отдельный `sib-db`, изоляция от sup2.
- ✅ **Почта Яндекс** перенесена из sup2, IMAP XOAUTH2 рабочий (ADR D2); креды — `_secrets/ACCESS.md`.
- ✅ **Админ-панель + доступ** (ADR D11): Telegram-вход (телефон→код, `doconpro_bot`), мультитенант
  (платформенный админ → клиники → сотрудники), закрытый вход (медданные), RBAC. Bootstrap-админ `+79234097976`.
- ✅ **Реестр ГП из корпуса** (ADR D12–D14): 51 письмо → **~70 записей** на проде («Клиника Сибирская»).
  Гибрид извлечения (детерм. ядро + LLM `gpt-5.4-mini` на поля, скан→vision), confidence + пометка
  «Проверить», оригиналы на сервере (`/api/original`), Excel-выгрузка. ФИО ~92%+ покрытие.
- ✅ **Форматы**: PDF(pdftotext)/RTF(striprtf)/XLS(xlrd)/XLSX(SheetJS)/ZIP+пароль/DOC(olefile); официальные
  наименования страховых (name+aliases), даты ДД.ММ.ГГГГ (`lib/format.ts`).
- ✅ **careType** (амбулатория/стоматология/**combined**, миграция 0013): классификация LLM по УСЛУГЕ
  (`lib/care-type.ts`), фильтр+колонка «Направление» в реестре/Excel.
- ✅ **Шаблоны типов + журнал распознавания**: `doc_template` (27 предзаполненных образцов), журнал в
  контексте шаблона (чем разобрано / что добирал ИИ), `parse_log` (ловить смену форм источником),
  «Сообщить об ошибке» (`error_report` + `/error-reports`). Правка почты сотрудника инлайн.
- 🛠 **Инцидент диска решён**: build cache 17GB→100% диск; деплой-скрипт теперь держит кэш ≤3GB.
- ✅ **S1 — ЖИВОЙ АВТО-ПРИЁМ работает** (2026-07-22): systemd-таймер `sib-intake.timer` на сервере каждые
  **3 мин**: `fetch_live.py inc` (инкрементально по UID, курсор `live/state.json`, READ-ONLY) → `extract`+`enrich`
  (poppler + xlrd/striprtf/olefile + LLM на сервере) → файлы в `/opt/sib-storage` → `docker exec … npm run db:ingest`
  (upsert без wipe, дедуп по rawSha256, self-healing: новый тип/шаблон → авто-создание `doc_template(status=new)` +
  `needsReview` + алерт в `error_report`). Раннер — `/opt/sib-intake/{run.sh,.mail-intake/*.py,.env.local(600)}`,
  units `/etc/systemd/system/sib-intake.{service,timer}`, лог `/opt/sib-intake/intake.log`. Валидирован на реальных
  письмах (3 новых вставлено, 28 дедупнуто). Код в репо: `lib/db/seed/{ingest,shared}.ts`, `db:ingest`.
- ✅ **Полный бэкофилл 2026 в проде** (2026-07-22): оба ящика read-only → fetch по доменам страховых →
  **2249 писем → 9660 записей ГП**, 2507 вложений, 52 шаблона типов, журнал разбора 9660 строк. Покрытие на
  реальных данных: **ФИО 9621/9660 (99.6%), полис 9561/9660 (99%)**, к проверке 417. careType: ambulatory 3271,
  combined 3271, dentistry 3118 (⚠ на строках реестров fallback-классификатор даёт ровный 3-раздел — требует
  уточнения, LLM careType гонялся только на одиночных). Фикс сида: `parse_log` вставка чанками по 1000
  (9660×9 колонок превышало лимит параметров PG 65535). Модель обогащения — `gpt-5.4-mini` (~740 LLM-вызовов).
- 🔑 **Боевые ящики подключены** (2026-07-22): `registratura@cl-sib.ru` (INBOX ~34.6k) и `dms@cl-sib.ru`
  (INBOX ~2.9k) — **app-пароли Яндекс**, IMAP-логин ПРОВЕРЕН (imap.yandex.ru:993, оба ✓). Креды — только в
  `.env.local` (MAILBOX_*) и `_secrets/ACCESS.md` (600, gitignored). Разблокирует **S1 (приём)** и **SMTP**
  (те же app-пароли, smtp.yandex.ru:465). Открытые вопросы владельцу: какой ящик несёт письма страховых
  (вероятно dms@), приём только НОВЫХ или бэкофилл и с какой даты.
- 🚫 **ПОЧТА — СТРОГО READ-ONLY** (правило владельца, ABSOLUTE): забор только на чтение. НИКОГДА не удалять,
  не помечать `\Deleted`, не EXPUNGE, не перемещать/менять письма. IMAP SELECT — только `readonly=True`.
- ⏭ **Дальше:** IMAP-забор прод-пайплайна (роадмап S1 — тулзы pdftotext/striprtf/xlrd/olefile/libreoffice
  в Docker; read-only); правка полей в карточке; per-insurer механические шаблоны; vision на реальные сканы.
- ✅ **Стоматологический bulk-экспорт** (2026-07-22): кнопка «Стоматология (загрузка)» в реестре →
  `careTypeIn=dentistry,combined` (все с зубным покрытием, 6136 записей) → `reestr-stomatologiya-<дата>.xlsx`
  для массовой загрузки в стомат-систему. Фильтр-множество `careTypeIn` в `queries.ts`/export.
- 🚫 **SMTP-отправка — решение владельца (2026-07-22): пока НЕ слать с боевых ящиков** (правило read-only).
  Уведомления/алерты остаются в логе как pending (`notifyErrorFixed`). Отдельный SMTP-адрес — по решению позже.

## Ключевые решения (зафиксировано — полные ADR в `decisions.md`)
- D1 — стек Next.js/TS/Drizzle/Inngest. D2 — Яндекс IMAP-доступ подтверждён. D3 — конституция
  самопроверяемости. D4 — ПДн/мед.тайна = повышенная безопасность. D5 — двойная пересылка как
  первоклассный кейс. D6 — дедуп без авто-удаления. D7 — типы простые + Zod на границах.
  **D8 — инфра/CI-CD методология sup2 при полной изоляции. D9 — UI-базлайн = shadcn radix из WFM.**

## Что НЕ делаем сейчас (вне scope)
См. `product_brief.md` → Scope-out (МИС-интеграция, авто-ответы, ЭЦП, BI, мобилка, авто-обучение).

## Open questions
Бриф §19 — кол-во и тип рабочих ящиков, app-password/IMAP-доступ, обязательные поля Excel и шаблон
импорта, нужно ли распознавать диагнозы/суммы/коды услуг, 2FA, хостинг ПДн/оператор данных, сроки
хранения. Все собраны в `core/human-decisions.md`. **Решать с владельцем, не угадывать.**

## Policies (как ведём разработку)
- **Вертикальные срезы** UI→БД; срез не готов без unit + e2e на критический поток.
- **Гейт перед «готово»:** typecheck + lint + unit + integration + e2e + build (красный = не готово).
- **Внешние вызовы** (IMAP, OpenAI, файлы) — только в обёртке: типизированный результат + ретрай
  через Inngest + заданное user-facing состояние ошибки.
- **Отклонение от спеки → ADR** в `decisions.md`. **Ветки** `feature/<area>`. **PR/срез** = зелёный CI +
  обновлённая память, если что-то отклонилось.
- Полная конституция — `.claude/rules/engineering-principles.md`.
