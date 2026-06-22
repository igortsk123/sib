"use client"

import { useState } from "react"

import { isoFromRu, RU_DATE_PATTERN } from "@/lib/format"
import { Input } from "@/components/ui/input"

// Маска даты дд.мм.гггг: при вводе цифр сами подставляются точки, лишнее отсекается.
// Проверка: подсветка, если введено, но дата невалидна (мес>12, день>31, год вне диапазона).
function mask(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8)
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join(".")
}

export function DateMaskInput({
  name,
  defaultValue,
  className,
}: {
  name: string
  defaultValue?: string
  className?: string
}) {
  const [v, setV] = useState(defaultValue ?? "")
  const invalid = v.length > 0 && !isoFromRu(v)
  return (
    <Input
      name={name}
      value={v}
      onChange={(e) => setV(mask(e.target.value))}
      inputMode="numeric"
      maxLength={10}
      placeholder="дд.мм.гггг"
      pattern={RU_DATE_PATTERN}
      title="Формат: дд.мм.гггг (день 01–31, месяц 01–12, год 1900–2099)"
      aria-invalid={invalid}
      className={`${className ?? ""} ${invalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
    />
  )
}
