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
  const t = ru.trim()
  // уже ISO (нативный date-инпут) — валидируем и пропускаем
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const m = iso ? null : t.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  const [y, mo, d] = iso ? [+iso[1], +iso[2], +iso[3]] : m ? [+m[3], +m[2], +m[1]] : [0, 0, 0]
  if (!y) return undefined
  // РЕАЛЬНЫЙ календарь: 31.02/29.02 невисокосного и т.п. отбрасываются
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (y < 1900 || y > 2099 || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d)
    return undefined
  return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}
