import { NextResponse } from "next/server";
import { processJobBatch } from "@/src/features/feeds/services/process-articles";
import { env } from "@/src/env";

export async function POST(req: Request) {
  const providedKey = req.headers.get("x-admin-key");

  if (providedKey !== env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let batchSize = 10;
  try {
    const body = await req.json();
    if (typeof body?.batchSize === "number" && body.batchSize > 0) {
      batchSize = Math.min(body.batchSize, 50);
    }
  } catch {
    // no body or invalid JSON — use default
  }

  const result = await processJobBatch(batchSize);

  return NextResponse.json({ status: "ok", ...result });
}
