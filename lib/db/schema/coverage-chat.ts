import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

// Чат по правилам покрытия на карточке пациента (владелец 26.07: «просто клиника общается
// с ИИ», история ОБЩАЯ — регистратура спросила, врач видит). Одна лента на пациента в рамках
// клиники; каждое сообщение — строка (author_name показывает, кто спрашивал).
export const coverageChatMessage = pgTable(
  "coverage_chat_message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id"), // клиника-скоуп (как у реестра)
    patientKey: text("patient_key").notNull(), // hex-хэш пациента (ПДн в ключе нет)
    role: text("role").notNull(), // 'user' | 'assistant'
    authorName: text("author_name"), // кто спросил (логин/имя сотрудника; у ИИ — null)
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ccm_patient_idx").on(t.patientKey, t.createdAt)],
)

export type CoverageChatMessage = typeof coverageChatMessage.$inferSelect
