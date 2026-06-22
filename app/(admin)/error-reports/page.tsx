import Link from "next/link"
import { redirect } from "next/navigation"
import { Inbox } from "lucide-react"

import { getCurrentUser } from "@/lib/server/auth/session"
import { listErrorReports } from "@/lib/server/error-reports/queries"
import { ruDate } from "@/lib/format"
import { PageHeader } from "@/components/admin/page-header"
import { ResolveReport } from "@/components/admin/resolve-report"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

export const dynamic = "force-dynamic"

const STATUS: Record<string, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  open: { label: "новый", variant: "destructive" },
  fixed: { label: "исправлено", variant: "secondary" },
  dismissed: { label: "не ошибка", variant: "outline" },
}

export default async function ErrorReportsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!user.isPlatformAdmin) redirect("/registry")
  const reports = await listErrorReports()

  return (
    <>
      <PageHeader
        title="Сообщения об ошибках"
        description="Обратная связь от пользователей по записям реестра. Исправили — автору уходит письмо (если указал почту)."
      />
      {reports.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Inbox className="size-10 text-muted-foreground" aria-hidden />
          <div className="text-sm font-medium">Сообщений об ошибках нет</div>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {reports.map((r) => {
            const st = STATUS[r.status] ?? STATUS.open
            return (
              <Card key={r.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={st.variant}>{st.label}</Badge>
                      <Link href={`/registry/${r.letterId}`} className="text-sm font-medium text-primary hover:underline">
                        {r.patient ?? "запись"}
                      </Link>
                      <span className="text-xs text-muted-foreground">{ruDate(r.createdAt as unknown as string)}</span>
                    </div>
                    <p className="max-w-2xl whitespace-pre-wrap text-sm">{r.message}</p>
                    {r.reporterEmail && (
                      <span className="text-xs text-muted-foreground">
                        почта автора: {r.reporterEmail}
                        {r.status === "fixed" ? (r.notifiedAt ? " · уведомлён" : " · письмо в очереди (SMTP не настроен)") : ""}
                      </span>
                    )}
                    {r.resolutionNote && <span className="text-xs text-muted-foreground">исправление: {r.resolutionNote}</span>}
                  </div>
                  {r.status === "open" && <ResolveReport id={r.id} hasEmail={Boolean(r.reporterEmail)} />}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
