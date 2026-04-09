import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  articles,
  conversations,
  feeds,
  messages,
  rawArticles,
  transformationJobs,
} from "@/src/db/schema";

export type FeedRow = InferSelectModel<typeof feeds>;
export type FeedInsert = InferInsertModel<typeof feeds>;

export type RawArticleRow = InferSelectModel<typeof rawArticles>;
export type RawArticleInsert = InferInsertModel<typeof rawArticles>;

export type ArticleRow = InferSelectModel<typeof articles>;
export type ArticleInsert = InferInsertModel<typeof articles>;

export type ConversationRow = InferSelectModel<typeof conversations>;
export type ConversationInsert = InferInsertModel<typeof conversations>;

export type MessageRow = InferSelectModel<typeof messages>;
export type MessageInsert = InferInsertModel<typeof messages>;

export type TransformationJobRow = InferSelectModel<typeof transformationJobs>;
export type TransformationJobInsert = InferInsertModel<typeof transformationJobs>;

export interface DbTableRows {
  feeds: FeedRow;
  rawArticles: RawArticleRow;
  articles: ArticleRow;
  conversations: ConversationRow;
  messages: MessageRow;
  transformationJobs: TransformationJobRow;
}

export interface DbTableInserts {
  feeds: FeedInsert;
  rawArticles: RawArticleInsert;
  articles: ArticleInsert;
  conversations: ConversationInsert;
  messages: MessageInsert;
  transformationJobs: TransformationJobInsert;
}
