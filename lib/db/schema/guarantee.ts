import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
// (sourceEmailIds — список id всех писем-источников записи: письмо + связанные письма-пароли)

import { attachment } from "./attachment"
import { emailMessage } from "./email"
import { insuranceCompany } from "./insurer"
import { approvalStatusEnum, careTypeEnum, docTypeEnum, reviewStatusEnum } from "./enums"

// ─────────────────────────────────────────────────────────────────────
// GuaranteeLetter — распознанное гарантийное письмо (бриф §13.3).
// КЛЮЧЕВОЕ (ADR D10): связь `EmailMessage 1—N GuaranteeLetter` — Excel-реестры
// (РЕСО 17–32 строки, Альфа 2–11) дают МНОГО записей из одного письма; `rowIndex`
// — строка реестра. `confidence` — уверенность по полю (jsonb: { field: 0..1 }).
// `services` — список услуг (jsonb). Ссылки на оригинал письма/вложения — инвариант.
// ─────────────────────────────────────────────────────────────────────
export const guaranteeLetter = pgTable(
  "guarantee_letter",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id"), // клиника-владелец (мультитенант-скоуп реестра)
    emailMessageId: uuid("email_message_id")
      .notNull()
      .references(() => emailMessage.id, { onDelete: "cascade" }),
    // Все письма-источники (письмо ГП + связанные письма-пароли) — для единой ссылки сверки.
    sourceEmailIds: uuid("source_email_ids").array().notNull().default([]),
    attachmentId: uuid("attachment_id").references(() => attachment.id, { onDelete: "set null" }),
    insuranceCompanyId: uuid("insurance_company_id").references(() => insuranceCompany.id),
    rowIndex: integer("row_index"), // строка Excel-реестра (если из реестра)

    // Пациент (бриф §7.1)
    patientFullName: text("patient_full_name"),
    patientBirthDate: date("patient_birth_date"),
    policyNumber: text("policy_number"),
    policySeries: text("policy_series"),

    // Документ / согласование (бриф §7.2–7.4)
    letterNumber: text("letter_number"), // № гарантийного письма (№ ГП)
    caseNumber: text("case_number"), // № обращения/направления
    contractNumber: text("contract_number"), // № договора страхования (напр. F514Z/045/7393S/24)
    docType: docTypeEnum("doc_type"), // тип документа: guarantee|enroll|detach|annul|referral|…
    careType: careTypeEnum("care_type"), // направление: амбулатория|стоматология (план care-type-split)
    approvalStatus: approvalStatusEnum("approval_status").notNull().default("unknown"),
    services: jsonb("services").$type<unknown[]>().notNull().default([]),
    letterDate: date("letter_date"),
    // Период обслуживания/действия полиса «с/по» (Альфа date_from/date_to, ВСК полис с-по).
    // Иногда задана только дата «по» (открытого начала нет). validUntil — отдельно (валидность ГП).
    coverageFrom: date("coverage_from"),
    coverageTo: date("coverage_to"),
    validUntil: date("valid_until"),
    amountLimit: text("amount_limit"), // ограничение-сумма (Астро-Волга «в пределах суммы»)
    conditions: text("conditions"), // ограничение-условия (Балта «Покрываем… ВАЖНО…», манипуляции)
    insurerComment: text("insurer_comment"),
    clinicComment: text("clinic_comment"),

    // Распознавание / проверка
    source: text("source"), // body|pdf|xlsx|xls|rtf|archive
    method: text("method"), // как извлечено: deterministic|llm|llm_vision
    confidence: jsonb("confidence").$type<Record<string, number>>().notNull().default({}),
    // Статус извлечения ПО ПОЛЮ: found | absent | unreadable. Отличает «проверили файл+тело — данных нет»
    // (absent → «нет данных») от «не смогли распознать / тех.сбой» (unreadable → «не распознано»).
    // Экспорт и карточка переводят статус в человекочитаемый текст (не кладём маркер в само поле).
    fieldStatus: jsonb("field_status").$type<Record<string, string>>().notNull().default({}),
    // Дубль (ADR D6: помечаем, НЕ удаляем): страховые пере-шлют один список повторно
    // (Ингосстрах — с разбегом ~16 мин). duplicateOfId — первая (каноническая) запись.
    isDuplicate: boolean("is_duplicate").notNull().default(false),
    duplicateOfId: uuid("duplicate_of_id"),
    // Низкая уверенность → человеку: перепроверить перед переносом в систему клиники.
    needsReview: boolean("needs_review").notNull().default(false),
    reviewNote: text("review_note"), // причина пометки (какие поля сомнительны)
    reviewStatus: reviewStatusEnum("review_status").notNull().default("auto"),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("gl_org_idx").on(t.organizationId),
    index("gl_email_idx").on(t.emailMessageId),
    index("gl_insurer_idx").on(t.insuranceCompanyId),
    index("gl_policy_idx").on(t.policyNumber),
    index("gl_patient_idx").on(t.patientFullName),
    index("gl_letter_no_idx").on(t.letterNumber),
  ],
)

export type GuaranteeLetter = typeof guaranteeLetter.$inferSelect
export type NewGuaranteeLetter = typeof guaranteeLetter.$inferInsert
