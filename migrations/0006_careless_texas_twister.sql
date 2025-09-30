CREATE TABLE "cashbox_audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"cashbox_id" varchar(255),
	"transaction_id" varchar(255),
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"changes" jsonb,
	"reason" varchar(500),
	"ip_address" varchar(45),
	"user_agent" varchar(1000),
	"created_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cashbox_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"cashbox_id" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"description" varchar(1000),
	"reference" varchar(255),
	"transfer_to_cashbox_id" varchar(255),
	"transfer_from_cashbox_id" varchar(255),
	"balance_after" numeric(19, 4) NOT NULL,
	"is_reconciled" boolean DEFAULT false NOT NULL,
	"reconciled_at" timestamp,
	"reconciled_by" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cashboxes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"location" varchar(255),
	"current_balance" numeric(19, 4) DEFAULT '0' NOT NULL,
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cashbox_audit_logs" ADD CONSTRAINT "cashbox_audit_logs_cashbox_id_cashboxes_id_fk" FOREIGN KEY ("cashbox_id") REFERENCES "public"."cashboxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashbox_audit_logs" ADD CONSTRAINT "cashbox_audit_logs_transaction_id_cashbox_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."cashbox_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashbox_transactions" ADD CONSTRAINT "cashbox_transactions_cashbox_id_cashboxes_id_fk" FOREIGN KEY ("cashbox_id") REFERENCES "public"."cashboxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashbox_transactions" ADD CONSTRAINT "cashbox_transactions_transfer_to_cashbox_id_cashboxes_id_fk" FOREIGN KEY ("transfer_to_cashbox_id") REFERENCES "public"."cashboxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashbox_transactions" ADD CONSTRAINT "cashbox_transactions_transfer_from_cashbox_id_cashboxes_id_fk" FOREIGN KEY ("transfer_from_cashbox_id") REFERENCES "public"."cashboxes"("id") ON DELETE no action ON UPDATE no action;