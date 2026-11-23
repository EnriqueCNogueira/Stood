CREATE TABLE "stood_tags" (
	"owner_id" uuid NOT NULL,
	"stood_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "stood_tags_pkey" PRIMARY KEY("stood_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tags_id_owner_id_unique" UNIQUE("id","owner_id"),
	CONSTRAINT "tags_name_check" CHECK (char_length("tags"."name") between 1 and 30 and "tags"."name" !~ '^\s|\s$')
);
--> statement-breakpoint
ALTER TABLE "stood_tags" ADD CONSTRAINT "stood_tags_stood_id_owner_id_stoods_fk" FOREIGN KEY ("stood_id","owner_id") REFERENCES "public"."stoods"("id","owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stood_tags" ADD CONSTRAINT "stood_tags_tag_id_owner_id_tags_fk" FOREIGN KEY ("tag_id","owner_id") REFERENCES "public"."tags"("id","owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stood_tags_tag_id_idx" ON "stood_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_owner_id_name_unique" ON "tags" USING btree ("owner_id",lower("name"));