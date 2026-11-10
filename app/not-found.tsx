import Link from "next/link";
import {
  StatusPage,
  statusPrimaryClass,
  statusSecondaryClass
} from "@/components/carbon/status-page";

export default function NotFoundPage() {
  return (
    <StatusPage
      label="404"
      title="Page not found"
      description="This page isn't available. It may have moved, or the link may be out of date."
      actions={
        <>
          <Link className={statusPrimaryClass} href="/">
            Home
          </Link>
          <Link className={statusSecondaryClass} href="/dashboard">
            Dashboard
          </Link>
        </>
      }
    />
  );
}
