// Яндекс.Метрика для публичного лендинга. Счётчик 111048059 (sib.docon.pro) создан через
// Management API 26.07 — ID публичный (виден в HTML), поэтому задан в коде: NEXT_PUBLIC_*
// инлайнится при сборке, а docker build не получает /opt/sib.env. Env-переменная — переопределение.
// Цели дергаются trackGoal('lead') — оплата за конверсии в Директе завязана на них.

export const METRIKA_ID = Number(process.env.NEXT_PUBLIC_METRIKA_ID ?? "") || 111048059

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
