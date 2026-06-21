import { index, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core"

import { appUser } from "./user"
import { organization } from "./organization"
import { membershipStatusEnum, userRoleEnum } from "./enums"

// ─────────────────────────────────────────────────────────────────────
// Membership — участие пользователя в клинике с ролью (мультитенантность,
// паттерн sup2). owner → заводит сотрудников; dms/doctor/registry — сотрудники.
// Один пользователь — одна запись на клинику (unique). status: invited → active.
// ─────────────────────────────────────────────────────────────────────
export const membership = pgTable(
  "membership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("membership_user_org").on(t.userId, t.organizationId),
    index("membership_org_idx").on(t.organizationId),
  ],
)

export type Membership = typeof membership.$inferSelect
export type NewMembership = typeof membership.$inferInsert
