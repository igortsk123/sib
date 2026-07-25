import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { insuranceCompany } from "./insurer"
import { programDocument } from "./program-document"

// ─────────────────────────────────────────────────────────────────────
// L2 MART конвейера покрытия: структурированные правила, ИЗВЛЕЧЁННЫЕ LLM из document_text.
// Перезаливка при обновлении документа: каскад по documentId (новая версия → свои правила).
// Ответ ИИ (L3) собирает контекст отсюда, а не из 200-страничных PDF.
// ─────────────────────────────────────────────────────────────────────
export const coverageRule = pgTable(
  "coverage_rule",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => programDocument.id, { onDelete: "cascade" }),
    insuranceCompanyId: uuid("insurance_company_id").references(() => insuranceCompany.id),
    programName: text("program_name"), // null = правило уровня страховой (общие исключения)
    serviceClass: text("service_class").notNull(), // «стоматология-хирургия», «имплантация», …
    servicePattern: text("service_pattern"), // ключевые слова услуги («удаление зуб»)
    verdict: text("verdict").notNull(), // covered | excluded | needs_approval | conditional
    conditionText: text("condition_text"), // «только после травмы в период договора»
    limitAmount: text("limit_amount"),
    clause: text("clause"), // «п. 3.2.7»
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("cr_doc_idx").on(t.documentId), index("cr_insurer_idx").on(t.insuranceCompanyId)],
)

export type CoverageRule = typeof coverageRule.$inferSelect
