---
tier: 1
topic: data-model
scope: Модель данных — сущности и ключевые поля
tier2: ../domain/product-spec.md
updated: 2026-07-23
importance: high
source: domain/product-spec.md §22 (факт кода), §7,§13
status: working
source_of_truth: supporting
last_verified: 2026-07-23
review_after: ""
---

# Модель данных — Tier 1 сводка

> Реальная схема Drizzle (`lib/db/schema/*`, 15 файлов). **Все поля/enum-значения — §22.**
> Схема — гипотеза v0, уточняется на письмах → ADR.

## Сущности (сверено с кодом)
- **EmailMessage** (`email_message`) — письмо + `isForwarded`/`originalFrom/Subject` (двойная
  пересылка D5) + `rawStoragePath`/`rawSha256` (инвариант ссылки на `.eml`), status, docType.
- **Attachment** (`attachment`) — FK email: `sha256`, `storagePath`, `needsPassword`, `isScanned`
  (скан→OCR), `extractedText`/`ocrText`.
- **GuaranteeLetter** (`guarantee_letter`) — запись реестра. `EmailMessage 1—N GuaranteeLetter`
  (D10): Excel-реестр = много записей из письма, `rowIndex` — строка. Поля: пациент; документ
  (`letterNumber`/`caseNumber`/`contractNumber`/`docType`/`careType`/`approvalStatus`/`services`);
  даты/лимиты; распознавание (`source`/`method`/`confidence`/`needsReview`/`reviewStatus`);
  **`fieldStatus`** jsonb `found|absent|unreadable` — «нет данных»≠«не распознано» (D18, мигр.0014);
  **`isDuplicate`/`duplicateOfId`** — пометка дублей, не удаление (D20, мигр.0015; `dupKey` shared.ts).
- **ProcessingQueue** (`processing_queue`) — очередь ручной проверки: `reason`, `correlationKey`
  (архив↔пароль, D10).
- **ParseLog** (`parse_log`, D15) — наблюдаемость гибрида: `method`/`detGap`/`llmFilled`/`missing`
  (`/parse-log`). **DocTemplate** (`doc_template`, D15) — образец типа × страховая → `goldJson`.
  **ErrorReport** (`error_report`) — «Сообщить об ошибке» в карточке.
- **InsuranceCompany** (`insurance_company`) — справочник (~12+): `domains` — ключ идентификации
  отправителя (D10); aliases/typicalEmails/`rules`.
- **Мультитенант + auth:** `organization`/`app_user`/`membership`; `session`/`login_attempt`/
  `telegram_contact` (вход телефон→код Telegram). **AuditLog** (`audit_log`, D4).

Enums (`enums.ts`, значения — §22): email_status, doc_type, approval_status (incl. `annul`),
care_type, review_status, queue_*, doc_template_status, user_role. Хелперы:
`lib/letter-status.ts`, `lib/review-hints.ts`, `lib/care-type.ts`.

## Принципы
- Хранить **оригиналы** + извлечённое; поле — с `confidence` + ссылкой; дубли — пометка (D6).
  Файлы (ПДн) вне БД — путь/hash. Связь: EmailMessage 1—N Attachment / 1—N GuaranteeLetter.

**Tier 2:** `domain/product-spec.md` §22 (все поля/enum), §7 (поля), §13 (сущности брифа).
