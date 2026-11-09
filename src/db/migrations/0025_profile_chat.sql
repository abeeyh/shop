ALTER TABLE "support_conversations" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_conversations_user_idx" ON "support_conversations" USING btree ("user_id","status");