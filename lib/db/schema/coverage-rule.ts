import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { insuranceCompany } from "./insurer"
import { programDocument } from "./program-document"

// ─────────────────────────────────────────────────────────────────────
// L2 MART конвейера покрытия: структурированные правила, извлечённые агентом из document_text
// ВРУЧНУЮ (без внешних LLM — решение владельца); методика: .memory_bank/guides/coverage-extraction-prompt.md.
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
    // Уровень правила: program — из программы страхования, insurer — из общих правил СК.
    // Программа сильнее общих правил (у Ингосстраха общие правила запрещают стоматологию
    // «кроме случаев, прямо предусмотренных Программой») — см. resolveCoverage.
    scopeLevel: text("scope_level").notNull().default("insurer"), // program | insurer
    // Правило СК, которое программа вправе переопределить («кроме случаев, предусмотренных Программой»).
    overridable: boolean("overridable").notNull().default(false),
    // Правило перенесено на новую редакцию документа автоматически (carry_rules.py) и ещё не
    // сверено агентом с новым текстом. Показывается пользователю как «редакция обновилась».
    needsReview: boolean("needs_review").notNull().default(false),
    carriedFromDocumentId: uuid("carried_from_document_id").references(() => programDocument.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("cr_doc_idx").on(t.documentId),
    index("cr_insurer_idx").on(t.insuranceCompanyId),
    index("cr_program_idx").on(t.insuranceCompanyId, t.programName),
    index("cr_review_idx").on(t.needsReview),
  ],
)

export type CoverageRule = typeof coverageRule.$inferSelect
