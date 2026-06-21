import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { orgStatusEnum } from "./enums"

// ─────────────────────────────────────────────────────────────────────
// Organization — клиника (тенант). Платформенный админ заводит клиники;
// внутри клиники владелец (membership.role='owner') заводит сотрудников.
// Все письма/записи привязаны к клинике (мультитенантность).
// ─────────────────────────────────────────────────────────────────────
export const organization = pgTable(
  "organization",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    status: orgStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("org_name_idx").on(t.name)],
)

export type Organization = typeof organization.$inferSelect
export type NewOrganization = typeof organization.$inferInsert
