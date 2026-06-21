CREATE TABLE "parse_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insurer" text,
	"source" text,
	"method" text,
	"row_index" integer,
	"missing" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"det_gap" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"llm_filled" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "parse_log_insurer_idx" ON "parse_log" USING btree ("insurer");