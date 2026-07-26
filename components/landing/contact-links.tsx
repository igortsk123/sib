"use client"

import { trackGoal } from "@/lib/metrika"
import { Button } from "@/components/ui/button"

// Прямые контакты владельца — «минимум трений, это B2B» (решение 26.07).
// РФ-специфика (проверено с ру-сервера): t.me/wa.me блокированы → Telegram через tg://-диплинк
// (открывает приложение в обход веб-блока), WhatsApp через api.whatsapp.com (работает, 200),
// MAX — номер текстом. Ники и номера ВСЕГДА дублируются текстом — человек найдёт вручную.

const CONTACTS = [
  { key: "tg", label: "Telegram", value: "@igortsk", href: "tg://resolve?domain=igortsk" },
  { key: "wa", label: "WhatsApp", value: "+7-923-407-9168", href: "https://api.whatsapp.com/send?phone=79234079168" },
  // персональная ссылка профиля владельца (получена 26.07) — прямо в чат
  { key: "max", label: "MAX", value: "+7-923-409-7976", href: "https://max.ru/u/f9LHodD0cOLNCk9w8ASRebnJy16g5FBLvifL1lspgVTwqusbiL0xYcC9r8Q" },
]

export function ContactLinks({ compact = false }: { compact?: boolean }) {
  function click(key: string) {
    trackGoal("lead") // клик по контакту = лид (на этой цели строится оплата за конверсии)
    trackGoal(`contact_${key}`)
  }

  if (compact) {
    return (
      <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {CONTACTS.map((c) => (
          <a key={c.key} href={c.href} onClick={() => click(c.key)} className="whitespace-nowrap underline underline-offset-2 hover:no-underline">
            {c.label}: {c.value}
          </a>
        ))}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {CONTACTS.map((c, i) => (
          <Button key={c.key} asChild size="lg" variant={i === 0 ? "default" : "outline"}>
            <a href={c.href} onClick={() => click(c.key)}>
              {c.label} · {c.value}
            </a>
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Пишите напрямую: Telegram <b>@igortsk</b> · WhatsApp <b>+7-923-407-9168</b> · MAX <b>+7-923-409-7976</b>
      </p>
    </div>
  )
}
