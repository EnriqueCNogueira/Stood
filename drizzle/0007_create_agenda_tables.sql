CREATE TABLE "appointment_changes" (
	"owner_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"original_day" date NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"title" text,
	"day" date,
	"time_of_day" time,
	"stood_id" uuid,
	CONSTRAINT "appointment_changes_pkey" PRIMARY KEY("appointment_id","original_day"),
	CONSTRAINT "appointment_changes_title_check" CHECK (char_length("appointment_changes"."title") between 1 and 100 and "appointment_changes"."title" !~ '^\s|\s$'),
	CONSTRAINT "appointment_changes_values_check" CHECK (("appointment_changes"."is_deleted" and "appointment_changes"."title" is null and "appointment_changes"."day" is null and "appointment_changes"."time_of_day" is null and "appointment_changes"."stood_id" is null) or (not "appointment_changes"."is_deleted" and "appointment_changes"."title" is not null and "appointment_changes"."day" is not null))
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"stood_id" uuid,
	"title" text NOT NULL,
	"day" date NOT NULL,
	"time_of_day" time,
	"recurrence" text DEFAULT 'none' NOT NULL,
	"weekdays" smallint[] DEFAULT '{}' NOT NULL,
	"ends_on" date,
	CONSTRAINT "appointments_id_owner_id_unique" UNIQUE("id","owner_id"),
	CONSTRAINT "appointments_title_check" CHECK (char_length("appointments"."title") between 1 and 100 and "appointments"."title" !~ '^\s|\s$'),
	CONSTRAINT "appointments_recurrence_check" CHECK ("appointments"."recurrence" in ('none', 'daily', 'weekly', 'monthly')),
	CONSTRAINT "appointments_weekdays_check" CHECK ("appointments"."weekdays" <@ '{0,1,2,3,4,5,6}'::smallint[] and ("appointments"."recurrence" = 'weekly') = (cardinality("appointments"."weekdays") > 0)),
	CONSTRAINT "appointments_ends_on_check" CHECK ("appointments"."ends_on" is null or ("appointments"."recurrence" <> 'none' and "appointments"."ends_on" >= "appointments"."day"))
);
--> statement-breakpoint
ALTER TABLE "appointment_changes" ADD CONSTRAINT "appointment_changes_appointment_id_owner_id_appointments_fk" FOREIGN KEY ("appointment_id","owner_id") REFERENCES "public"."appointments"("id","owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_changes_stood_id_idx" ON "appointment_changes" USING btree ("stood_id");--> statement-breakpoint
CREATE INDEX "appointments_owner_id_idx" ON "appointments" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "appointments_stood_id_idx" ON "appointments" USING btree ("stood_id");--> statement-breakpoint
-- Escrito à mão: o drizzle-kit não gera ON DELETE SET NULL com lista de colunas.
-- O Compromisso e a Ocorrência mudada só apontam para um Stood do mesmo dono, e apagar o Stood anula só stood_id.
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_stood_id_owner_id_stoods_fk" FOREIGN KEY ("stood_id","owner_id") REFERENCES "public"."stoods"("id","owner_id") ON DELETE SET NULL ("stood_id") ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_changes" ADD CONSTRAINT "appointment_changes_stood_id_owner_id_stoods_fk" FOREIGN KEY ("stood_id","owner_id") REFERENCES "public"."stoods"("id","owner_id") ON DELETE SET NULL ("stood_id") ON UPDATE no action;
