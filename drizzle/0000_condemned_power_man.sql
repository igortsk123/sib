CREATE TYPE "public"."approval_status" AS ENUM('approved', 'denied', 'partial', 'need_info', 'need_approval', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('guarantee', 'denial', 'info_request', 'archive_password', 'service', 'other');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('received', 'parsing', 'parsed', 'manual_review', 'error', 'irrelevant');--> statement-breakpoint
CREATE TYPE "public"."queue_reason" AS ENUM('low_confidence', 'missing_patient', 'missing_policy', 'unknown_insurer', 'archive_no_password', 'password_no_archive', 'duplicate', 'conflict', 'multi_patient', 'extract_error', 'other');--> statement-breakpoint
CREATE TYPE "public"."queue_status" AS ENUM('open', 'in_progress', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('auto', 'confirmed', 'edited', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'dms', 'doctor', 'registry', 'registry_senior');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'blocked');--> statement-breakpoint
CREATE TABLE "insurance_company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"domains" text[] DEFAULT '{}' NOT NULL,
	"typical_emails" text[] DEFAULT '{}' NOT NULL,
	"rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "insurance_company_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "email_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailbox" text NOT NULL,
	"message_id" text,
	"from_addr" text,
	"to_addr" text,
	"cc_addr" text,
	"subject" text,
	"received_at" timestamp with time zone,
	"original_date" timestamp with time zone,
	"body_text" text,
	"body_html" text,
	"is_forwarded" boolean DEFAULT false NOT NULL,
	"original_from" text,
	"original_subject" text,
	"raw_storage_path" text,
	"raw_sha256" text,
	"insurance_company_id" uuid,
	"status" "email_status" DEFAULT 'received' NOT NULL,
	"doc_type" "doc_type",
	"is_possible_duplicate" boolean DEFAULT false NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_message_id" uuid NOT NULL,
	"filename" text,
	"content_type" text,
	"ext" text,
	"size" integer,
	"sha256" text,
	"storage_path" text,
	"needs_password" boolean DEFAULT false NOT NULL,
	"is_extracted" boolean DEFAULT false NOT NULL,
	"is_scanned" boolean DEFAULT false NOT NULL,
	"extracted_text" text,
	"ocr_text" text,
	"extract_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guarantee_letter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_message_id" uuid NOT NULL,
	"attachment_id" uuid,
	"insurance_company_id" uuid,
	"row_index" integer,
	"patient_full_name" text,
	"patient_birth_date" date,
	"policy_number" text,
	"policy_series" text,
	"letter_number" text,
	"case_number" text,
	"approval_status" "approval_status" DEFAULT 'unknown' NOT NULL,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"letter_date" date,
	"valid_until" date,
	"amount_limit" text,
	"conditions" text,
	"insurer_comment" text,
	"clinic_comment" text,
	"source" text,
	"confidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"review_status" "review_status" DEFAULT 'auto' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processing_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_message_id" uuid,
	"guarantee_letter_id" uuid,
	"reason" "queue_reason" NOT NULL,
	"status" "queue_status" DEFAULT 'open' NOT NULL,
	"assigned_to" uuid,
	"notes" text,
	"correlation_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text,
	"email" text NOT NULL,
	"password_hash" text,
	"role" "user_role" DEFAULT 'dms' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"object_type" text,
	"object_id" uuid,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_email_message_id_email_message_id_fk" FOREIGN KEY ("email_message_id") REFERENCES "public"."email_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guarantee_letter" ADD CONSTRAINT "guarantee_letter_email_message_id_email_message_id_fk" FOREIGN KEY ("email_message_id") REFERENCES "public"."email_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guarantee_letter" ADD CONSTRAINT "guarantee_letter_attachment_id_attachment_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guarantee_letter" ADD CONSTRAINT "guarantee_letter_insurance_company_id_insurance_company_id_fk" FOREIGN KEY ("insurance_company_id") REFERENCES "public"."insurance_company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_queue" ADD CONSTRAINT "processing_queue_email_message_id_email_message_id_fk" FOREIGN KEY ("email_message_id") REFERENCES "public"."email_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_queue" ADD CONSTRAINT "processing_queue_guarantee_letter_id_guarantee_letter_id_fk" FOREIGN KEY ("guarantee_letter_id") REFERENCES "public"."guarantee_letter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_mailbox_idx" ON "email_message" USING btree ("mailbox");--> statement-breakpoint
CREATE INDEX "email_message_id_idx" ON "email_message" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "email_status_idx" ON "email_message" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attachment_email_idx" ON "attachment" USING btree ("email_message_id");--> statement-breakpoint
CREATE INDEX "attachment_sha_idx" ON "attachment" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "gl_email_idx" ON "guarantee_letter" USING btree ("email_message_id");--> statement-breakpoint
CREATE INDEX "gl_insurer_idx" ON "guarantee_letter" USING btree ("insurance_company_id");--> statement-breakpoint
CREATE INDEX "gl_policy_idx" ON "guarantee_letter" USING btree ("policy_number");--> statement-breakpoint
CREATE INDEX "gl_patient_idx" ON "guarantee_letter" USING btree ("patient_full_name");--> statement-breakpoint
CREATE INDEX "gl_letter_no_idx" ON "guarantee_letter" USING btree ("letter_number");--> statement-breakpoint
CREATE INDEX "queue_status_idx" ON "processing_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "queue_reason_idx" ON "processing_queue" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "queue_corr_idx" ON "processing_queue" USING btree ("correlation_key");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "app_user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "audit_object_idx" ON "audit_log" USING btree ("object_type","object_id");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_log" USING btree ("user_id");