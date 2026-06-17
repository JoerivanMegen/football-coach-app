import { FeatureScreenPlaceholder } from '@/components/feature-screen-placeholder';

export default function MatchDayScreen() {
  return (
    <FeatureScreenPlaceholder
      title="Match Day"
      description="Prepare the team sheet and capture match moments while the game is happening."
      nextSteps={[
        'Select the match event for today.',
        'Build a simple lineup and substitutes flow.',
        'Record goals, assists, cards, substitutions, and notes.',
      ]}
    />
  );
}
