ALTER TABLE "accounts" ADD COLUMN "email" text;--> statement-breakpoint
CREATE INDEX "accounts_email_idx" ON "accounts" USING btree ("email");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_email_check" CHECK ("accounts"."email" = lower("accounts"."email"));--> statement-breakpoint
-- Escrito à mão: o drizzle-kit não gera trigger e o snapshot não o acompanha.
-- O e-mail de uma Conta nunca é o de outro Usuário, e o de um Usuário nunca é o de uma Conta alheia (ADR 0003): senão
-- quem tem aquele e-mail entraria pelo provedor e cairia nos Stoods de outra pessoa. A trava pelo e-mail serializa as
-- duas escritas: a segunda espera a primeira terminar e confere o que ela gravou.
CREATE FUNCTION "accounts_reject_email_of_other_user"() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
	IF NEW.email IS NULL THEN
		RETURN NEW;
	END IF;

	PERFORM pg_advisory_xact_lock(hashtextextended('email:' || NEW.email, 0));

	IF EXISTS (SELECT 1 FROM "users" WHERE lower("email") = NEW.email AND "id" <> NEW.user_id) THEN
		RAISE EXCEPTION 'account email belongs to another user'
			USING ERRCODE = 'check_violation', CONSTRAINT = 'accounts_email_of_other_user_check', TABLE = 'accounts';
	END IF;

	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "accounts_email_of_other_user_check" BEFORE INSERT OR UPDATE OF "email" ON "accounts"
	FOR EACH ROW EXECUTE FUNCTION "accounts_reject_email_of_other_user"();
--> statement-breakpoint
CREATE FUNCTION "users_reject_email_of_other_account"() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
	PERFORM pg_advisory_xact_lock(hashtextextended('email:' || lower(NEW.email), 0));

	IF EXISTS (SELECT 1 FROM "accounts" WHERE "email" = lower(NEW.email) AND "user_id" <> NEW.id) THEN
		RAISE EXCEPTION 'user email belongs to an account of another user'
			USING ERRCODE = 'check_violation', CONSTRAINT = 'users_email_of_other_account_check', TABLE = 'users';
	END IF;

	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "users_email_of_other_account_check" BEFORE INSERT OR UPDATE OF "email" ON "users"
	FOR EACH ROW EXECUTE FUNCTION "users_reject_email_of_other_account"();
