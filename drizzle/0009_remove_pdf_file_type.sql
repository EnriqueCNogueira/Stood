ALTER TABLE "files" DROP CONSTRAINT "files_type_check";--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_type_check" CHECK ("files"."type" in ('note', 'drawing', 'image', 'video'));