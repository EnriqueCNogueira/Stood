ALTER TABLE "stoods" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "stoods" ADD CONSTRAINT "stoods_description_check" CHECK (char_length("stoods"."description") <= 200);