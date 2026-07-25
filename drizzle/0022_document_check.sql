CREATE TABLE IF NOT EXISTS "document_check" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"sha256" text,
	"http_status" integer,
	"size_bytes" integer,
	"message" text,
	"new_document_id" uuid
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "document_check" ADD CONSTRAINT "document_check_document_id_program_document_id_fk"
    FOREIGN KEY ("document_id") REFERENCES "public"."program_document"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dc_doc_idx" ON "document_check" USING btree ("document_id","checked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dc_status_idx" ON "document_check" USING btree ("status","checked_at");
