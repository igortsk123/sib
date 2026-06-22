"use client"

import { useRef, useState, useTransition } from "react"
import { AlertTriangle, Plus, Sparkles, Trash2 } from "lucide-react"

import { DOC_TYPE_LABELS, METHOD_LABELS } from "@/lib/letter-status"
import { FIELD_HINTS } from "@/lib/review-hints"
import { addDocTemplate, deleteDocTemplate, extractGold } from "@/lib/server/templates/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type TemplateRow = {
  id: string
  docType: string
  status: string
  sampleStoragePath: string | null
  sampleFilename: string | null
  sampleSubject: string | null
  hasText: boolean
  goldJson: Record<string, unknown> | null
  drift: number
  records: number // записей этого типа (журнал разбора)
  methods: Record<string, number> // чем разобрано (Парсер/Парсер+ИИ/ИИ)
  gaps: Record<string, number> // что добирал ИИ (поля)
}

const STATUS: Record<string, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  new: { label: "новый", variant: "outline" },
  llm_parsed: { label: "эталон LLM", variant: "secondary" },
  parser_ready: { label: "парсер готов", variant: "secondary" },
  drift: { label: "дрейф", variant: "destructive" },
}

const TYPE_OPTIONS = ["guarantee", "enroll", "detach", "annul", "referral", "denial", "info_request", "service", "other"]

export function DocTypeTemplates({ insurerId, templates }: { insurerId: string; templates: TemplateRow[] }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const fd = new FormData(e.currentTarget)
    fd.set("insurerId", insurerId)
    start(async () => {
      const res = await addDocTemplate(fd)
      if (!res.ok) return setError(res.error)
      formRef.current?.reset()
      setOpen(false)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Типы документов (шаблоны распознавания)</h2>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" /> Добавить тип
        </Button>
      </div>

      {open && (
        <Card className="p-4">
          <form ref={formRef} onSubmit={add} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Тип документа</Label>
                <select name="docType" required className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">— выберите —</option>
                  {TYPE_OPTIONS.map((t) => (<option key={t} value={t}>{DOC_TYPE_LABELS[t] ?? t}</option>))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Образец (файл)</Label>
                <input name="file" type="file" className="text-sm file:mr-2 file:rounded file:border file:border-input file:bg-muted file:px-2 file:py-1 file:text-xs" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Тема письма</Label>
              <Input name="subject" placeholder="Тема письма (как в почте)" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Текст письма (тело)</Label>
              <textarea name="text" rows={4} placeholder="Вставьте тело письма-образца…" className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>{pending ? "Сохранение…" : "Сохранить тип"}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
            </div>
          </form>
        </Card>
      )}

      {templates.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Шаблоны типов не заведены.</Card>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((t) => (
            <TemplateCard key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function TemplateCard({ t }: { t: TemplateRow }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  const st = STATUS[t.status] ?? STATUS.new

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{DOC_TYPE_LABELS[t.docType] ?? t.docType}</span>
        <Badge variant={st.variant}>{st.label}</Badge>
        {t.drift > 0 && (
          <Badge variant="outline" className="gap-1 text-warning">
            <AlertTriangle className="size-3" /> {t.drift} на разбор
          </Badge>
        )}
        {t.sampleStoragePath && (
          <a href={`/api/original/template/${t.id}`} className="text-xs text-primary underline" target="_blank" rel="noreferrer">
            файл{t.sampleFilename ? `: ${t.sampleFilename}` : ""}
          </a>
        )}
        {t.hasText && <span className="text-xs text-muted-foreground">есть текст письма</span>}
        <div className="ml-auto flex gap-2">
          <Button
            size="sm" variant="outline" className="gap-1" disabled={pending}
            onClick={() => { setError(""); start(async () => { const r = await extractGold(t.id); if (!r.ok) setError(r.error) }) }}
          >
            <Sparkles className="size-3.5" /> {pending ? "…" : "Эталон LLM"}
          </Button>
          <Button
            size="sm" variant="ghost" disabled={pending}
            onClick={() => { if (confirm("Удалить тип?")) start(async () => { await deleteDocTemplate(t.id) }) }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      {t.sampleSubject && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium">Тема образца:</span> {t.sampleSubject}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {/* Журнал разбора этого шаблона (в контексте типа документа) */}
      <div className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-xs">
        <div className="font-medium text-foreground">Журнал разбора</div>
        {t.records > 0 ? (
          <div className="mt-1 flex flex-col gap-1 text-muted-foreground">
            <div>
              Записей: <span className="font-medium text-foreground">{t.records}</span> · чем разобрано:{" "}
              {Object.entries(t.methods)
                .sort((a, b) => b[1] - a[1])
                .map(([m, c]) => `${METHOD_LABELS[m] ?? m}: ${c}`)
                .join("  ·  ")}
            </div>
            <div>
              Что добирал ИИ:{" "}
              {Object.keys(t.gaps).length
                ? Object.entries(t.gaps)
                    .sort((a, b) => b[1] - a[1])
                    .map(([f, c]) => `${FIELD_HINTS[f] ?? f} ×${c}`)
                    .join(", ")
                : "— (парсер находит всё сам)"}
            </div>
          </div>
        ) : (
          <div className="mt-1 text-muted-foreground">Пока нет разобранных записей этого типа.</div>
        )}
      </div>

      {t.goldJson && (
        <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
          {JSON.stringify(t.goldJson, null, 2)}
        </pre>
      )}
    </Card>
  )
}
