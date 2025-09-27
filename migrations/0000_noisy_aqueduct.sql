CREATE TABLE "accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"balance" numeric(19, 4) DEFAULT '0' NOT NULL,
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"sub_accounts" text,
	"payment_due_date" varchar(10),
	"cut_off_date" varchar(10),
	"grace_period" varchar(10),
	"minimum_payment" numeric(19, 4),
	"interest_rate" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar,
	"provider" varchar(50) NOT NULL,
	"api_key" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"default_model" varchar(50) DEFAULT 'gpt-3.5-turbo' NOT NULL,
	"cache_duration" numeric(10, 0) DEFAULT '60' NOT NULL,
	"max_tokens" numeric(10, 0) DEFAULT '500' NOT NULL,
	"temperature" numeric(3, 2) DEFAULT '0.70' NOT NULL,
	"last_tested" timestamp,
	"test_result" text,
	"metadata" text,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"has_checking_account" boolean DEFAULT false,
	"has_credit_card" boolean DEFAULT false,
	"has_loan" boolean DEFAULT false,
	"has_overdraft" boolean DEFAULT false,
	"has_savings" boolean DEFAULT false,
	"credit_card_cut_off_date" varchar(10),
	"credit_card_due_date" varchar(10),
	"credit_card_grace_period" varchar(10),
	"credit_card_minimum_payment" numeric(19, 4),
	"credit_card_interest_rate" numeric(5, 2),
	"loan_due_date" varchar(10),
	"loan_grace_period" varchar(10),
	"loan_minimum_payment" numeric(19, 4),
	"loan_interest_rate" numeric(5, 2),
	"overdraft_limit" numeric(19, 4),
	"overdraft_interest_rate" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "credits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(20) NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"remaining_amount" numeric(19, 4) NOT NULL,
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"interest_rate" numeric(5, 2),
	"account_id" varchar,
	"institution" varchar(100),
	"account_number" varchar(50),
	"start_date" timestamp NOT NULL,
	"due_date" timestamp,
	"maturity_date" timestamp,
	"minimum_payment" numeric(19, 4),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_payment_date" timestamp,
	"last_payment_amount" numeric(19, 4),
	"metadata" text,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"amount" numeric(19, 4) NOT NULL,
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"category" varchar(50),
	"account_id" varchar,
	"type" varchar(20) NOT NULL,
	"recurrence" varchar(20) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_processed" timestamp,
	"next_due_date" timestamp,
	"metadata" text,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forecasts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(20) NOT NULL,
	"scenario" varchar(50),
	"forecast_date" timestamp NOT NULL,
	"target_date" timestamp NOT NULL,
	"predicted_value" numeric(19, 4) NOT NULL,
	"confidence_interval" numeric(5, 2),
	"lower_bound" numeric(19, 4),
	"upper_bound" numeric(19, 4),
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"category" varchar(50),
	"account_id" varchar,
	"parameters" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"accuracy" numeric(5, 2),
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(20) NOT NULL,
	"symbol" varchar(20),
	"quantity" numeric(19, 8) NOT NULL,
	"purchase_price" numeric(19, 8) NOT NULL,
	"current_price" numeric(19, 8),
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"purchase_date" timestamp NOT NULL,
	"account_id" varchar,
	"category" varchar(50),
	"risk_level" varchar(20) DEFAULT 'medium',
	"is_active" boolean DEFAULT true NOT NULL,
	"last_updated" timestamp DEFAULT NOW() NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" varchar NOT NULL,
	"inviter_user_id" varchar NOT NULL,
	"invited_email" text NOT NULL,
	"invited_user_id" varchar,
	"team_role" varchar(20) DEFAULT 'member' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"invite_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"accepted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "simulation_runs" (
	"id" varchar(255) PRIMARY KEY DEFAULT '83330e33-ba42-4d78-bff1-48980edb27e1' NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"parameters" jsonb NOT NULL,
	"results" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"trigger_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_dismissed" boolean DEFAULT false NOT NULL,
	"account_id" varchar,
	"transaction_id" varchar,
	"metadata" text,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"dismissed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"team_role" varchar(20) DEFAULT 'member' NOT NULL,
	"permissions" text[],
	"joined_at" timestamp DEFAULT NOW() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_id" varchar NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"logo" text,
	"domain" varchar(255),
	"theme" text DEFAULT '{"primary":"#3b82f6","secondary":"#1e40af","accent":"#8b5cf6"}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL,
	CONSTRAINT "tenants_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"type" varchar(20) NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(50),
	"virman_pair_id" varchar,
	"date" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"email_verified" timestamp,
	"reset_token" text,
	"reset_token_expires" timestamp,
	"role" varchar(20) DEFAULT 'personal_user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"last_login" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;