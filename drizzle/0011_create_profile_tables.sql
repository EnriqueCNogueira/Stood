CREATE TABLE "profile_photos" (
	"owner_id" uuid PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_photos_data_check" CHECK (octet_length("profile_photos"."data") between 1 and 204800 and substring("profile_photos"."data" from 1 for 3) = '\xffd8ff'::bytea)
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"owner_id" uuid PRIMARY KEY NOT NULL,
	"nickname" text,
	"bio" text,
	"mood" text,
	"mood_day" date,
	CONSTRAINT "profiles_nickname_check" CHECK (char_length("profiles"."nickname") between 1 and 30 and "profiles"."nickname" !~ '^\s|\s$' and "profiles"."nickname" !~ '[\r\n]'),
	CONSTRAINT "profiles_bio_check" CHECK (char_length("profiles"."bio") between 1 and 160 and "profiles"."bio" !~ '^\s|\s$' and "profiles"."bio" !~ '[\r\n]'),
	CONSTRAINT "profiles_mood_check" CHECK ("profiles"."mood" in ('motivation', 'concentration', 'excitement', 'calm', 'doubts', 'tiredness', 'pressure', 'discouragement')),
	CONSTRAINT "profiles_mood_day_check" CHECK (("profiles"."mood" is null) = ("profiles"."mood_day" is null))
);
--> statement-breakpoint
ALTER TABLE "profile_photos" ADD CONSTRAINT "profile_photos_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;