"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { requestCode, verifyCode } from "@/lib/server/auth/actions"

export function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<"phone" | "code">("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [deepLink, setDeepLink] = useState("")
  const [hint, setHint] = useState("")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  function onRequest(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    start(async () => {
      const res = await requestCode(phone)
      if (!res.ok) return setError(res.error)
      setDeepLink(res.value.deepLink)
      setHint(
        res.value.sentToBot
          ? "Код отправлен в Telegram-бот. Введите его ниже."
          : res.value.deepLink
            ? "Откройте бота, нажмите «Поделиться номером» — он пришлёт код."
            : "Демо-вход: введите тестовый код.",
      )
      setStep("code")
    })
  }

  function onVerify(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    start(async () => {
      const res = await verifyCode(phone, code)
      if (!res.ok) return setError(res.error)
      router.replace("/")
      router.refresh()
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {step === "phone" ? (
          <form onSubmit={onRequest} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 999 123-45-67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Отправка…" : "Получить код в Telegram"}
            </Button>
          </form>
        ) : (
          <form onSubmit={onVerify} className="flex flex-col gap-4">
            {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
            {deepLink && (
              <a href={deepLink} target="_blank" rel="noreferrer">
                <Button type="button" variant="outline" className="w-full gap-2">
                  <Send className="size-4" /> Открыть Telegram-бот
                </Button>
              </a>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Код из Telegram</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="1234"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Проверка…" : "Войти"}
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setStep("phone")
                setCode("")
                setError("")
              }}
            >
              ← Изменить номер
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
