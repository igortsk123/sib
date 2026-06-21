import { pgEnum } from "drizzle-orm/pg-core"

// ─────────────────────────────────────────────────────────────────────
// Перечисления домена. Значения — гипотеза v0, уточняются на реальных
// письмах (ADR D10/source-of-truth). Расширять аддитивно (expand-only).
// ─────────────────────────────────────────────────────────────────────

// Статус обработки входящего письма (конвейер ingestion → recognition).
export const emailStatusEnum = pgEnum("email_status", [
  "received", // забрано по IMAP, ещё не разобрано
  "parsing", // в обработке (Inngest)
  "parsed", // разобрано, записи созданы
  "manual_review", // ушло в очередь ручной проверки
  "error", // ошибка обработки
  "irrelevant", // нерелевантное/служебное
])

// Тип письма (бриф §6.4).
export const docTypeEnum = pgEnum("doc_type", [
  "guarantee", // гарантийное письмо
  "denial", // отказ
  "info_request", // запрос доп. информации
  "archive_password", // письмо с паролем к архиву
  "service", // служебное
  "other",
])

// Статус согласования услуги страховой (бриф §7.3).
export const approvalStatusEnum = pgEnum("approval_status", [
  "approved", // согласовано
  "denied", // отказано
  "partial", // частично согласовано
  "need_info", // требуется доп. информация
  "need_approval", // требуется доп. согласование
  "unknown", // не определён
])

// Статус проверки распознанной записи человеком.
export const reviewStatusEnum = pgEnum("review_status", [
  "auto", // авто-распознано, не проверено
  "confirmed", // подтверждено сотрудником
  "edited", // исправлено вручную
  "rejected", // отклонено
])

// Причина попадания в очередь ручной проверки (бриф §9.4).
export const queueReasonEnum = pgEnum("queue_reason", [
  "low_confidence",
  "missing_patient",
  "missing_policy",
  "unknown_insurer",
  "archive_no_password", // архив без найденного пароля
  "password_no_archive", // пароль без найденного архива
  "duplicate",
  "conflict",
  "multi_patient", // несколько пациентов/ГП в одном файле
  "extract_error",
  "other",
])

export const queueStatusEnum = pgEnum("queue_status", ["open", "in_progress", "resolved"])

// Роли (бриф §8, ADR D4 RBAC).
export const userRoleEnum = pgEnum("user_role", [
  "owner", // владелец/админ организации
  "dms", // специалист по ДМС (основной)
  "doctor", // врач
  "registry", // регистратура
  "registry_senior", // старший регистратуры
])

export const userStatusEnum = pgEnum("user_status", ["active", "blocked"])
