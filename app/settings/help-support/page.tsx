import { InfoBlock, SettingsStaticPage } from "@/components/settings/settings-static-page";

export default function HelpSupportPage() {
  return (
    <SettingsStaticPage
      eyebrow="Support"
      title="Help & Support"
      description="Quick answers for common setup, syncing, and calorie target questions."
    >
      <InfoBlock title="Strava will not connect">
        Check that your Strava app credentials are set in the environment file,
        then retry the connection from Settings. The app needs activity read
        permission to import rides.
      </InfoBlock>
      <InfoBlock title="Ride calories look wrong">
        Strava activity calories are imported as reported by Strava. Sync again
        from the dashboard after editing an activity in Strava.
      </InfoBlock>
      <InfoBlock title="Targets feel too high or low">
        Update Base TDEE, weight, units, and goal mode in Settings. Strava ride
        calories are added after that base target is calculated.
      </InfoBlock>
    </SettingsStaticPage>
  );
}
