"use client"

import { MonitorPlay } from "lucide-react"

import { trackGoal } from "@/lib/metrika"

// Демо — главный CTA лендинга (владелец 26.07: «выдели как баннер»). Клиент-компонент,
// чтобы клик считался целью Метрики «demo»: /demo отдаёт 307 без HTML, URL-цель там
// не срабатывает — измеряем сам клик (аудит 26.07: главная кнопка была слепой зоной).
export function DemoBanner({ label = "Посмотреть демо-версию" }: { label?: string }) {
  return (
    <a
      href="/demo"
      onClick={() => trackGoal("demo")}
      className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground shadow-lg transition hover:opacity-90"
    >
      <MonitorPlay className="size-6" aria-hidden /> {label}
    </a>
  )
}
