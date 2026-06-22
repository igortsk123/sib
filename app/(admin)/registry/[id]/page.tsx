import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { AlertTriangle, ChevronLeft, FileText, Paperclip } from "lucide-react"

import { reviewMessage } from "@/lib/review-hints"

import { resolveRegistryScope } from "@/lib/server/scope"
import { getLetter } from "@/lib/server/registry/queries"
import { STATUS_LABELS, SOURCE_LABELS, docTypeLabel } from "@/lib/letter-status"
import { CARE_TYPE_LABELS } from "@/lib/care-type"
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
  const scope = await resolveRegistryScope()
  if (!scope.user) redirect("/login")
  const { id } = await params
  const data = await getLetter(id)
  if (!data) notFound()
  const l = data.letter
  // Скоуп: сотрудник клиники / админ с выбранной клиникой видит только свою.
  if (scope.orgId === "__none__") notFound()
  if (scope.orgId && l.organizationId !== scope.orgId) notFound()

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
            <span className="font-medium">Требует проверки глазами.</span> {reviewMessage(l.reviewNote)}
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
            <Field label="№ договора" value={l.contractNumber} />
            <Field label="Тип" value={docTypeLabel(l.docType, l.approvalStatus)} />
            <Field label="Направление" value={CARE_TYPE_LABELS[l.careType ?? ""] ?? "—"} />
            <Field label="Страховая" value={data.insurer} />
            <Field label="Дата письма" value={l.letterDate} />
            <Field
              label="Период обслуживания"
              value={l.coverageFrom || l.coverageTo ? `${l.coverageFrom ?? "…"} — ${l.coverageTo ?? "…"}` : null}
            />
            <Field label="Действует до" value={l.validUntil} />
            <Field label="Лимит" value={l.amountLimit} />
            <Field label="Ограничение" value={l.conditions} />
            <Field
              label="Услуги"
              value={Array.isArray(l.services) && l.services.length ? l.services.filter(Boolean).join(", ") : "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">О записи</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Страховая" value={data.insurer} />
            <Field label="Источник" value={SOURCE_LABELS[l.source ?? ""] ?? l.source} />
            <Field label="Получено" value={data.sourceEmails[0]?.receivedAt ? new Date(data.sourceEmails[0].receivedAt).toLocaleString("ru") : "—"} />
            <Field label="Метод" value={l.method === "deterministic" ? "Из таблицы" : l.method === "llm_vision" ? "LLM (скан)" : l.method === "llm" ? "LLM" : "—"} />
            <Field label="Писем-источников" value={String(data.sourceEmails.length)} />
            <Field label="Вложений" value={String(data.attachments.length)} />
          </CardContent>
        </Card>
      </div>

      {/* Единая сверка: все источники записи подряд (письма + вложения) */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Источники для сверки</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {data.sourceEmails.map((e, i) => (
            <div key={e.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {e.docType === "archive_password" ? "🔑 Письмо с паролем" : i === 0 ? "✉ Письмо страховой" : "✉ Сопутствующее письмо"}
                </span>
                <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <a href={`/api/original/email/${e.id}?raw=1`}>Скачать .eml</a>
                </Button>
              </div>
              <iframe
                src={`/api/original/email/${e.id}`}
                className="h-96 w-full rounded-md border border-border bg-white"
                title="Письмо"
              />
            </div>
          ))}
          {data.attachments.map((a) => (
            <div key={a.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  {a.ext === "pdf" ? <FileText className="size-4" /> : <Paperclip className="size-4" />}
                  {a.filename ?? `Вложение .${a.ext}`}
                </span>
                <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <a href={`/api/original/attachment/${a.id}`} target="_blank" rel="noreferrer">Открыть в новой вкладке</a>
                </Button>
              </div>
              {a.ext === "pdf" && (
                <iframe
                  src={`/api/original/attachment/${a.id}`}
                  className="h-[600px] w-full rounded-md border border-border"
                  title={a.filename ?? "PDF"}
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}
