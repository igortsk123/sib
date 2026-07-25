import type { ResolvedRule } from "@/lib/server/coverage/resolve"

import { VerdictBadge } from "./verdict-badge"

// ─────────────────────────────────────────────────────────────────────
// Правила покрытия в карточке пациента (бизнес-идея: core/coverage-assistant-vision.md).
// Врач и регистратура видят ВСЕ применимые правила, упорядоченные по приоритету:
// сначала правила программы пациента, затем общие правила страховой (они слабее).
// У каждого правила — пункт документа и дата редакции: проверяемо, без «система так решила».
// ─────────────────────────────────────────────────────────────────────

type Props = {
  rules: ResolvedRule[]
  matchedPrograms: string[]
  unmatched: string[]
  /** Сколько правил показать сразу; остальные — под «показать все». */
  preview?: number
}

export function CoverageRules({ rules, matchedPrograms, unmatched, preview = 8 }: Props) {
  if (rules.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        {unmatched.length > 0
          ? `программа «${unmatched[0]}» ещё не сопоставлена с документами — ожидается загрузка документов со стороны клиники`
          : "правила покрытия для этой программы пока не загружены"}
      </p>
    )
  }

  const program = rules.filter((r) => r.scopeLevel === "program")
  const insurer = rules.filter((r) => r.scopeLevel !== "program")
  const head = rules.slice(0, preview)
  const rest = rules.slice(preview)

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        {matchedPrograms.length > 0 ? `Программа: ${matchedPrograms.join("; ")} · ` : ""}
        правил программы: {program.length}, общих правил страховой: {insurer.length}
      </p>

      <ul className="flex flex-col gap-1.5">
        {head.map((r, i) => (
          <RuleLine key={`h-${i}`} rule={r} />
        ))}
      </ul>

      {rest.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-primary hover:underline">
            Показать все правила ({rules.length})
          </summary>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {rest.map((r, i) => (
              <RuleLine key={`r-${i}`} rule={r} />
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function RuleLine({ rule }: { rule: ResolvedRule }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <VerdictBadge verdict={rule.verdict} needsReview={rule.needsReview} />
      <span>{rule.servicePattern ?? rule.serviceClass}</span>
      {rule.limitAmount && (
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{rule.limitAmount}</span>
      )}
      {rule.conditionText && <span className="text-xs text-muted-foreground">— {rule.conditionText}</span>}
      <span className="text-xs text-muted-foreground/70">
        {rule.documentUrl ? (
          <a href={rule.documentUrl} target="_blank" rel="noreferrer" className="hover:underline">
            {rule.clause} ↗
          </a>
        ) : (
          rule.clause
        )}
        {rule.scopeLevel !== "program" ? " · общие правила СК" : ""}
        {rule.effectiveFrom ? ` · ред. ${new Date(rule.effectiveFrom).toLocaleDateString("ru")}` : ""}
      </span>
    </li>
  )
}
