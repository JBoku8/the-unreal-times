ALTER TABLE "conversations" ADD COLUMN "browser_id" varchar(128) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "conversations_article_browser_idx" ON "conversations" USING btree ("article_id","browser_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_article_browser_active_uniq"
  ON "conversations" USING btree ("article_id","browser_id")
  WHERE "is_active" = true;
