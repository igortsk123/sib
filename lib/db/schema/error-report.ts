import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { errorReportStatusEnum } from "./enums"
import { guaranteeLetter } from "./guarantee"

// ─────────────────────────────────────────────────────────────────────
// ErrorReport — обратная связь от пользователя по конкретной записи реестра («Сообщить об ошибке»).
// Свободное описание ошибки + опц. почта автора → лог для разбора. При исправлении автору шлём письмо
// (если указал почту). Просмотр/ведение — в админке `/error-reports`.
// ─────────────────────────────────────────────────────────────────────
export const errorReport = pgTable(
  "error_report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    letterId: uuid("letter_id")
      .notNull()
      .references(() => guaranteeLetter.id, { onDelete: "cascade" }),
    message: text("message").notNull(), // свободное описание ошибки
    reporterEmail: text("reporter_email"), // опц. — куда сообщить об исправлении
    status: errorReportStatusEnum("status").notNull().default("open"),
    resolutionNote: text("resolution_note"), // что исправили
    reportedBy: uuid("reported_by"), // кто сообщил (если из сессии)
    resolvedBy: uuid("resolved_by"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }), // когда отправили письмо автору
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("error_report_status_idx").on(t.status), index("error_report_letter_idx").on(t.letterId)],
)

export type ErrorReport = typeof errorReport.$inferSelect
export type NewErrorReport = typeof errorReport.$inferInsert
