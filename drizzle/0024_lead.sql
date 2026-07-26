-- Заявки с публичного лендинга /land (реклама Директ, план ads-b2b-semantics-review).
-- Идемпотентно (повторный прогон безопасен).
CREATE TABLE IF NOT EXISTS "lead" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "clinic" text,
  "contact" text NOT NULL,
  "comment" text,
  "utm" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "lead_created_idx" ON "lead" ("created_at");
