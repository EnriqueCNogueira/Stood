CREATE TABLE "file_blobs" (
	"file_id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"mime_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_blobs_mime_type_check" CHECK ("file_blobs"."mime_type" in ('image/png', 'image/jpeg', 'image/webp')),
	CONSTRAINT "file_blobs_data_check" CHECK (octet_length("file_blobs"."data") between 1 and 5242880)
);
--> statement-breakpoint
-- Ordem trocada à mão: o UNIQUE de files precisa existir antes da FK composta que aponta para ele
ALTER TABLE "files" ADD CONSTRAINT "files_id_owner_id_unique" UNIQUE("id","owner_id");--> statement-breakpoint
ALTER TABLE "file_blobs" ADD CONSTRAINT "file_blobs_file_id_owner_id_files_fk" FOREIGN KEY ("file_id","owner_id") REFERENCES "public"."files"("id","owner_id") ON DELETE cascade ON UPDATE no action;