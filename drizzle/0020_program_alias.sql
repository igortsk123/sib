CREATE TABLE IF NOT EXISTS "program_alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insurance_company_id" uuid NOT NULL,
	"alias_norm" text NOT NULL,
	"program_name" text,
	"kind" text DEFAULT 'program' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "program_alias" ADD CONSTRAINT "program_alias_insurance_company_id_insurance_company_id_fk"
    FOREIGN KEY ("insurance_company_id") REFERENCES "public"."insurance_company"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "program_alias" ADD CONSTRAINT "program_alias_ck_alias_uq" UNIQUE("insurance_company_id","alias_norm");
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pa_ck_idx" ON "program_alias" USING btree ("insurance_company_id");--> statement-breakpoint
ALTER TABLE "coverage_rule" ADD COLUMN IF NOT EXISTS "scope_level" text DEFAULT 'insurer' NOT NULL;--> statement-breakpoint
ALTER TABLE "coverage_rule" ADD COLUMN IF NOT EXISTS "overridable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cr_program_idx" ON "coverage_rule" USING btree ("insurance_company_id","program_name");--> statement-breakpoint
UPDATE "coverage_rule" SET "scope_level" = 'program' WHERE "program_name" IS NOT NULL;--> statement-breakpoint
UPDATE "coverage_rule" SET "overridable" = true WHERE "program_name" IS NULL AND "condition_text" ILIKE '%предусмотренных Программой%';
