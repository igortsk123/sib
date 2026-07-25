import type { ResolvedRule } from "@/lib/server/coverage/resolve"

// ─────────────────────────────────────────────────────────────────────
// Выжимка правил покрытия в карточке письма (план coverage-resolver).
// Показывает, что программа пациента покрывает, с пунктом-обоснованием — сотрудник видит
// «п. 3.2.7», а не «система так решила». Правила программы отмечены, правила страховой — серым.
// ─────────────────────────────────────────────────────────────────────

const VERDICT: Record<string, { label: string; className: string }> = {
  covered: { label: "ДА", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  conditional: { label: "УСЛОВНО", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300" },
  needs_approval: { label: "СОГЛАСОВАНИЕ", className: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300" },
  excluded: { label: "НЕТ", className: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300" },
}

type Props = {
  rules: ResolvedRule[]
  matchedPrograms: string[]
  unmatched: string[]
  limit?: number
}

export function CoverageRules({ rules, matchedPrograms, unmatched, limit = 12 }: Props) {
  if (rules.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        {unmatched.length > 0
          ? `программа «${unmatched[0]}» не сопоставлена с документами — ожидается загрузка документов со стороны клиники`
          : "правила покрытия для этой программы пока не загружены"}
      </p>
    )
  }
  const shown = rules.slice(0, limit)
  return (
    <div className="flex flex-col gap-2">
      {matchedPrograms.length > 0 && (
        <p className="text-xs text-muted-foreground">Программа: {matchedPrograms.join("; ")}</p>
      )}
      <ul className="flex flex-col gap-1.5">
        {shown.map((r, i) => (
          <li key={`${r.clause}-${r.servicePattern}-${i}`} className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${VERDICT[r.verdict]?.className ?? ""}`}>
              {VERDICT[r.verdict]?.label ?? r.verdict}
            </span>
            <span>{r.servicePattern ?? r.serviceClass}</span>
            {r.limitAmount && <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{r.limitAmount}</span>}
            {r.conditionText && <span className="text-xs text-muted-foreground">— {r.conditionText}</span>}
            <span className="text-xs text-muted-foreground/70">
              {r.clause}
              {r.scopeLevel === "insurer" ? " · общие правила СК" : ""}
            </span>
          </li>
        ))}
      </ul>
      {rules.length > shown.length && (
        <p className="text-xs text-muted-foreground">…и ещё {rules.length - shown.length} правил в документах ниже</p>
      )}
    </div>
  )
}
