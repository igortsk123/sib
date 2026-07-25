CREATE TABLE "coverage_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"insurance_company_id" uuid,
	"program_name" text,
	"service_class" text NOT NULL,
	"service_pattern" text,
	"verdict" text NOT NULL,
	"condition_text" text,
	"limit_amount" text,
	"clause" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coverage_rule" ADD CONSTRAINT "coverage_rule_document_id_program_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."program_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coverage_rule" ADD CONSTRAINT "coverage_rule_insurance_company_id_insurance_company_id_fk" FOREIGN KEY ("insurance_company_id") REFERENCES "public"."insurance_company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cr_doc_idx" ON "coverage_rule" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "cr_insurer_idx" ON "coverage_rule" USING btree ("insurance_company_id");