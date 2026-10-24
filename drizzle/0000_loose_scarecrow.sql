CREATE TYPE "public"."member_position" AS ENUM('LEFT', 'RIGHT');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"outcome" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_code" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"sponsor_id" uuid,
	"parent_id" uuid,
	"position" "member_position",
	"is_root" boolean DEFAULT false NOT NULL,
	"status" "member_status" DEFAULT 'PENDING' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_parent_position_check" CHECK (("members"."parent_id" IS NULL AND "members"."position" IS NULL) OR ("members"."parent_id" IS NOT NULL AND "members"."position" IS NOT NULL)),
	CONSTRAINT "members_root_placement_check" CHECK ("members"."is_root" = ("members"."parent_id" IS NULL AND "members"."position" IS NULL)),
	CONSTRAINT "members_not_own_parent_check" CHECK ("members"."parent_id" IS NULL OR "members"."parent_id" <> "members"."id"),
	CONSTRAINT "members_not_own_sponsor_check" CHECK ("members"."sponsor_id" IS NULL OR "members"."sponsor_id" <> "members"."id")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"code" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_code" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_code_pk" PRIMARY KEY("role_id","permission_code")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" text NOT NULL,
	"role_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_sponsor_id_members_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_parent_id_members_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_code_permissions_code_fk" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "members_member_code_unique" ON "members" USING btree ("member_code");--> statement-breakpoint
CREATE UNIQUE INDEX "members_email_unique" ON "members" USING btree ("email") WHERE "members"."email" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "members_parent_position_unique" ON "members" USING btree ("parent_id","position") WHERE "members"."parent_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "members_single_root_unique" ON "members" USING btree (("is_root")) WHERE "members"."is_root" = true;--> statement-breakpoint
CREATE INDEX "members_sponsor_id_idx" ON "members" USING btree ("sponsor_id");--> statement-breakpoint
CREATE INDEX "members_parent_id_idx" ON "members" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_code_idx" ON "role_permissions" USING btree ("permission_code");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_code_unique" ON "roles" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_role_id_idx" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");


