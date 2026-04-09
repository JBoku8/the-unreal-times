CREATE TABLE "transformation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_article_id" uuid NOT NULL,
	"transformation_type" varchar(64) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transformation_jobs_raw_article_type_uniq" UNIQUE("raw_article_id","transformation_type")
);
--> statement-breakpoint
ALTER TABLE "transformation_jobs" ADD CONSTRAINT "transformation_jobs_raw_article_id_raw_articles_id_fk" FOREIGN KEY ("raw_article_id") REFERENCES "public"."raw_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transformation_jobs_raw_article_id_idx" ON "transformation_jobs" USING btree ("raw_article_id");--> statement-breakpoint
CREATE INDEX "transformation_jobs_status_idx" ON "transformation_jobs" USING btree ("status");