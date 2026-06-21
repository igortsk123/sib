import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { AlertTriangle, ChevronLeft, FileText, Mail, Paperclip } from "lucide-react"

import { getCurrentUser } from "@/lib/server/auth/session"
import { getLetter } from "@/lib/server/registry/queries"
import { STATUS_LABELS, SOURCE_LABELS } from "@/lib/letter-status"
import { PageHeader } from "@/components/admin/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? "—"}</span>
    </div>
  )
}

export default async function LetterCardPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) redirect("/login")
  const { id } = await params
  const data = await getLetter(id)
  if (!data) notFound()
  const l = data.letter

  return (
    <>
      <Link href="/registry" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Реестр
      </Link>
      <PageHeader
        title={l.patientFullName ?? "Гарантийное письмо"}
        description={`${data.insurer ?? "Страховая не определена"} · ${SOURCE_LABELS[l.source ?? ""] ?? l.source ?? ""}`}
        action={
          <Badge variant={l.approvalStatus === "approved" ? "secondary" : "outline"} className="text-sm">
            {STATUS_LABELS[l.approvalStatus] ?? l.approvalStatus}
          </Badge>
        }
      />

      {l.needsReview && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <span className="font-medium">Требует проверки глазами</span> — сверьте с оригиналом перед
            переносом в систему клиники.{l.reviewNote ? ` Причина: ${l.reviewNote}.` : ""}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Распознанные поля</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Пациент" value={l.patientFullName} />
            <Field label="Дата рождения" value={l.patientBirthDate} />
            <Field label="Полис" value={l.policyNumber} />
            <Field label="№ обращения" value={l.caseNumber} />
            <Field label="№ ГП" value={l.letterNumber} />
            <Field label="Страховая" value={data.insurer} />
            <Field label="Дата письма" value={l.letterDate} />
            <Field label="Действует до" value={l.validUntil} />
            <Field label="Лимит" value={l.amountLimit} />
            <Field
              label="Услуги"
              value={Array.isArray(l.services) && l.services.length ? l.services.filter(Boolean).join(", ") : "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Источник</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Оригинал письма и вложения хранятся на сервере. Можно открыть для сверки.
            </p>
            {data.emailId && (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="justify-start gap-2">
                  <a href={`/api/original/email/${data.emailId}`} target="_blank" rel="noreferrer">
                    <Mail className="size-4" /> Открыть письмо (просмотр)
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <a href={`/api/original/email/${data.emailId}?raw=1`}>Скачать .eml</a>
                </Button>
              </div>
            )}
            {data.attachments.map((a) => (
              <Button key={a.id} asChild variant="outline" className="justify-start gap-2">
                <a href={`/api/original/attachment/${a.id}`} target="_blank" rel="noreferrer">
                  {a.ext === "pdf" ? <FileText className="size-4" /> : <Paperclip className="size-4" />}
                  {a.filename ?? `Вложение .${a.ext}`}
                </a>
              </Button>
            ))}
            {data.attachments.length === 0 && (
              <p className="text-sm text-muted-foreground">Вложений нет — данные в теле письма.</p>
            )}
            <div className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
              Ящик: {data.mailbox ?? "—"} · Получено: {data.receivedAt ? new Date(data.receivedAt).toLocaleString("ru") : "—"}
              {l.reviewStatus === "auto" && " · авто-распознавание (не проверено)"}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
