"use client";

import Link from "next/link";

export default function ErrorPage({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-app-bg px-5 text-white">
      <section className="w-full max-w-lg rounded-[28px] border border-white/[0.06] bg-app-card p-6 text-center shadow-card">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-app-secondary">
          CarbUp
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">
          Something needs a refresh
        </h1>
        <p className="mt-3 text-sm leading-6 text-app-secondary">
          The page hit a temporary app error. Try again or return home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            className="min-h-11 rounded-full bg-app-green px-5 text-sm font-bold text-black"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
          <Link
            className="inline-flex min-h-11 items-center rounded-full bg-white/[0.08] px-5 text-sm font-bold text-white"
            href="/"
          >
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
