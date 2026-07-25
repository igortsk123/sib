import { date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { insuranceCompany } from "./insurer"

// ─────────────────────────────────────────────────────────────────────
// Документы условий страховых программ (база знаний QR-модуля / уточнения «оплатит ли страховая»).
// ВЕРСИОНИРОВАНИЕ: страховые выпускают НОВЫЕ редакции правил; редакция применяется либо ко ВСЕМ
// полисам, либо только к полисам/договорам, заключённым С ОПРЕДЕЛЁННОЙ ДАТЫ (обычно — с даты приказа).
// Полис живёт по редакции на дату своего заключения → старые версии НЕ удаляем и НЕ перезаписываем:
// новая версия = новая строка, прежняя помечается supersededById. Недельный поллер сверяет sha по
// sourceUrl и добавляет версию при изменении.
// ─────────────────────────────────────────────────────────────────────
export const programDocument = pgTable(
  "program_document",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    insuranceCompanyId: uuid("insurance_company_id").references(() => insuranceCompany.id),
    programName: text("program_name"), // null = документ уровня страховой (общие правила ДМС)
    title: text("title").notNull(), // человекочитаемое название документа
    docKind: text("doc_kind").notNull().default("rules"), // rules | program | clinics_list | memo(от клиники)
    sourceUrl: text("source_url").notNull(), // ГДЕ СМОТРЕТЬ ОБНОВЛЕНИЕ (страница или прямой URL)
    fileUrl: text("file_url"), // прямой URL файла (если отличается от sourceUrl)
    storagePath: text("storage_path"), // локальная копия на сервере (programs/…)
    sha256: text("sha256"),
    fileDate: date("file_date"), // дата документа (из PDF-метаданных/титула)
    downloadedAt: timestamp("downloaded_at", { withTimezone: true }),
    // Применимость редакции: all — ко всем полисам; policies_from_date — к полисам, заключённым
    // с effectiveFrom; unknown — не определено (уточнить по титулу/приказу).
    appliesTo: text("applies_to").notNull().default("unknown"),
    effectiveFrom: date("effective_from"),
    supersededById: uuid("superseded_by_id"), // новая редакция этого документа (цепочка версий)
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }), // недельный поллер
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pd_insurer_idx").on(t.insuranceCompanyId),
    index("pd_source_idx").on(t.sourceUrl),
  ],
)

export type ProgramDocument = typeof programDocument.$inferSelect
