"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function ErrorPage({ error, unstable_retry }: ErrorPageProps) {
  useEffect(() => {
    console.error("Route segment error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-violet-700">
        Something broke
      </p>
      <h1 className="font-display mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
        We hit an unexpected error.
      </h1>
      <p className="mt-3 max-w-xl text-sm text-zinc-600">
        Try reloading this section. If the issue persists, please try again in a moment.
      </p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-6 inline-flex h-11 items-center rounded-md bg-violet-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700/40"
      >
        Try again
      </button>
      {error.digest ? (
        <p className="mt-4 font-mono text-xs text-zinc-500">Error digest: {error.digest}</p>
      ) : null}
    </main>
  );
}
