ALTER TABLE "coverage_rule" ADD COLUMN IF NOT EXISTS "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "coverage_rule" ADD COLUMN IF NOT EXISTS "carried_from_document_id" uuid;--> statement-breakpoint
ALTER TABLE "coverage_rule" ADD CONSTRAINT "coverage_rule_carried_from_fk" FOREIGN KEY ("carried_from_document_id") REFERENCES "public"."program_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cr_review_idx" ON "coverage_rule" USING btree ("needs_review");
