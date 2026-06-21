ALTER TABLE "guarantee_letter" ADD COLUMN "method" text;--> statement-breakpoint
ALTER TABLE "guarantee_letter" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "guarantee_letter" ADD COLUMN "review_note" text;