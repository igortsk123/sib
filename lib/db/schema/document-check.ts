import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { programDocument } from "./program-document"

// ─────────────────────────────────────────────────────────────────────
// Журнал проверок документов условий (требование владельца: «раз в неделю проверяем; если файл
// тот же — фиксируем это в истории, если новый — фиксируем и помечаем, что файл обновлён»).
// Раньше хранилось только last_checked_at, которое затиралось: истории не было вовсе.
// status: unchanged — файл тот же (sha совпал) | updated — новая редакция (создана новая версия)
//         failed — источник недоступен/ошибка | skipped — нечего проверять (нет ссылки)
// ─────────────────────────────────────────────────────────────────────
export const documentCheck = pgTable(
  "document_check",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => programDocument.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    status: text("status").notNull(), // unchanged | updated | failed | skipped
    sha256: text("sha256"), // контрольная сумма скачанного в этот раз
    httpStatus: integer("http_status"),
    sizeBytes: integer("size_bytes"),
    message: text("message"), // текст ошибки или пояснение
    newDocumentId: uuid("new_document_id"), // при updated — созданная версия
  },
  (t) => [
    index("dc_doc_idx").on(t.documentId, t.checkedAt),
    index("dc_status_idx").on(t.status, t.checkedAt),
  ],
)

export type DocumentCheck = typeof documentCheck.$inferSelect
