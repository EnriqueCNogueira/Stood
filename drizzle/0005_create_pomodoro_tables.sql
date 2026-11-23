CREATE TABLE "focuses" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"stood_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"interrupted_at" timestamp with time zone,
	CONSTRAINT "focuses_duration_minutes_check" CHECK ("focuses"."duration_minutes" between 5 and 120),
	CONSTRAINT "focuses_interrupted_at_check" CHECK ("focuses"."interrupted_at" is null or ("focuses"."interrupted_at" >= "focuses"."started_at" + interval '60 seconds' and "focuses"."interrupted_at" < "focuses"."started_at" + "focuses"."duration_minutes" * interval '1 minute'))
);
--> statement-breakpoint
CREATE TABLE "weekly_goals" (
	"owner_id" uuid PRIMARY KEY NOT NULL,
	"minutes" integer NOT NULL,
	CONSTRAINT "weekly_goals_minutes_check" CHECK ("weekly_goals"."minutes" between 30 and 4800 and "weekly_goals"."minutes" % 30 = 0)
);
--> statement-breakpoint
ALTER TABLE "focuses" ADD CONSTRAINT "focuses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_goals" ADD CONSTRAINT "weekly_goals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "focuses_owner_id_started_at_idx" ON "focuses" USING btree ("owner_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "focuses_stood_id_idx" ON "focuses" USING btree ("stood_id");--> statement-breakpoint
-- Escrito à mão: o drizzle-kit não gera ON DELETE SET NULL com lista de colunas.
-- O Foco só aponta para um Stood do mesmo dono, e apagar o Stood anula só stood_id, mantendo o dono e o Tempo estudado.
ALTER TABLE "focuses" ADD CONSTRAINT "focuses_stood_id_owner_id_stoods_fk" FOREIGN KEY ("stood_id","owner_id") REFERENCES "public"."stoods"("id","owner_id") ON DELETE SET NULL ("stood_id") ON UPDATE no action;
