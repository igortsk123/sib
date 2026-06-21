// ─────────────────────────────────────────────────────────────────────
// Структурный лог (JSON-строки). Полное логирование разрешено (ADR D10 —
// сервер клиники РФ): можно писать тело письма/текст/запрос-ответ LLM. НЕ пишем
// только секреты (токены, пароли архивов) — это гигиена, а не ПДн.
// ─────────────────────────────────────────────────────────────────────
type Fields = Record<string, unknown>

function emit(level: "info" | "warn" | "error", event: string, fields?: Fields) {
  const line = JSON.stringify({ level, event, ts: new Date().toISOString(), ...fields })
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

export const log = {
  info: (event: string, fields?: Fields) => emit("info", event, fields),
  warn: (event: string, fields?: Fields) => emit("warn", event, fields),
  error: (event: string, fields?: Fields) => emit("error", event, fields),
}
