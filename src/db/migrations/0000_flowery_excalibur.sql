CREATE TABLE "access_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" "inet",
	"port" integer,
	"user_id" text,
	"session_id" text,
	"method" text NOT NULL,
	"route" text NOT NULL,
	"request_id" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "access_logs_occurred_at_idx" ON "access_logs" USING btree ("occurred_at");