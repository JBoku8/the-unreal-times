import "dotenv/config";
import postgres from "postgres";
import { env } from "@/src/env";

async function main() {
  const force = process.argv.includes("--yes");
  if (!force) {
    throw new Error(
      'Refusing to run without confirmation. Re-run with "--yes".',
    );
  }
  const shouldDrop = process.argv.includes("--drop");

  const sql = postgres(env.DATABASE_URL, { prepare: false });

  try {
    if (shouldDrop) {
      await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
      await sql.unsafe("CREATE SCHEMA public");
      await sql.unsafe("GRANT ALL ON SCHEMA public TO postgres");
      await sql.unsafe("GRANT ALL ON SCHEMA public TO public");

      console.log(
        "Dropped and recreated public schema. Re-run migrations with `pnpm db:migrate`.",
      );
      return;
    }

    await sql`TRUNCATE TABLE feeds CASCADE`;
    console.log(
      "Cleared feeds table (cascade applied to dependent tables: articles, conversations, messages).",
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
