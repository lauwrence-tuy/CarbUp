import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Flame } from "lucide-react";
import { getCurrentUserId } from "@/lib/session";

type SettingsStaticPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export async function SettingsStaticPage({
  eyebrow,
  title,
  description,
  children
}: SettingsStaticPageProps) {
  const userId = await getCurrentUserId();

  return (
    <main className="min-h-screen bg-app-bg text-white">
      <div className="mx-auto min-h-screen w-full max-w-5xl px-5 pb-24 pt-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-6 rounded-[28px] border border-white/[0.04] bg-app-card/72 px-5 py-4 shadow-card backdrop-blur lg:px-6">
          <Link
            href={userId ? "/dashboard" : "/"}
            className="flex items-center gap-3"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-app-card text-app-green shadow-card">
              <Flame className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-bold tracking-[-0.04em] sm:text-xl">
                Carb
                <span className="text-app-green">Up</span>
              </p>
            </div>
          </Link>
          <Link
            href="/settings"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/[0.08] px-5 text-sm font-bold text-white transition hover:bg-white/[0.12]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Settings
          </Link>
        </header>

        <section className="mt-8 rounded-[32px] border border-white/[0.05] bg-app-card p-6 shadow-card sm:p-8">
          <p className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-app-secondary">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl text-5xl font-bold leading-none tracking-[-0.04em] text-white sm:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-app-secondary">
            {description}
          </p>

          <div className="mt-8 grid gap-4">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function InfoBlock({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-white/[0.05] bg-black/24 p-5">
      <h2 className="text-xl font-bold tracking-[-0.03em] text-white">
        {title}
      </h2>
      <div className="mt-3 text-sm leading-6 text-app-secondary">
        {children}
      </div>
    </section>
  );
}
