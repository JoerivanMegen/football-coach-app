import { FeatureScreenPlaceholder } from '@/components/feature-screen-placeholder';

export default function SettingsScreen() {
  return (
    <FeatureScreenPlaceholder
      title="Settings"
      description="Keep team-level details and app preferences away from the main coaching workflows."
      nextSteps={[
        'Add team name, season, and age group.',
        'Choose default match duration and formation preferences.',
        'Prepare backup and export options later.',
      ]}
    />
  );
}
