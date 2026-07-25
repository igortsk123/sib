import { Badge } from "@/components/ui/badge"

// Единый бейдж вердикта покрытия — в карточке пациента и в справочнике правил.
// Формулировки под врача и регистратуру: не «covered», а «ДА». Цвета — только варианты
// дизайн-системы (ui-rules: сырые цвета ломают тему).
const VERDICT: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  covered: { label: "ДА", variant: "default" },
  conditional: { label: "УСЛОВНО", variant: "secondary" },
  needs_approval: { label: "СОГЛАСОВАНИЕ", variant: "outline" },
  excluded: { label: "НЕТ", variant: "destructive" },
}

export function VerdictBadge({ verdict, needsReview }: { verdict: string; needsReview?: boolean }) {
  const v = VERDICT[verdict] ?? { label: verdict, variant: "outline" as const }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge variant={v.variant}>{v.label}</Badge>
      {needsReview && (
        <Badge variant="outline" title="Документ обновился — правило перенесено на новую редакцию и ещё сверяется">
          ред. обновилась
        </Badge>
      )}
    </span>
  )
}
