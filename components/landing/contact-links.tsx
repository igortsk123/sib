"use client"

import { MessageCircle, Phone, Send } from "lucide-react"

import { trackGoal } from "@/lib/metrika"
import { Button } from "@/components/ui/button"

// Прямые контакты владельца: «минимум трений, это B2B» (решение 26.07).
// РФ-специфика (проверено с ру-сервера): t.me/wa.me блокированы → Telegram через tg://-диплинк
// (открывает приложение в обход веб-блока), WhatsApp через api.whatsapp.com (работает, 200),
// MAX — персональная ссылка профиля. Акценты кнопок РАВНОЗНАЧНЫЕ, с иконками (правка 26.07).

const CONTACTS = [
  { key: "tg", label: "Telegram", value: "@igortsk", href: "tg://resolve?domain=igortsk", icon: Send },
  { key: "wa", label: "WhatsApp", value: "+7-923-407-9168", href: "https://api.whatsapp.com/send?phone=79234079168", icon: MessageCircle },
  // персональная ссылка профиля владельца (получена 26.07), ведёт прямо в чат
  { key: "max", label: "MAX", value: "+7-923-409-7976", href: "https://max.ru/u/f9LHodD0cOLNCk9w8ASRebnJy16g5FBLvifL1lspgVTwqusbiL0xYcC9r8Q", icon: Phone },
]

export function ContactLinks({ compact = false }: { compact?: boolean }) {
  function click(key: string) {
    trackGoal("lead") // клик по контакту = лид (на этой цели строится оплата за конверсии)
    trackGoal(`contact_${key}`)
  }

  if (compact) {
    return (
      <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {CONTACTS.map((c) => (
          <a key={c.key} href={c.href} onClick={() => click(c.key)} className="inline-flex items-center gap-1.5 whitespace-nowrap underline underline-offset-2 hover:no-underline">
            <c.icon className="size-3.5" aria-hidden />
            {c.label}: {c.value}
          </a>
        ))}
      </span>
    )
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {CONTACTS.map((c) => (
        <Button key={c.key} asChild size="lg" variant="outline">
          <a href={c.href} onClick={() => click(c.key)}>
            <c.icon className="size-4" aria-hidden />
            {c.label} · {c.value}
          </a>
        </Button>
      ))}
    </div>
  )
}
