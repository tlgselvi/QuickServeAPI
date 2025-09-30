CREATE TABLE "bank_integrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"bank_name" varchar(255) NOT NULL,
	"bank_code" varchar(50) NOT NULL,
	"account_number" varchar(100) NOT NULL,
	"account_type" varchar(50) NOT NULL,
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"api_endpoint" varchar(500),
	"api_key" varchar(500),
	"credentials" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp,
	"sync_status" varchar(20) DEFAULT 'idle',
	"sync_error" varchar(1000),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"bank_integration_id" varchar(255) NOT NULL,
	"external_transaction_id" varchar(255) NOT NULL,
	"account_id" varchar(255),
	"date" timestamp NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"description" varchar(1000),
	"reference" varchar(255),
	"category" varchar(100),
	"subcategory" varchar(100),
	"balance" numeric(19, 4),
	"transaction_type" varchar(50) NOT NULL,
	"is_reconciled" boolean DEFAULT false NOT NULL,
	"reconciled_at" timestamp,
	"reconciled_by" varchar(255),
	"is_imported" boolean DEFAULT false NOT NULL,
	"import_source" varchar(50),
	"import_batch_id" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"bank_integration_id" varchar(255),
	"file_name" varchar(255),
	"file_type" varchar(20) NOT NULL,
	"file_size" integer,
	"total_records" integer DEFAULT 0,
	"processed_records" integer DEFAULT 0,
	"successful_records" integer DEFAULT 0,
	"failed_records" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'pending',
	"error_message" varchar(1000),
	"validation_errors" jsonb,
	"duplicate_records" jsonb,
	"start_date" timestamp,
	"end_date" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"bank_integration_id" varchar(255),
	"bank_transaction_id" varchar(255),
	"system_transaction_id" varchar(255),
	"match_type" varchar(50) NOT NULL,
	"match_score" numeric(5, 2),
	"status" varchar(20) NOT NULL,
	"reason" varchar(500),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_integration_id_bank_integrations_id_fk" FOREIGN KEY ("bank_integration_id") REFERENCES "public"."bank_integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_bank_integration_id_bank_integrations_id_fk" FOREIGN KEY ("bank_integration_id") REFERENCES "public"."bank_integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_logs" ADD CONSTRAINT "reconciliation_logs_bank_integration_id_bank_integrations_id_fk" FOREIGN KEY ("bank_integration_id") REFERENCES "public"."bank_integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_logs" ADD CONSTRAINT "reconciliation_logs_bank_transaction_id_bank_transactions_id_fk" FOREIGN KEY ("bank_transaction_id") REFERENCES "public"."bank_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_logs" ADD CONSTRAINT "reconciliation_logs_system_transaction_id_transactions_id_fk" FOREIGN KEY ("system_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;