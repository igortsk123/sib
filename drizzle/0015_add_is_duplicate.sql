ALTER TABLE "guarantee_letter" ADD COLUMN "is_duplicate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "guarantee_letter" ADD COLUMN "duplicate_of_id" uuid;