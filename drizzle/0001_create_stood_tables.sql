CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"stood_id" uuid NOT NULL,
	"folder_id" uuid,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_type_check" CHECK ("files"."type" in ('note', 'drawing', 'image', 'pdf', 'video')),
	CONSTRAINT "files_content_check" CHECK (("files"."type" in ('note', 'drawing', 'video')) = ("files"."content" is not null)),
	CONSTRAINT "files_video_content_check" CHECK ("files"."type" <> 'video' or "files"."content" ~ '^[A-Za-z0-9_-]{11}$'),
	CONSTRAINT "files_name_check" CHECK (char_length("files"."name") between 1 and 50 and "files"."name" !~ '[/\\]' and "files"."name" !~ '^\s|\s$')
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"stood_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "folders_id_stood_id_owner_id_unique" UNIQUE("id","stood_id","owner_id"),
	CONSTRAINT "folders_parent_id_check" CHECK ("folders"."parent_id" <> "folders"."id"),
	CONSTRAINT "folders_name_check" CHECK (char_length("folders"."name") between 1 and 50 and "folders"."name" !~ '[/\\]' and "folders"."name" !~ '^\s|\s$')
);
--> statement-breakpoint
CREATE TABLE "stoods" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"last_opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stoods_id_owner_id_unique" UNIQUE("id","owner_id"),
	CONSTRAINT "stoods_name_check" CHECK (char_length("stoods"."name") between 1 and 50 and "stoods"."name" !~ '[/\\]' and "stoods"."name" !~ '^\s|\s$')
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_stood_id_owner_id_stoods_fk" FOREIGN KEY ("stood_id","owner_id") REFERENCES "public"."stoods"("id","owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_folders_fk" FOREIGN KEY ("folder_id","stood_id","owner_id") REFERENCES "public"."folders"("id","stood_id","owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_stood_id_owner_id_stoods_fk" FOREIGN KEY ("stood_id","owner_id") REFERENCES "public"."stoods"("id","owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_folders_fk" FOREIGN KEY ("parent_id","stood_id","owner_id") REFERENCES "public"."folders"("id","stood_id","owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stoods" ADD CONSTRAINT "stoods_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_folder_id_idx" ON "files" USING btree ("folder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "files_stood_id_folder_id_type_name_unique" ON "files" USING btree ("stood_id",coalesce("folder_id", '00000000-0000-0000-0000-000000000000'::uuid),"type",lower("name"));--> statement-breakpoint
CREATE INDEX "folders_parent_id_idx" ON "folders" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "folders_stood_id_parent_id_name_unique" ON "folders" USING btree ("stood_id",coalesce("parent_id", '00000000-0000-0000-0000-000000000000'::uuid),lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "stoods_owner_id_name_unique" ON "stoods" USING btree ("owner_id",lower("name"));--> statement-breakpoint
CREATE INDEX "stoods_owner_id_last_opened_at_idx" ON "stoods" USING btree ("owner_id","last_opened_at" DESC NULLS LAST);--> statement-breakpoint
-- Escrito à mão: o drizzle-kit não gera trigger e o snapshot não o acompanha.
-- Recusa mover uma Pasta para dentro dela mesma ou de uma descendente. A trava na linha do Stood
-- serializa os movimentos do mesmo Stood: o segundo espera o primeiro terminar e confere a árvore já gravada.
-- FOR NO KEY UPDATE não conflita com o FOR KEY SHARE das FKs, então criar Pasta ou Arquivo no Stood não espera.
-- Em REPEATABLE READ a checagem leria a árvore do início da transação e deixaria o ciclo passar, então o movimento
-- é recusado nesse nível; em SERIALIZABLE o próprio Postgres aborta um dos movimentos cruzados.
CREATE FUNCTION "folders_reject_parent_cycle"() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
	IF NEW.parent_id IS NULL OR NEW.parent_id IS NOT DISTINCT FROM OLD.parent_id THEN
		RETURN NEW;
	END IF;

	IF current_setting('transaction_isolation') = 'repeatable read' THEN
		RAISE EXCEPTION 'moving a folder requires read committed or serializable isolation'
			USING ERRCODE = 'invalid_transaction_state';
	END IF;

	PERFORM 1 FROM "stoods" WHERE "id" = NEW.stood_id FOR NO KEY UPDATE;

	IF EXISTS (
		WITH RECURSIVE "ancestors" ("id", "parent_id") AS (
			SELECT "id", "parent_id" FROM "folders" WHERE "id" = NEW.parent_id
			UNION
			SELECT "folders"."id", "folders"."parent_id"
			FROM "folders" JOIN "ancestors" ON "folders"."id" = "ancestors"."parent_id"
		)
		SELECT 1 FROM "ancestors" WHERE "id" = NEW.id
	) THEN
		RAISE EXCEPTION 'folder cannot be moved into itself or a descendant'
			USING ERRCODE = 'check_violation', CONSTRAINT = 'folders_parent_cycle_check', TABLE = 'folders';
	END IF;

	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "folders_parent_cycle_check" BEFORE UPDATE OF "parent_id" ON "folders"
	FOR EACH ROW EXECUTE FUNCTION "folders_reject_parent_cycle"();
