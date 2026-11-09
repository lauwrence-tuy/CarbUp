import {
  InfoBlock,
  SettingsStaticPage
} from "@/components/settings/settings-static-page";
import { APP_VERSION } from "@/lib/app-meta";

export default function ChangelogPage() {
  return (
    <SettingsStaticPage
      eyebrow="Release notes"
      title="What's New"
      description={`You're on version ${APP_VERSION}.`}
    >
      <InfoBlock title="0.2.2 — Consistency and cleanup">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            Effort scores now match everywhere. The Dashboard, Workouts, and
            workout pages use Strava&rsquo;s Relative Effort when a workout has
            one, the same as Trends, so a workout shows the same number on every
            page.
          </li>
          <li>
            Workout durations no longer show &ldquo;60 min&rdquo; or &ldquo;1h
            60m&rdquo;; a workout just under an hour now reads &ldquo;1h
            0m&rdquo;.
          </li>
          <li>
            Invalid food entries, meals, and custom foods are rejected with a
            clear error instead of being saved as zeros.
          </li>
          <li>
            The navigation bar is the same on every page and announces the
            current page to screen readers.
          </li>
          <li>
            The button for deleting a saved meal is now labelled differently
            from the one for removing a diary entry.
          </li>
          <li>
            Behind the scenes: smaller, better-organized pages and automated
            tests for the calorie and macro math.
          </li>
        </ul>
      </InfoBlock>

      <InfoBlock title="0.2.1 — Strava calorie sync fix">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            Sync reuses calories it already has instead of re-fetching every
            activity.
          </li>
          <li>
            Requests to Strava are paced so a long history no longer burns
            through its rate limit.
          </li>
          <li>Sync backs off when Strava throttles it.</li>
          <li>
            Calories already imported are never wiped when Strava can&rsquo;t
            return them.
          </li>
        </ul>
      </InfoBlock>

      <InfoBlock title="0.2.0 — Food database">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            Nutrition search now covers a full food catalog instead of a short
            fixed list: ~7,800 built-in USDA foods, with branded items pulled
            from USDA and Open Food Facts on demand and saved for next time.
          </li>
          <li>
            Pick a serving (&ldquo;1 cup&rdquo;, &ldquo;100 g&rdquo;, …) or a
            gram amount when adding a food.
          </li>
          <li>
            Recent, Frequent, and Mine tabs above the food list; your most-used
            foods rise to the top of results over time.
          </li>
          <li>
            Scan a barcode (or type the digits) to look a product up.
          </li>
          <li>
            Create your own foods with per-serving macros, then edit or delete
            them.
          </li>
          <li>
            Typo-tolerant search — &ldquo;chiken brest&rdquo; still finds
            chicken breast.
          </li>
        </ul>
      </InfoBlock>

      <InfoBlock title="0.1.1 — Dashboard target fix">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            The dashboard no longer shows &ldquo;Target: 0&rdquo; and empty
            macro bars before you&rsquo;ve set your weight and goal.
          </li>
          <li>
            Until then it falls back to 2,400 kcal, the same as the nutrition
            page.
          </li>
        </ul>
      </InfoBlock>

      <InfoBlock title="0.1.0 — Initial release">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Strava connection.</li>
          <li>Ride-calorie import.</li>
          <li>Daily calorie and macro targets.</li>
          <li>Food diary.</li>
          <li>Saved meals.</li>
        </ul>
      </InfoBlock>
    </SettingsStaticPage>
  );
}
