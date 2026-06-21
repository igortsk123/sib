import type { Config } from "drizzle-kit"

// Конфиг drizzle-kit: схема — lib/db/schema, миграции — ./drizzle.
// Доменная схема (EmailMessage/Attachment/GuaranteeLetter/...) наполняется по вертикальным срезам.
export default {
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
} satisfies Config
