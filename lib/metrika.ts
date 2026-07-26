// Яндекс.Метрика для публичного лендинга. Счётчик подключается через env
// NEXT_PUBLIC_METRIKA_ID (пока владелец не создал счётчик — пусто, сниппет не рендерится).
// Цели дергаются trackGoal('lead') — оплата за конверсии в Директе завязана на них.

export const METRIKA_ID = Number(process.env.NEXT_PUBLIC_METRIKA_ID ?? "") || 0

export function trackGoal(goal: string): void {
  if (METRIKA_ID && typeof window !== "undefined" && typeof window.ym === "function") {
    window.ym(METRIKA_ID, "reachGoal", goal)
  }
}

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void
  }
}
