import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  vector,
  varchar,
} from "drizzle-orm/pg-core";

export const feeds = pgTable("feeds", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: varchar("url", { length: 1024 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const rawArticles = pgTable(
  "raw_articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    feedId: uuid("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    sourceName: varchar("source_name", { length: 255 }).notNull().default(""),
    title: varchar("title", { length: 512 }).notNull(),
    rawContent: text("raw_content").notNull(),
    url: varchar("url", { length: 2048 }).notNull().unique(),
    thumbnailUrl: varchar("thumbnail_url", { length: 2048 }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("raw_articles_feed_id_idx").on(table.feedId)],
);

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rawArticleId: uuid("raw_article_id")
      .notNull()
      .references(() => rawArticles.id, { onDelete: "cascade" }),
    feedId: uuid("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    transformationType: varchar("transformation_type", { length: 64 })
      .notNull()
      .default("humorous"),
    title: varchar("title", { length: 512 }).notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("articles_raw_article_id_idx").on(table.rawArticleId),
    index("articles_feed_id_idx").on(table.feedId),
    index("articles_feed_published_idx").on(table.feedId, table.publishedAt),
    index("articles_type_feed_published_idx").on(
      table.transformationType,
      table.feedId,
      table.publishedAt,
    ),
    unique("articles_raw_article_type_uniq").on(
      table.rawArticleId,
      table.transformationType,
    ),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    browserId: varchar("browser_id", { length: 128 }).notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("conversations_article_id_idx").on(table.articleId),
    index("conversations_article_browser_idx").on(table.articleId, table.browserId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 }).$type<"user" | "assistant">().notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    sequence: integer("sequence").default(0).notNull(),
  },
  (table) => [index("messages_conversation_id_idx").on(table.conversationId)],
);

export const transformationJobs = pgTable(
  "transformation_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rawArticleId: uuid("raw_article_id")
      .notNull()
      .references(() => rawArticles.id, { onDelete: "cascade" }),
    transformationType: varchar("transformation_type", { length: 64 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("transformation_jobs_raw_article_id_idx").on(table.rawArticleId),
    index("transformation_jobs_status_idx").on(table.status),
    unique("transformation_jobs_raw_article_type_uniq").on(
      table.rawArticleId,
      table.transformationType,
    ),
  ],
);
