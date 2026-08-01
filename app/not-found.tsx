import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-app-bg px-5 text-white">
      <section className="w-full max-w-lg rounded-[28px] border border-white/[0.06] bg-app-card p-6 text-center shadow-card">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-app-secondary">
          CarbUp
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-app-secondary">
          This page is not available. Head back to the CarbUp home page.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-app-green px-5 text-sm font-bold text-black"
          href="/"
        >
          Home
        </Link>
      </section>
    </main>
  );
}
