CREATE TABLE "budget_lines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(100) NOT NULL,
	"planned_amount" numeric(19, 4) NOT NULL,
	"actual_amount" numeric(19, 4) DEFAULT '0' NOT NULL,
	"month" timestamp NOT NULL,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"principal" numeric(19, 4) NOT NULL,
	"interest_rate" numeric(5, 2) NOT NULL,
	"term_months" varchar(10) NOT NULL,
	"start_date" timestamp NOT NULL,
	"payment_type" varchar(20) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "simulation_runs" ALTER COLUMN "id" SET DEFAULT '8bd9f0bf-65fa-4a4f-a3ea-d0b387dde095';