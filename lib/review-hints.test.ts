import { describe, expect, it } from "vitest"

import { humanizeReviewNote, reviewMessage } from "./review-hints"

describe("reviewMessage — заметку читает менеджер, не разработчик", () => {
  it("чистый список тех-полей → «Проверьте поля: …» по-русски", () => {
    expect(reviewMessage("approvalStatus, policyNumber")).toBe("Проверьте поля: статус, номер полиса ДМС.")
  })

  it("составная заметка (пример владельца): без approvalStatus и «LLM», статусы словами", () => {
    const raw =
      "approvalStatus | LLM: ФИО и полис совпадают. Статус в записи approved, а в письме это направление (referral), не гарантия оплаты."
    const out = reviewMessage(raw)
    expect(out).not.toMatch(/approvalStatus|LLM|\breferral\b|\bapproved\b/)
    expect(out).toContain("статус")
    expect(out).toContain("Авто-проверка:")
    expect(out).toContain("«гарантия оплаты»")
    expect(out).toContain("«направление»")
  })

  it("маркеры авто-сверки переводятся", () => {
    expect(humanizeReviewNote("✔ LLM-сверка ok 2026-07-26")).toBe("✔ авто-сверка пройдена 2026-07-26")
    expect(humanizeReviewNote("срок/объём в письме не найден (LLM-проверка оригинала)")).toBe(
      "срок/объём в письме не найден (авто-проверка оригинала)",
    )
  })

  it("пустая заметка → базовая фраза", () => {
    expect(reviewMessage(null)).toBe("Требует проверки.")
  })
})
