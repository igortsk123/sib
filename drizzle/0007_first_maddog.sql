ALTER TYPE "public"."doc_type" ADD VALUE 'enroll' BEFORE 'denial';--> statement-breakpoint
ALTER TYPE "public"."doc_type" ADD VALUE 'detach' BEFORE 'denial';--> statement-breakpoint
ALTER TYPE "public"."doc_type" ADD VALUE 'annul' BEFORE 'denial';--> statement-breakpoint
ALTER TYPE "public"."doc_type" ADD VALUE 'referral' BEFORE 'denial';--> statement-breakpoint
ALTER TABLE "guarantee_letter" ADD COLUMN "doc_type" "doc_type";