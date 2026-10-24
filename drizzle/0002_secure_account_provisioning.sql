CREATE TYPE "public"."account_setup_token_purpose" AS ENUM('INITIAL_SETUP', 'PASSWORD_RESET');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "login_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "password_set_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "account_setup_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" "account_setup_token_purpose" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "account_setup_tokens" ADD CONSTRAINT "account_setup_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_setup_tokens" ADD CONSTRAINT "account_setup_tokens_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"payload_hash" text NOT NULL,
	"member_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_login_id_unique" ON "user" USING btree ("login_id") WHERE "login_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "members_user_id_unique" ON "members" USING btree ("user_id") WHERE "user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_setup_tokens_hash_unique" ON "account_setup_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "account_setup_tokens_user_id_idx" ON "account_setup_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_setup_tokens_expiry_idx" ON "account_setup_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_actor_scope_key_unique" ON "idempotency_keys" USING btree ("actor_id","scope","key");
