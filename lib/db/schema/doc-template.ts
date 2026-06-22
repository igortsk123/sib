import { index, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"

import { docTemplateStatusEnum, docTypeEnum } from "./enums"
import { insuranceCompany } from "./insurer"

// ─────────────────────────────────────────────────────────────────────
// DocTemplate — шаблон ТИПА ДОКУМЕНТА в разрезе страховой (план admin-doctype-templates, ADR D15).
// Владелец/админ заводит тип, грузит образец → LLM-эталон (gold_json) → видно дрейф (parse_log по типу).
// Образец (ПДн) — в защищённом хранилище (как оригиналы), в БД путь/имя. Авто-сборка парсера — v2 (после S1).
// ─────────────────────────────────────────────────────────────────────
export const docTemplate = pgTable(
  "doc_template",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    insuranceCompanyId: uuid("insurance_company_id")
      .notNull()
      .references(() => insuranceCompany.id, { onDelete: "cascade" }),
    docType: docTypeEnum("doc_type").notNull(),
    sampleStoragePath: text("sample_storage_path"), // относительный путь в STORAGE_DIR (templates/<id>.<ext>)
    sampleFilename: text("sample_filename"),
    sampleText: text("sample_text"), // текст образца (для LLM-эталона, пока нет извлечения PDF/Excel в проде)
    goldJson: jsonb("gold_json").$type<Record<string, unknown>>(), // эталон LLM (gpt-5.5)
    status: docTemplateStatusEnum("status").notNull().default("new"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("doc_template_insurer_type").on(t.insuranceCompanyId, t.docType),
    index("doc_template_insurer_idx").on(t.insuranceCompanyId),
  ],
)

export type DocTemplate = typeof docTemplate.$inferSelect
export type NewDocTemplate = typeof docTemplate.$inferInsert
