CREATE TYPE "public"."doc_template_status" AS ENUM('new', 'llm_parsed', 'parser_ready', 'drift');--> statement-breakpoint
CREATE TABLE "doc_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insurance_company_id" uuid NOT NULL,
	"doc_type" "doc_type" NOT NULL,
	"sample_storage_path" text,
	"sample_filename" text,
	"sample_text" text,
	"gold_json" jsonb,
	"status" "doc_template_status" DEFAULT 'new' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doc_template_insurer_type" UNIQUE("insurance_company_id","doc_type")
);
--> statement-breakpoint
ALTER TABLE "parse_log" ADD COLUMN "doc_type" text;--> statement-breakpoint
ALTER TABLE "doc_template" ADD CONSTRAINT "doc_template_insurance_company_id_insurance_company_id_fk" FOREIGN KEY ("insurance_company_id") REFERENCES "public"."insurance_company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doc_template_insurer_idx" ON "doc_template" USING btree ("insurance_company_id");