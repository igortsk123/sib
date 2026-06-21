import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { appUser } from "./user"

// ─────────────────────────────────────────────────────────────────────
// Auth-таблицы (порт sup2). Вход: телефон → код в Telegram → сессия.
// ─────────────────────────────────────────────────────────────────────

// Сессии (после подтверждения телефона кодом). Cookie `sib_session`.
export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
)

// Попытки входа: телефон → код. token связывает deep-link и /start в боте.
export const loginAttempt = pgTable(
  "login_attempt",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    code: text("code").notNull(),
    token: text("token").notNull().unique(), // t.me/<bot>?start=<token>
    chatId: text("chat_id"),
    verified: boolean("verified").notNull().default(false),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("login_attempt_phone_idx").on(t.phone)],
)

// Запомненный номер Telegram-аккаунта: telegram_user_id → phone (делится своим контактом).
// Дальше код выдаётся без повторного «Поделиться номером».
export const telegramContact = pgTable("telegram_contact", {
  telegramUserId: text("telegram_user_id").primaryKey(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type Session = typeof session.$inferSelect
export type LoginAttempt = typeof loginAttempt.$inferSelect
