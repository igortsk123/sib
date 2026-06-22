CREATE TYPE "public"."error_report_status" AS ENUM('open', 'fixed', 'dismissed');--> statement-breakpoint
CREATE TABLE "error_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"letter_id" uuid NOT NULL,
	"message" text NOT NULL,
	"reporter_email" text,
	"status" "error_report_status" DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"reported_by" uuid,
	"resolved_by" uuid,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "error_report" ADD CONSTRAINT "error_report_letter_id_guarantee_letter_id_fk" FOREIGN KEY ("letter_id") REFERENCES "public"."guarantee_letter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "error_report_status_idx" ON "error_report" USING btree ("status");--> statement-breakpoint
CREATE INDEX "error_report_letter_idx" ON "error_report" USING btree ("letter_id");