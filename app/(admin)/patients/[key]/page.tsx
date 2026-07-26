import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { listChatMessages } from "@/lib/server/coverage/chat"
import { resolveCoverage } from "@/lib/server/coverage/resolve"
import { patientCard } from "@/lib/server/patients/queries"
import { resolveRegistryScope } from "@/lib/server/scope"
import { CoverageChatPanel } from "@/components/admin/coverage-chat"
import { CoverageRules } from "@/components/admin/coverage-rules"
import { PageHeader } from "@/components/admin/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const STATUS_LABEL: Record<string, string> = {
  enroll: "прикрепление",
  detach: "открепление",
  approved: "гарантийное письмо",
  partial: "частично согласовано",
  need_info: "нужны сведения",
  denied: "отказ",
  annul: "аннулировано",
  unknown: "не определён",
}

const d = (value: string | null) => (value ? new Date(value).toLocaleDateString("ru") : "—")

// Карточка пациента: что действует СЕЙЧАС (программа, правила, гарантийные письма)
// и вся история писем по нему. Ключ в адресе — хэш, персональные данные в URL не попадают.
export default async function PatientPage({ params }: { params: Promise<{ key: string }> }) {
  const scope = await resolveRegistryScope()
  if (!scope.user) redirect("/login")
  const { key } = await params
  const card = await patientCard(key, scope.orgId)
  if (!card) notFound()

  const { state } = card
  const coverage = state.insuranceCompanyId
    ? await resolveCoverage({
        insuranceCompanyId: state.insuranceCompanyId,
        services: state.programs,
        onDate: new Date(),
      })
    : { matchedPrograms: [], unmatched: [], fallbackProgram: null, rules: [] }

  return (
    <>
      <Link href="/patients" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        ← К пациентам
      </Link>
      <PageHeader
        title={card.fullName}
        description={`Дата рождения: ${d(card.birthDate)}${card.policyNumber ? ` · Полис: ${card.policyNumber}` : ""}`}
      />

      {card.alsoKnown.length > 0 && (
        <Card className="mb-4 p-4 text-sm">
          <span className="text-muted-foreground">По тому же полису есть записи с другим написанием ФИО — возможно, это тот же человек: </span>
          {card.alsoKnown.map((a, i) => (
            <span key={a.key}>
              {i > 0 ? ", " : ""}
              <Link href={`/patients/${a.key}`} className="text-primary hover:underline">{a.fullName}</Link>
            </span>
          ))}
        </Card>
      )}

      <CoverageChatPanel patientKey={key} initialMessages={await listChatMessages(scope.orgId, key)} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Что действует сейчас</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={state.attached ? "default" : "destructive"}>
                {state.attached ? "прикреплён к программе" : "откреплён"}
              </Badge>
              <span className="text-muted-foreground">с {d(state.since)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Страховая: </span>
              {state.insurer ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Программа: </span>
              {state.programs.length ? state.programs.join("; ") : "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Действующих гарантийных писем: </span>
              <b>{state.activeGuarantees.length}</b>
              {state.expiredGuarantees.length > 0 && (
                <span className="text-muted-foreground"> · истекло: {state.expiredGuarantees.length}</span>
              )}
              {state.annulledGuarantees.length > 0 && (
                <span className="text-destructive"> · аннулировано страховой: {state.annulledGuarantees.length}</span>
              )}
            </div>
            {!state.attached && (
              <p className="text-sm text-muted-foreground">
                Пациент откреплён — оплата по ДМС не гарантируется, уточните в страховой.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Действующие гарантийные письма</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {state.activeGuarantees.length === 0 ? (
              <p className="text-muted-foreground">
                Действующих писем нет — на услуги сверх программы понадобится запрос в страховую.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.activeGuarantees.map((g) => (
                  <li key={g.id} className="flex flex-col gap-0.5">
                    <span>
                      <Link href={`/registry/${g.id}`} className="text-primary hover:underline">
                        от {d(g.letterDate)}
                      </Link>{" "}
                      <span className="text-muted-foreground">до {d(g.validUntil)}</span>
                      {g.amountLimit && <span className="ml-1">· лимит {g.amountLimit}</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {g.services.join("; ") || g.conditions || "услуги не указаны"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Что покрывает программа пациента</CardTitle>
        </CardHeader>
        <CardContent>
          <CoverageRules
            rules={coverage.rules}
            matchedPrograms={coverage.matchedPrograms}
            unmatched={coverage.unmatched}
            preview={10}
          />
        </CardContent>
      </Card>

      <Card className="mt-4 overflow-hidden p-0">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-base">История писем ({card.letters.filter((l) => !l.isDuplicate).length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Дата</TableHead>
                <TableHead className="w-[170px]">Событие</TableHead>
                <TableHead>Программа / услуги</TableHead>
                <TableHead className="w-[110px]">Действует до</TableHead>
                <TableHead className="w-[90px]">Запись</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {card.letters
                .filter((l) => !l.isDuplicate)
                .map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{d(l.letterDate)}</TableCell>
                    <TableCell className="text-sm">
                      {STATUS_LABEL[l.approvalStatus] ?? l.approvalStatus}
                    </TableCell>
                    <TableCell className="text-sm">{l.services.join("; ") || "—"}</TableCell>
                    <TableCell className="text-xs">{d(l.validUntil)}</TableCell>
                    <TableCell className="text-xs">
                      <Link href={`/registry/${l.id}`} className="text-primary hover:underline">
                        открыть
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
