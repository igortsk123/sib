import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────
// Валидация окружения на границе (Zod, ADR D7). На этапе каркаса всё
// ОПЦИОНАЛЬНО — образ собирается без живой БД/почты/LLM. По мере срезов
// нужные переменные становятся обязательными в местах использования.
// ─────────────────────────────────────────────────────────────────────
const schema = z.object({
  DATABASE_URL: z.string().optional(),

  // Яндекс-почта (IMAP/SMTP XOAUTH2) — забор писем (ADR D2).
  YANDEX_MAIL_USER: z.string().optional(),
  YANDEX_IMAP_HOST: z.string().optional(),
  YANDEX_IMAP_PORT: z.string().optional(),
  YANDEX_OAUTH_CLIENT_ID: z.string().optional(),
  YANDEX_OAUTH_CLIENT_SECRET: z.string().optional(),
  YANDEX_OAUTH_REFRESH_TOKEN: z.string().optional(),

  // OpenAI (через RU-прокси) — распознавание сложных случаев.
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),

  NEXT_PUBLIC_APP_URL: z.string().optional(),
})

export const env = schema.parse(process.env)
export type Env = z.infer<typeof schema>
