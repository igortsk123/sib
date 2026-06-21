// ─────────────────────────────────────────────────────────────────────
// Доменная схема БД (Drizzle). Сущности — бриф §13, ADR D10; мультитенантность
// и auth — паттерн sup2. Связи: Organization 1—N Membership N—1 AppUser;
// EmailMessage 1—N Attachment; EmailMessage 1—N GuaranteeLetter (реестры).
// Схема — гипотеза v0, уточняется на реальных письмах (source-of-truth).
// ─────────────────────────────────────────────────────────────────────
export * from "./enums"
export * from "./organization"
export * from "./user"
export * from "./membership"
export * from "./auth"
export * from "./insurer"
export * from "./email"
export * from "./attachment"
export * from "./guarantee"
export * from "./queue"
export * from "./audit"
