// Нормализация телефона к виду +7XXXXXXXXXX (РФ). Возвращает null, если не похоже на номер.
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null
  let d = input.replace(/\D/g, "")
  if (d.length === 11 && d.startsWith("8")) d = "7" + d.slice(1)
  if (d.length === 10) d = "7" + d // без кода страны → РФ
  if (d.length === 11 && d.startsWith("7")) return "+" + d
  return null
}
