import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

// ─────────────────────────────────────────────────────────────────────
// ParseLog — наблюдаемость гибрида «детерминизм + LLM-подстраховка». По каждой разобранной записи:
// чем разобрано (method) и какие поля ПАРСЕР пропустил, а LLM нашла (detGap/llmFilled). Зачем: ловить
// смену форм источником — поле, что раньше брал парсер, «уезжает» в LLM → видно в админке → правим
// правило. Наполняется из пайплайна (parse_log.jsonl) при сидировании.
// ─────────────────────────────────────────────────────────────────────
export const parseLog = pgTable(
  "parse_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    insurer: text("insurer"),
    source: text("source"), // body|pdf|xlsx|xls|rtf|archive
    method: text("method"), // deterministic | deterministic+llm | llm | llm_vision
    rowIndex: integer("row_index"),
    missing: jsonb("missing").$type<string[]>().notNull().default([]), // пусто после всего (нет в документе/LLM не нашла)
    detGap: jsonb("det_gap").$type<string[]>().notNull().default([]), // LLM нашла, парсер НЕТ → цель донастройки
    llmFilled: jsonb("llm_filled").$type<string[]>().notNull().default([]), // дозаполнено LLM-подстраховкой
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("parse_log_insurer_idx").on(t.insurer)],
)

export type ParseLog = typeof parseLog.$inferSelect
export type NewParseLog = typeof parseLog.$inferInsert
