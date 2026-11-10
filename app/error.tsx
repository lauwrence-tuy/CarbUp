"use client";

import Link from "next/link";
import {
  StatusPage,
  statusPrimaryClass,
  statusSecondaryClass
} from "@/components/carbon/status-page";

export default function ErrorPage({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StatusPage
      label="Something went wrong"
      title="This page needs a refresh"
      description="The page hit a temporary error. Try again, or head back home."
      actions={
        <>
          <button className={statusPrimaryClass} onClick={reset} type="button">
            Try again
          </button>
          <Link className={statusSecondaryClass} href="/">
            Home
          </Link>
        </>
      }
    />
  );
}
