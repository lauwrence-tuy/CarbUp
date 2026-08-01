import Link from "next/link";
import { Mail } from "lucide-react";
import { InfoBlock, SettingsStaticPage } from "@/components/settings/settings-static-page";

export default function SendFeedbackPage() {
  return (
    <SettingsStaticPage
      eyebrow="Feedback"
      title="Send Feedback"
      description="Share what feels confusing, what should be faster, or what you want the dashboard to show next."
    >
      <InfoBlock title="What helps most">
        Include what you expected to happen, what actually happened, and whether
        you were connected to Strava when you saw it.
      </InfoBlock>
      <Link
        className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-app-green px-6 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5"
        href="mailto:?subject=CarbUp%20Feedback"
      >
        <Mail className="size-4" aria-hidden="true" />
        Draft Feedback Email
      </Link>
    </SettingsStaticPage>
  );
}
