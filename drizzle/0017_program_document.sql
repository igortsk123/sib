CREATE TABLE "program_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insurance_company_id" uuid,
	"program_name" text,
	"title" text NOT NULL,
	"doc_kind" text DEFAULT 'rules' NOT NULL,
	"source_url" text NOT NULL,
	"file_url" text,
	"storage_path" text,
	"sha256" text,
	"file_date" date,
	"downloaded_at" timestamp with time zone,
	"applies_to" text DEFAULT 'unknown' NOT NULL,
	"effective_from" date,
	"superseded_by_id" uuid,
	"last_checked_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "program_document" ADD CONSTRAINT "program_document_insurance_company_id_insurance_company_id_fk" FOREIGN KEY ("insurance_company_id") REFERENCES "public"."insurance_company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pd_insurer_idx" ON "program_document" USING btree ("insurance_company_id");--> statement-breakpoint
CREATE INDEX "pd_source_idx" ON "program_document" USING btree ("source_url");