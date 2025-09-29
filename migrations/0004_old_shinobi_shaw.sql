CREATE TABLE "aging_table" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"customer_supplier" varchar(255) NOT NULL,
	"invoice_number" varchar(100),
	"invoice_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"original_amount" numeric(19, 4) NOT NULL,
	"current_amount" numeric(19, 4) NOT NULL,
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"status" varchar(20) DEFAULT 'outstanding' NOT NULL,
	"days_outstanding" integer,
	"aging_bucket" varchar(20),
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"project_name" varchar(255) NOT NULL,
	"project_type" varchar(50) NOT NULL,
	"contract_value" numeric(19, 4) NOT NULL,
	"progress_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"billed_amount" numeric(19, 4) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(19, 4) DEFAULT '0' NOT NULL,
	"pending_amount" numeric(19, 4) DEFAULT '0' NOT NULL,
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"start_date" timestamp,
	"expected_completion_date" timestamp,
	"actual_completion_date" timestamp,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"description" varchar(500),
	"category" varchar(100),
	"interval" varchar(20) NOT NULL,
	"interval_count" integer DEFAULT 1 NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_processed" timestamp,
	"next_due_date" timestamp NOT NULL,
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
