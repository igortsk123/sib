import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

// Заявка с публичного лендинга /land (кампании Директа, план ads-b2b-semantics-review).
// ПДн минимальны (имя + контакт человека из клиники) — согласие чекбоксом, политика /land/privacy.
export const lead = pgTable(
  "lead",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    clinic: text("clinic"),
    contact: text("contact").notNull(), // телефон или email — как удобнее заявителю
    comment: text("comment"),
    utm: jsonb("utm").$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lead_created_idx").on(t.createdAt)],
)

export type Lead = typeof lead.$inferSelect
