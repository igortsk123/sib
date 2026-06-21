import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

// ─────────────────────────────────────────────────────────────────────
// AuditLog — журнал действий (бриф §13.6, ADR D4). Кто/что/над чем/старое→новое.
// Пишем все правки распознанных данных и доступ к оригиналам. На сервере клиники
// логирование полное разрешено (ADR D10) — секреты не пишем.
// ─────────────────────────────────────────────────────────────────────
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"),
    action: text("action").notNull(), // напр. "edit_field", "confirm", "export", "view_original"
    objectType: text("object_type"), // напр. "guarantee_letter", "email_message"
    objectId: uuid("object_id"),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_object_idx").on(t.objectType, t.objectId),
    index("audit_user_idx").on(t.userId),
  ],
)

export type AuditLog = typeof auditLog.$inferSelect
export type NewAuditLog = typeof auditLog.$inferInsert
