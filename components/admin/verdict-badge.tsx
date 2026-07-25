// Единый бейдж вердикта покрытия — используется и в карточке пациента, и в справочнике правил.
// Формулировки под врача/регистратуру: не «covered», а «ДА».
const VERDICT: Record<string, { label: string; className: string }> = {
  covered: { label: "ДА", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  conditional: { label: "УСЛОВНО", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300" },
  needs_approval: { label: "СОГЛАСОВАНИЕ", className: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300" },
  excluded: { label: "НЕТ", className: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300" },
}

export function VerdictBadge({ verdict, needsReview }: { verdict: string; needsReview?: boolean }) {
  const v = VERDICT[verdict] ?? { label: verdict, className: "bg-muted text-muted-foreground" }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${v.className}`}>{v.label}</span>
      {needsReview && (
        <span
          className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
          title="Документ обновился — правило перенесено на новую редакцию и ещё сверяется"
        >
          ред. обновилась
        </span>
      )}
    </span>
  )
}
