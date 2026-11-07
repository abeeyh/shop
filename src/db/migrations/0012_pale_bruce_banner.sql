CREATE TYPE "public"."bug_report_status" AS ENUM('novo', 'resolvido');--> statement-breakpoint
CREATE TABLE "bug_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text NOT NULL,
	"email" text,
	"page" text NOT NULL,
	"error_id" text,
	"request_id" text NOT NULL,
	"locale" text NOT NULL,
	"region" text,
	"timezone" text,
	"user_agent" text,
	"release" text NOT NULL,
	"status" "bug_report_status" DEFAULT 'novo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "bug_reports_status_created_idx" ON "bug_reports" USING btree ("status","created_at");