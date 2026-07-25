CREATE TABLE "document_text" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"page" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_text" ADD CONSTRAINT "document_text_document_id_program_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."program_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dt_doc_idx" ON "document_text" USING btree ("document_id");