-- Жёсткое разделение контуров (ADR D50): демо-стенд помечается признаком в БД, а не совпадением
-- названия «Демо-клиника» в коде. Экспандер: колонка с дефолтом false, откат деплоя безопасен.
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "is_demo" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
UPDATE "organization" SET "is_demo" = true WHERE "name" = 'Демо-клиника';
--> statement-breakpoint
-- Частичный индекс: предикат «не демо» стоит в каждом запросе рабочего контура.
CREATE INDEX IF NOT EXISTS "org_is_demo_idx" ON "organization" ("is_demo") WHERE "is_demo";
