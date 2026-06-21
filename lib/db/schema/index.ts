// ─────────────────────────────────────────────────────────────────────
// Доменная схема БД (Drizzle). Сущности — бриф §13, ADR D10.
// Связи: EmailMessage 1—N Attachment; EmailMessage 1—N GuaranteeLetter (реестры);
// GuaranteeLetter → InsuranceCompany/Attachment; ProcessingQueue → письмо/запись.
// Схема — гипотеза v0, уточняется на реальных письмах (source-of-truth).
// ─────────────────────────────────────────────────────────────────────
export * from "./enums"
export * from "./insurer"
export * from "./email"
export * from "./attachment"
export * from "./guarantee"
export * from "./queue"
export * from "./user"
export * from "./audit"
