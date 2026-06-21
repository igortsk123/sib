import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { emailMessage } from "./email"
import { guaranteeLetter } from "./guarantee"
import { queueReasonEnum, queueStatusEnum } from "./enums"

// ─────────────────────────────────────────────────────────────────────
// ProcessingQueue — очередь ручной проверки (бриф §9.4). Сюда попадают
// письма/записи с низкой уверенностью, без обязательных полей, не понятой
// страховой, архив-без-пароля / пароль-без-архива (ADR D10 stateful-корреляция),
// дубли/конфликты. Спорное не теряется, а ждёт сотрудника ДМС.
// ─────────────────────────────────────────────────────────────────────
export const processingQueue = pgTable(
  "processing_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailMessageId: uuid("email_message_id").references(() => emailMessage.id, {
      onDelete: "cascade",
    }),
    guaranteeLetterId: uuid("guarantee_letter_id").references(() => guaranteeLetter.id, {
      onDelete: "cascade",
    }),
    reason: queueReasonEnum("reason").notNull(),
    status: queueStatusEnum("status").notNull().default("open"),
    assignedTo: uuid("assigned_to"),
    notes: text("notes"),
    // Ключ для связки архив↔пароль (№ ГП / отправитель+тема) — ADR D10.
    correlationKey: text("correlation_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    index("queue_status_idx").on(t.status),
    index("queue_reason_idx").on(t.reason),
    index("queue_corr_idx").on(t.correlationKey),
  ],
)

export type ProcessingQueue = typeof processingQueue.$inferSelect
export type NewProcessingQueue = typeof processingQueue.$inferInsert
