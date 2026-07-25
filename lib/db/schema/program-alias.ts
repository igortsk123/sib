import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"

import { insuranceCompany } from "./insurer"

// ─────────────────────────────────────────────────────────────────────
// Маппинг «строка из письма → программа страховой» (план coverage-resolver).
// В guarantee_letter.services страховые пишут РАЗНОЕ: СОГАЗ/Ингосстрах/РЕСО/Альфа — названия
// программ («"Специализированная стоматология"»), ВСК/Совкомбанк/Зетта — конкретные услуги
// («удаление ретинированных зубов»). kind различает эти два случая, aliasNorm — нормализованная
// строка (нижний регистр, без кавычек/лишних пробелов), по которой идёт точный матч.
// ─────────────────────────────────────────────────────────────────────
export const programAlias = pgTable(
  "program_alias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    insuranceCompanyId: uuid("insurance_company_id")
      .notNull()
      .references(() => insuranceCompany.id, { onDelete: "cascade" }),
    aliasNorm: text("alias_norm").notNull(), // нормализованная строка из письма
    programName: text("program_name"), // канон из coverage_rule.program_name; null для kind='service'
    kind: text("kind").notNull().default("program"), // program | service
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("program_alias_ck_alias_uq").on(t.insuranceCompanyId, t.aliasNorm),
    index("pa_ck_idx").on(t.insuranceCompanyId),
  ],
)

export type ProgramAlias = typeof programAlias.$inferSelect
