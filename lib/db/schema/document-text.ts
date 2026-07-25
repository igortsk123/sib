import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { programDocument } from "./program-document"

// ─────────────────────────────────────────────────────────────────────
// L1 STAGING конвейера покрытия (план coverage-pipeline): извлечённый ТЕКСТ документов условий,
// постранично. Перезаливается при новой версии документа (sha родителя меняется → строки этого
// documentId пересоздаются). Из этого слоя LLM-экстрактор строит срез coverage_rule (L2).
// ─────────────────────────────────────────────────────────────────────
export const documentText = pgTable(
  "document_text",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => programDocument.id, { onDelete: "cascade" }),
    page: integer("page").notNull(), // 1-based; для HTML-снапшотов page=1
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("dt_doc_idx").on(t.documentId)],
)

export type DocumentText = typeof documentText.$inferSelect
