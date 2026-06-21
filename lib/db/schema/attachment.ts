import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { emailMessage } from "./email"

// ─────────────────────────────────────────────────────────────────────
// Attachment — вложение письма (бриф §13.2). ИНВАРИАНТ: файл хранится на
// сервере (`storagePath` + `sha256`), в БД — ссылка, не сам файл. Форматы
// корпуса: pdf (текст/скан), .xls/.xlsx (реестры), rtf, zip(шифр). Поля под
// архивы (`needsPassword`/`isExtracted`) и извлечённый текст (`extractedText`/`ocrText`).
// ─────────────────────────────────────────────────────────────────────
export const attachment = pgTable(
  "attachment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailMessageId: uuid("email_message_id")
      .notNull()
      .references(() => emailMessage.id, { onDelete: "cascade" }),
    filename: text("filename"),
    contentType: text("content_type"),
    ext: text("ext"), // нормализованное расширение (pdf/xls/xlsx/rtf/zip/...)
    size: integer("size"),
    sha256: text("sha256"),
    storagePath: text("storage_path"), // путь на сервере вне git
    needsPassword: boolean("needs_password").notNull().default(false),
    isExtracted: boolean("is_extracted").notNull().default(false),
    isScanned: boolean("is_scanned").notNull().default(false), // PDF-скан → OCR
    extractedText: text("extracted_text"),
    ocrText: text("ocr_text"),
    extractError: text("extract_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("attachment_email_idx").on(t.emailMessageId),
    index("attachment_sha_idx").on(t.sha256),
  ],
)

export type Attachment = typeof attachment.$inferSelect
export type NewAttachment = typeof attachment.$inferInsert
