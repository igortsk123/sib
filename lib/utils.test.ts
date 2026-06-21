import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("объединяет классы", () => {
    expect(cn("a", "b")).toBe("a b")
  })

  it("отбрасывает falsy", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b")
  })

  it("разрешает конфликт tailwind-классов в пользу последнего", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })
})
