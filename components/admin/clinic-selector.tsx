"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { setActiveOrg } from "@/lib/server/registry/scope-actions"

const ALL = "__all__"

// Переключатель клиники для платформенного админа (контекст реестра).
export function ClinicSelector({
  clinics,
  current,
}: {
  clinics: { id: string; name: string }[]
  current: string | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function onChange(v: string) {
    start(async () => {
      await setActiveOrg(v === ALL ? "" : v)
      router.refresh()
    })
  }

  return (
    <Select value={current ?? ALL} onValueChange={onChange} disabled={pending}>
      <SelectTrigger className="w-56 gap-2">
        <Building2 className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Все клиники</SelectItem>
        {clinics.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
