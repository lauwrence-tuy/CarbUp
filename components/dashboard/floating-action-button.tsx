import Link from "next/link";
import { Plus } from "lucide-react";

type FloatingActionButtonProps = {
  href?: string;
};

const buttonClassName =
  "fixed bottom-7 right-7 z-30 flex size-[68px] items-center justify-center rounded-full bg-app-green text-black shadow-glow transition duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-app-green focus:ring-offset-2 focus:ring-offset-black lg:bottom-10 lg:right-10";

export function FloatingActionButton({ href }: FloatingActionButtonProps) {
  if (href) {
    return (
      <Link
        className={buttonClassName}
        href={href}
        aria-label="Add entry"
      >
        <Plus className="size-9" strokeWidth={2.4} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <button
      className={buttonClassName}
      type="button"
      aria-label="Add entry"
    >
      <Plus className="size-9" strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}
