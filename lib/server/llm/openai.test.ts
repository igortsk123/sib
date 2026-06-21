import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Тест клиента LLM: конфигурация + форма запроса (прокси-URL, модель, Structured
// Outputs strict) + типизированный Result. Реальная сеть не дёргается (мок fetch).
// env парсится при импорте → стабим env и пере-импортируем модуль свежим.

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function load() {
  vi.resetModules()
  return await import("./openai")
}

describe("isLlmConfigured", () => {
  it("false без ключа/прокси", async () => {
    vi.stubEnv("OPENAI_API_KEY", "")
    vi.stubEnv("OPENAI_BASE_URL", "")
    const { isLlmConfigured } = await load()
    expect(isLlmConfigured()).toBe(false)
  })

  it("true когда заданы ключ и прокси", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test")
    vi.stubEnv("OPENAI_BASE_URL", "http://proxy.local/gpt")
    const { isLlmConfigured } = await load()
    expect(isLlmConfigured()).toBe(true)
  })
})

describe("chatComplete", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test")
    vi.stubEnv("OPENAI_BASE_URL", "http://proxy.local/gpt/")
    vi.stubEnv("OPENAI_MODEL", "gpt-5.4-mini")
  })

  it("шлёт на прокси /chat/completions с моделью и Structured Outputs", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"x":1}' } }] }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const { chatComplete } = await load()

    const res = await chatComplete([{ role: "user", content: "hi" }], {
      jsonSchema: { type: "object", properties: { x: { type: "number" } } },
      schemaName: "test",
    })

    expect(res.ok).toBe(true)
    if (res.ok) expect(res.value).toBe('{"x":1}')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("http://proxy.local/gpt/chat/completions")
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.model).toBe("gpt-5.4-mini")
    expect(body.response_format.type).toBe("json_schema")
    expect(body.response_format.json_schema.strict).toBe(true)
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer sk-test" })
  })

  it("возвращает err при HTTP-ошибке", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => "down" }),
    )
    const { chatComplete } = await load()
    const res = await chatComplete([{ role: "user", content: "hi" }])
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain("503")
  })
})
