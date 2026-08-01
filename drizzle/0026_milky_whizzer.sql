-- D48: гейт новых типов писем — записи без активного шаблона скрыты из общего списка
-- до активации шаблона поддержкой. Идемпотентно (повторный прогон безопасен).
ALTER TABLE "guarantee_letter" ADD COLUMN IF NOT EXISTS "is_held" boolean DEFAULT false NOT NULL;
