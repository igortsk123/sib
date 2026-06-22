---
tier: 1
topic: data-model
scope: Модель данных — сущности и ключевые поля
tier2: domain/product-spec.md
updated: 2026-06-21
importance: high
source: domain/product-spec.md §7,13
status: working
source_of_truth: supporting
last_verified: 2026-06-21
review_after: ""
---

# Модель данных — Tier 1 сводка

> Гипотеза первой схемы (Drizzle). Точные поля уточняются на реальных письмах → ADR при расхождении.

## Сущности (§13)
- **EmailMessage** — ящик, Message-ID, From/To/Cc, Subject, дата получения, исходная дата, тело text/html,
  признак пересылки + исходный отправитель/тема (D5), статус обработки.
- **Attachment** — email_message_id, имя/тип/размер/hash, путь, нужен ли пароль, распакован ли,
  extracted_text, OCR_text, ошибка обработки.
- **GuaranteeLetter** — email_message_id, sourceEmailIds[] (все источники: письмо ГП + письма-пароли),
  attachment_id, organization_id (мультитенант-скоуп), rowIndex (строка Excel-реестра), страховая.
  Пациент: `patientFullName`, `patientBirthDate`, `policyNumber`, `policySeries`. Документ: `letterNumber`
  (№ ГП), `caseNumber` (№ обращения/направления), `contractNumber` (№ договора), `docType` (тип, enum),
  `approvalStatus` (статус), `services`. Даты/лимиты: `letterDate`, `coverageFrom`/`coverageTo` (период
  обслуживания), `validUntil` (срок действия письма), `amountLimit` (ограничение-сумма), `conditions`
  (ограничения-условия), `insurerComment`/`clinicComment`. Распознавание: `source` (body/pdf/xlsx/xls/rtf/
  archive), `method` (deterministic/deterministic+llm/llm/llm_vision), `confidence`, `needsReview`,
  `reviewNote` (имена сомнительных полей → понятный текст через `lib/review-hints.ts`), `reviewStatus`,
  `reviewedBy`/`reviewedAt`. Поля добавлялись по ADR D12/D13/D14/**D15** (миграции 0002–0007).
- **ParseLog** (ADR D15, миграция 0008) — наблюдаемость гибрида: по записи `method`, `detGap` (поля, что
  LLM нашла, а парсер НЕТ → цель донастройки), `llmFilled`, `missing`, insurer/source. Сидируется из
  `parse_log.jsonl`. Страница `/parse-log` — ловить смену форм источником.
- **Enums:** `approvalStatusEnum` (approved/denied/detach/enroll/**annul**/partial/need_info/need_approval/
  unknown), `docTypeEnum` (guarantee/enroll/detach/annul/referral/denial/info_request/archive_password/service/
  other), `reviewStatusEnum`. Подписи — `lib/letter-status.ts` (STATUS_LABELS, DOC_TYPE_LABELS).
- **InsuranceCompany** — название + варианты написания, домены/типовые email отправителей, правила
  обработки, активность (редактируемый справочник — ~12+ компаний, §4).
- **User** — организация, ФИО, email, роль, статус, даты (см. `core/roles-and-access.md`).
- **AuditLog** — пользователь, действие, объект, старое/новое значение, время, IP/устройство (ADR D4).

## Принципы
- Хранить и **оригиналы**, и извлечённые поля (проверяемость распознавания).
- Каждое распознанное поле — со значением уверенности + ссылкой на фрагмент-источник.
- Связи: EmailMessage 1—N Attachment; GuaranteeLetter ←→ EmailMessage/Attachment; дубли — пометка (D6).
- Файлы вложений (ПДн) — вне БД, в защищённом хранилище; в БД путь/hash (`.claude/rules/guardrails.md`).

**Tier 2:** `domain/product-spec.md` §7 (поля), §13 (сущности).
