import { InfoBlock, SettingsStaticPage } from "@/components/settings/settings-static-page";

export default function TermsOfUsePage() {
  return (
    <SettingsStaticPage
      eyebrow="Legal"
      title="Terms of Use"
      description="The simple operating agreement for using CarbUp."
    >
      <InfoBlock title="Fitness guidance">
        Calorie and macro targets are estimates for personal tracking. They are
        not medical advice, nutrition counseling, or a substitute for a qualified
        professional.
      </InfoBlock>
      <InfoBlock title="Connected services">
        Strava data depends on Strava availability, permissions, and activity
        data quality. Imported values may change if activities are edited later.
      </InfoBlock>
      <InfoBlock title="Your responsibility">
        Use the app in a way that matches your health, training, and recovery
        needs. Stop using any target that feels unsafe or inappropriate.
      </InfoBlock>
    </SettingsStaticPage>
  );
}
