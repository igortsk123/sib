CREATE TYPE "public"."care_type" AS ENUM('ambulatory', 'dentistry', 'other');--> statement-breakpoint
ALTER TABLE "guarantee_letter" ADD COLUMN "care_type" "care_type";