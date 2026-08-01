import { InfoBlock, SettingsStaticPage } from "@/components/settings/settings-static-page";

export default function PrivacyPolicyPage() {
  return (
    <SettingsStaticPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="A plain-language summary of how this local tracker handles your Strava and nutrition settings."
    >
      <InfoBlock title="Data stored">
        The app stores your Strava user ID, encrypted Strava tokens, synced
        activity summaries, calorie settings, units, and weight in the local app
        database.
      </InfoBlock>
      <InfoBlock title="Data use">
        Stored data is used to calculate calorie targets, macro targets, ride
        calories, and dashboard summaries. It is not sold or used for ads.
      </InfoBlock>
      <InfoBlock title="Disconnecting">
        Disconnecting Strava revokes the app token when Strava accepts the
        request, clears your local session, and sends you back to the home page.
      </InfoBlock>
    </SettingsStaticPage>
  );
}
