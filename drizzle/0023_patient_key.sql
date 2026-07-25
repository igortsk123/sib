-- Ключ пациента (ФИО + точная дата рождения): раздел «Пациенты» ищет по нему за индекс,
-- а не перебором всех писем клиники. Нормализация ОБЯЗАНА совпадать с patientKey()
-- в lib/server/patients/state.ts. Generated-колонка не подходит: приведение date→text
-- не immutable, поэтому заполняем триггером.
ALTER TABLE "guarantee_letter" ADD COLUMN IF NOT EXISTS "patient_key" text;--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_patient_key() RETURNS trigger AS $$
BEGIN
  IF NEW.patient_full_name IS NOT NULL AND NEW.patient_birth_date IS NOT NULL THEN
    NEW.patient_key := substr(encode(sha256(convert_to(
      btrim(regexp_replace(replace(lower(NEW.patient_full_name), 'ё', 'е'), '\s+', ' ', 'g'))
      || '|' || to_char(NEW.patient_birth_date, 'YYYY-MM-DD'), 'utf8')), 'hex'), 1, 24);
  ELSE
    NEW.patient_key := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_patient_key ON "guarantee_letter";--> statement-breakpoint
CREATE TRIGGER trg_patient_key BEFORE INSERT OR UPDATE OF patient_full_name, patient_birth_date
  ON "guarantee_letter" FOR EACH ROW EXECUTE FUNCTION set_patient_key();--> statement-breakpoint
UPDATE "guarantee_letter" SET patient_key = substr(encode(sha256(convert_to(
    btrim(regexp_replace(replace(lower(patient_full_name), 'ё', 'е'), '\s+', ' ', 'g'))
    || '|' || to_char(patient_birth_date, 'YYYY-MM-DD'), 'utf8')), 'hex'), 1, 24)
  WHERE patient_full_name IS NOT NULL AND patient_birth_date IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gl_patient_key_idx" ON "guarantee_letter" USING btree ("patient_key");
