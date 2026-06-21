import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

// ─────────────────────────────────────────────────────────────────────
// InsuranceCompany — РЕДАКТИРУЕМЫЙ реестр страховых (бриф §4). Главный
// механизм идентификации (ADR D10): домен отправителя → страховая.
// `domains` сидируется реальными доменами корпуса (domain/insurer-recognition.md):
// домен ≠ название (calltravel.eu=Балта, luchi.ru=Лучшее, astrovolga.ru=Астро-Волга...).
// `rules` — место для per-insurer особенностей (формат, где данные, пароль архива).
// ─────────────────────────────────────────────────────────────────────
export const insuranceCompany = pgTable("insurance_company", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // каноничное название (ключ идемпотентного сида)
  aliases: text("aliases").array().notNull().default([]), // варианты написания
  domains: text("domains").array().notNull().default([]), // домены отправителей (ключ идентификации)
  typicalEmails: text("typical_emails").array().notNull().default([]),
  // Особенности обработки (формат данных, where: body|pdf|excel|archive, пароль и т.п.).
  rules: jsonb("rules").$type<Record<string, unknown>>().notNull().default({}),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export type InsuranceCompany = typeof insuranceCompany.$inferSelect
export type NewInsuranceCompany = typeof insuranceCompany.$inferInsert
