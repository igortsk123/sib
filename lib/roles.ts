// Подписи ролей — общий модуль (используют и server-страницы, и client-формы).
export type ClinicRole = "owner" | "dms" | "doctor" | "registry" | "registry_senior"

export const ROLE_LABELS: Record<ClinicRole, string> = {
  owner: "Администратор клиники",
  dms: "Специалист ДМС",
  doctor: "Врач",
  registry: "Регистратура",
  registry_senior: "Старший регистратуры",
}

export type StaffRole = Exclude<ClinicRole, "owner">
