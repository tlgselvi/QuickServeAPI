CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100),
	"resource_id" varchar,
	"endpoint" varchar(255),
	"method" varchar(10),
	"status_code" integer,
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar(20) DEFAULT 'viewer' NOT NULL,
	"permissions" text[],
	"last_login" timestamp,
	"password_changed_at" timestamp DEFAULT NOW() NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"session_timeout" integer DEFAULT 3600 NOT NULL,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_two_factor_auth" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"secret" varchar(32) NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"backup_codes" varchar(255)[],
	"phone_number" varchar(20),
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"last_used" timestamp,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL,
	CONSTRAINT "user_two_factor_auth_user_id_unique" UNIQUE("user_id")
);
