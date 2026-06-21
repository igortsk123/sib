import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { userRoleEnum, userStatusEnum } from "./enums"

// ─────────────────────────────────────────────────────────────────────
// User — сотрудник клиники (бриф §8, §13.5). Роли — RBAC (ADR D4). Пароль —
// хэш (никогда не открытым). Полноценная авторизация — отдельный срез; здесь
// каркас сущности для аудита/назначений.
// ─────────────────────────────────────────────────────────────────────
export const appUser = pgTable(
  "app_user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: text("full_name"),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash"),
    role: userRoleEnum("role").notNull().default("dms"),
    status: userStatusEnum("status").notNull().default("active"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("user_email_idx").on(t.email)],
)

export type AppUser = typeof appUser.$inferSelect
export type NewAppUser = typeof appUser.$inferInsert
