"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function GlobalError({ error, unstable_retry }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16 text-slate-900 sm:px-6">
        <main className="w-full max-w-3xl rounded-2xl border border-zinc-300/40 bg-white p-8 text-center shadow-sm sm:p-10">
          <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-violet-700">
            Critical application error
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold sm:text-4xl">
            The app could not render this page.
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            Please retry. If this keeps happening, check server logs for details.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="mt-6 inline-flex h-11 items-center rounded-md bg-violet-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700/40"
          >
            Retry render
          </button>
          {error.digest ? (
            <p className="mt-4 font-mono text-xs text-zinc-500">Error digest: {error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
