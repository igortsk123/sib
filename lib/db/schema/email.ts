import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { docTypeEnum, emailStatusEnum } from "./enums"

// ─────────────────────────────────────────────────────────────────────
// EmailMessage — исходное письмо (бриф §13.1). ИНВАРИАНТ: оригинал письма
// (`.eml`) всегда хранится на сервере (`rawStoragePath` + `rawSha256`) — ссылка
// на источник не теряется (бриф §7.4/§17). Двойная пересылка (ADR D5) — поля
// `isForwarded` + `originalFrom/originalSubject/originalDate` (заполняются для теста;
// в проде письма прямые). Дедуп — по `messageId`/контенту (ADR D6, помечаем).
// ─────────────────────────────────────────────────────────────────────
export const emailMessage = pgTable(
  "email_message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id"), // клиника-владелец (мультитенант-скоуп)
    mailbox: text("mailbox").notNull(), // ящик-получатель (4 в проде)
    messageId: text("message_id"), // RFC Message-ID (дедуп)
    fromAddr: text("from_addr"),
    toAddr: text("to_addr"),
    ccAddr: text("cc_addr"),
    subject: text("subject"),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    originalDate: timestamp("original_date", { withTimezone: true }),
    bodyText: text("body_text"),
    bodyHtml: text("body_html"),
    isForwarded: boolean("is_forwarded").notNull().default(false),
    originalFrom: text("original_from"), // реальный отправитель (страховая) при пересылке
    originalSubject: text("original_subject"),
    // Оригинал на сервере (ИНВАРИАНТ ссылки на источник).
    rawStoragePath: text("raw_storage_path"), // путь к .eml вне git
    rawSha256: text("raw_sha256"),
    insuranceCompanyId: uuid("insurance_company_id"), // определённая страховая (S2)
    status: emailStatusEnum("status").notNull().default("received"),
    docType: docTypeEnum("doc_type"),
    isPossibleDuplicate: boolean("is_possible_duplicate").notNull().default(false),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Реестр сортируется по received_at desc (join gl→em) — без индекса сорт всей таблицы (владелец: тормозит)
    index("em_received_idx").on(t.receivedAt),
    index("email_org_idx").on(t.organizationId),
    index("email_mailbox_idx").on(t.mailbox),
    index("email_message_id_idx").on(t.messageId),
    index("email_status_idx").on(t.status),
  ],
)

export type EmailMessage = typeof emailMessage.$inferSelect
export type NewEmailMessage = typeof emailMessage.$inferInsert
