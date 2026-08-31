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
        The dashboard no longer shows a &ldquo;Target: 0&rdquo; and empty macro
        bars before you&rsquo;ve set weight and goal &mdash; it falls back to
        2,400 kcal, the same as the nutrition page.
      </InfoBlock>

      <InfoBlock title="0.1.0 — Initial release">
        Strava connection, ride-calorie import, daily calorie and macro targets,
        the food diary, and saved meals.
      </InfoBlock>
    </SettingsStaticPage>
  );
}
