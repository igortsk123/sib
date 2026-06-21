import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { userStatusEnum } from "./enums"

// ─────────────────────────────────────────────────────────────────────
// AppUser — пользователь (бриф §8). Вход по ТЕЛЕФОНУ через Telegram (как sup2).
// `isPlatformAdmin` — платформенный админ (заводит клиники, вне клиники). Роль
// внутри клиники — в `membership` (user↔organization+role). `telegramUserId` —
// связь с Telegram-аккаунтом (для проактивной выдачи кода). Пароль — опц. хэш.
// ─────────────────────────────────────────────────────────────────────
export const appUser = pgTable(
  "app_user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull().unique(), // ключ входа
    name: text("name"),
    email: text("email"),
    telegramUserId: text("telegram_user_id"),
    isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
    passwordHash: text("password_hash"),
    status: userStatusEnum("status").notNull().default("active"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("user_phone_idx").on(t.phone)],
)

export type AppUser = typeof appUser.$inferSelect
export type NewAppUser = typeof appUser.$inferInsert
