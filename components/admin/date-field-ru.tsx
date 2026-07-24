"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

import { Input } from "@/components/ui/input"
import { RU_DATE_PATTERN } from "@/lib/format"

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"]
const DOW = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"]

// Дата «дд.мм.гггг»: ручной ввод с маской + СВОЙ русский календарь (неделя с Пн).
// Сабмитится текстовое ru-значение — сервер валидирует isoFromRu по реальному календарю.
export function DateFieldRu({ name, defaultValue, className }: { name: string; defaultValue?: string; className?: string }) {
  const [v, setV] = useState(defaultValue ?? "")
  const [open, setOpen] = useState(false)
  const today = new Date()
  const [ym, setYm] = useState<[number, number]>([today.getFullYear(), today.getMonth()])
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  const mask = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 8)
    let out = d.slice(0, 2)
    if (d.length > 2) out += "." + d.slice(2, 4)
    if (d.length > 4) out += "." + d.slice(4, 8)
    return out
  }

  const toggle = () => {
    const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
    if (m) setYm([+m[3], +m[2] - 1])
    setOpen((o) => !o)
  }

  const [y, mo] = ym
  const first = new Date(y, mo, 1)
  const lead = (first.getDay() + 6) % 7 // Пн=0
  const days = new Date(y, mo + 1, 0).getDate()
  const sel = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  const selKey = sel ? `${+sel[3]}-${+sel[2] - 1}-${+sel[1]}` : ""

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
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
        aria-label="Открыть календарь"
        onClick={toggle}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <CalendarDays className="size-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-card p-2 shadow-lg">
          <div className="mb-1 flex items-center justify-between">
            <button type="button" onClick={() => setYm(mo === 0 ? [y - 1, 11] : [y, mo - 1])}
              className="rounded p-1 hover:bg-muted" aria-label="Предыдущий месяц"><ChevronLeft className="size-4" /></button>
            <span className="text-sm font-medium">{MONTHS[mo]} {y}</span>
            <button type="button" onClick={() => setYm(mo === 11 ? [y + 1, 0] : [y, mo + 1])}
              className="rounded p-1 hover:bg-muted" aria-label="Следующий месяц"><ChevronRight className="size-4" /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
            {DOW.map((d) => (<div key={d} className="py-1">{d}</div>))}
          </div>
          <div className="grid grid-cols-7 text-center text-sm">
            {Array.from({ length: lead }).map((_, i) => (<div key={`e${i}`} />))}
            {Array.from({ length: days }).map((_, i) => {
              const d = i + 1
              const isSel = selKey === `${y}-${mo}-${d}`
              const isToday = today.getFullYear() === y && today.getMonth() === mo && today.getDate() === d
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setV(`${String(d).padStart(2, "0")}.${String(mo + 1).padStart(2, "0")}.${y}`)
                    setOpen(false)
                  }}
                  className={`rounded py-1 hover:bg-muted ${isSel ? "bg-primary text-primary-foreground hover:bg-primary" : isToday ? "border border-primary/60" : ""}`}
                >
                  {d}
                </button>
              )
            })}
          </div>
          <button type="button" className="mt-1 w-full rounded py-1 text-xs text-muted-foreground hover:bg-muted"
            onClick={() => { setV(""); setOpen(false) }}>Очистить</button>
        </div>
      )}
    </div>
  )
}
