import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserId } from "@/lib/session";
import { InfoPageFrame } from "./info-page-frame";

type SettingsStaticPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

/** Shared layout for the Settings info pages (changelog, help, legal…). */
export async function SettingsStaticPage({
  eyebrow,
  title,
  description,
  children
}: SettingsStaticPageProps) {
  const userId = await getCurrentUserId();

  return (
    <InfoPageFrame
      isConnected={Boolean(userId)}
      eyebrow={eyebrow}
      title={title}
      description={description}
      backLink={
        <Link
          href={userId ? "/settings" : "/"}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-cds-layer px-4 text-sm font-bold text-cds-text-secondary transition hover:bg-cds-layer-hover hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {userId ? "Settings" : "Home"}
        </Link>
      }
    >
      {children}
    </InfoPageFrame>
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
    <section className="rounded-[22px] border border-white/[0.05] bg-black/30 p-5 sm:p-6">
      <h2 className="cu-heading-03">{title}</h2>
      <div className="cu-body-01 mt-3 leading-6 text-cds-text-secondary">{children}</div>
    </section>
  );
}
