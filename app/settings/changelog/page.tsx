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
      <InfoBlock title="0.3.0 — The redesign">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            A new look on every page: rounded dark cards, bold type, and yellow
            buttons, with the same header and navigation everywhere. On phones
            the navigation opens from a menu button.
          </li>
          <li>
            New home page that explains how CarbUp works, with a live
            &ldquo;today&rdquo; preview, a feature overview, and answers to
            common questions. If you&rsquo;re already connected you go straight
            to your dashboard.
          </li>
          <li>
            New sample dashboard (&ldquo;See sample day&rdquo;) so you can try
            CarbUp before connecting Strava.
          </li>
          <li>
            Redesigned dashboard: pick a day from the week bar at the top, then
            see your fuel (calories left, base + rides = target, and macros) next
            to what you&rsquo;ve eaten at each meal, with that day&rsquo;s
            workouts below.
          </li>
          <li>
            The day&rsquo;s intensity tag now uses the same scale as your
            workouts, so a Very Hard ride makes a Very Hard day.
          </li>
          <li>
            Nutrition has the same week bar, showing calories eaten each day,
            with arrows to look back by week. Today is always on the right.
          </li>
          <li>
            Logging food is easier to follow: pick a food on the left, then set
            the amount and add it on the right, just above your food diary.
            &ldquo;Create a food&rdquo; and &ldquo;Scan a barcode&rdquo; sit
            side by side under search.
          </li>
          <li>
            Carbs, protein, and fat have their own colours (yellow, blue, and
            purple) on the dashboard and Nutrition pages.
          </li>
          <li>
            Workouts has search, date range, and activity type filters, and a
            cleaner list with intensity tags.
          </li>
          <li>
            Trends cards line up in even rows, and the Fitness &amp; Freshness
            hover readout is no longer squished.
          </li>
          <li>
            Settings is simpler: profile and goal side by side, a live preview
            of your targets, and Strava, TrainingPeaks, and the app version
            together in one card.
          </li>
          <li>
            Faster everywhere: pages load only what they show, and each page
            now shows its layout the moment you click instead of waiting.
          </li>
          <li>
            Strava sync is much quicker: after your first import it only
            fetches recent activities and saves only what changed.
          </li>
          <li>
            Workout pages show your stats straight away, with the route map
            and charts filling in a moment later, and open almost instantly
            the second time.
          </li>
          <li>
            Nutrition keeps the last 12 weeks; the week arrows stop there.
          </li>
          <li>
            Fixed: older Nutrition weeks could be missing your ride calories.
          </li>
          <li>
            Fixed: saving Settings a second time could switch your goal back to
            the one the page opened with.
          </li>
          <li>
            Fixed: connecting Strava could sometimes fail with &ldquo;login
            session expired&rdquo;.
          </li>
          <li>
            Fixed: the Nutrition portion menu could list the same serving twice,
            and two pages logged errors behind the scenes.
          </li>
          <li>
            Better keyboard and screen reader support, including labelled
            settings menus and chart activity dots you can tab to.
          </li>
        </ul>
      </InfoBlock>

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
