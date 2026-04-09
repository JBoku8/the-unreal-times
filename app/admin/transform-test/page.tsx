import { desc } from "drizzle-orm";
import { TransformPreviewLab } from "@/src/features/admin/components/transform-preview-lab";
import { db } from "@/src/db/client";
import { rawArticles } from "@/src/db/schema";

export default async function TransformTestPage() {
  let rows: Array<{
    id: string;
    title: string;
    sourceName: string;
    createdAt: Date;
    rawContent: string;
    url: string;
  }> = [];

  try {
    rows = await db.query.rawArticles.findMany({
      columns: {
        id: true,
        title: true,
        sourceName: true,
        createdAt: true,
        rawContent: true,
        url: true,
      },
      orderBy: desc(rawArticles.createdAt),
      limit: 20,
    });
  } catch {
    rows = [];
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <TransformPreviewLab rawArticles={rows} />
    </div>
  );
}
