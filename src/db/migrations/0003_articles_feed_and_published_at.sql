ALTER TABLE "articles" ALTER COLUMN "transformation_type" SET DEFAULT 'humorous';--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "feed_id" uuid;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
UPDATE "articles" AS "a"
SET
  "feed_id" = "ra"."feed_id",
  "published_at" = "ra"."published_at"
FROM "raw_articles" AS "ra"
WHERE "a"."raw_article_id" = "ra"."id";--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "feed_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_feed_id_idx" ON "articles" USING btree ("feed_id");--> statement-breakpoint
CREATE INDEX "articles_feed_published_idx" ON "articles" USING btree ("feed_id","published_at");--> statement-breakpoint
CREATE INDEX "articles_type_feed_published_idx" ON "articles" USING btree ("transformation_type","feed_id","published_at");--> statement-breakpoint
