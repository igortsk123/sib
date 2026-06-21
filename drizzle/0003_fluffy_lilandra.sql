ALTER TABLE "email_message" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "guarantee_letter" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
CREATE INDEX "email_org_idx" ON "email_message" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "gl_org_idx" ON "guarantee_letter" USING btree ("organization_id");