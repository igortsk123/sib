-- Чат по правилам покрытия на карточке пациента: общая история вопросов/ответов
-- (регистратура спросила — врач видит). Идемпотентно (повторный прогон безопасен).
CREATE TABLE IF NOT EXISTS "coverage_chat_message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "patient_key" text NOT NULL,
  "role" text NOT NULL,
  "author_name" text,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "ccm_patient_idx" ON "coverage_chat_message" ("patient_key","created_at");
