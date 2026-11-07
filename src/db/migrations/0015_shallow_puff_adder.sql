CREATE TABLE "support_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weekday" integer NOT NULL,
	"start_min" integer NOT NULL,
	"end_min" integer NOT NULL,
	CONSTRAINT "support_hours_range" CHECK ("support_hours"."weekday" between 0 and 6 and "support_hours"."start_min" between 0 and 1439 and "support_hours"."end_min" between 0 and 1439)
);
