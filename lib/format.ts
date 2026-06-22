// Единый формат дат для отображения — ДД.ММ.ГГГГ (везде: реестр, карточка, Excel).
// В БД даты хранятся ISO (YYYY-MM-DD, тип date). На вход принимаем строку ISO или Date.
export function ruDate(v?: string | Date | null): string {
  if (!v) return ""
  const s = typeof v === "string" ? v : v.toISOString()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(v)
}
