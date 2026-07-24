"use client"

import { useRef, useState } from "react"
import { CalendarDays } from "lucide-react"

import { Input } from "@/components/ui/input"
import { RU_DATE_PATTERN } from "@/lib/format"

// Дата «дд.мм.гггг»: ручной ввод с маской + календарик (нативный пикер заполняет поле).
// Сабмитится ТЕКСТОВОЕ значение (ru-формат) — сервер валидирует isoFromRu по реальному календарю.
export function DateFieldRu({ name, defaultValue, className }: { name: string; defaultValue?: string; className?: string }) {
  const [v, setV] = useState(defaultValue ?? "")
  const pickerRef = useRef<HTMLInputElement>(null)

  const mask = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 8)
    let out = d.slice(0, 2)
    if (d.length > 2) out += "." + d.slice(2, 4)
    if (d.length > 4) out += "." + d.slice(4, 8)
    return out
  }

  const openPicker = () => {
    const el = pickerRef.current
    if (!el) return
    // предзаполнить пикер текущим значением (дд.мм.гггг → ISO)
    const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
    el.value = m ? `${m[3]}-${m[2]}-${m[1]}` : ""
    if (typeof el.showPicker === "function") el.showPicker()
    else el.click()
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <Input
        name={name}
        value={v}
        onChange={(e) => setV(mask(e.target.value))}
        placeholder="дд.мм.гггг"
        inputMode="numeric"
        pattern={RU_DATE_PATTERN}
        title="Дата в формате дд.мм.гггг"
        className="h-9 pr-9"
      />
      <button
        type="button"
        aria-label="Выбрать дату в календаре"
        onClick={openPicker}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <CalendarDays className="size-4" />
      </button>
      {/* скрытый нативный пикер — источник календаря */}
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute right-0 top-full h-0 w-0 opacity-0"
        onChange={(e) => {
          const m = e.target.value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
          if (m) setV(`${m[3]}.${m[2]}.${m[1]}`)
        }}
      />
    </div>
  )
}
