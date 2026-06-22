// Единый формат дат для отображения — ДД.ММ.ГГГГ (везде: реестр, карточка, Excel).
// В БД даты хранятся ISO (YYYY-MM-DD, тип date). На вход принимаем строку ISO или Date.
export function ruDate(v?: string | Date | null): string {
  if (!v) return ""
  const s = typeof v === "string" ? v : v.toISOString()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(v)
}

// Обратное: «дд.мм.гггг» → ISO «гггг-мм-дд» с валидацией диапазонов. Невалидно/пусто → undefined.
// Регэксп для HTML-атрибута pattern (та же валидация на клиенте при submit).
export const RU_DATE_PATTERN = "(0[1-9]|[12][0-9]|3[01])\\.(0[1-9]|1[0-2])\\.(19|20)[0-9]{2}"
export function isoFromRu(ru?: string | null): string | undefined {
  if (!ru) return undefined
  const m = ru.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return undefined
  const d = +m[1], mo = +m[2], y = +m[3]
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2099) return undefined
  return `${m[3]}-${m[2]}-${m[1]}`
}
