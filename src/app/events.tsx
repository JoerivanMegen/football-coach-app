import { FeatureScreenPlaceholder } from '@/components/feature-screen-placeholder';

export default function EventsScreen() {
  return (
    <FeatureScreenPlaceholder
      title="Events"
      description="Plan training sessions, friendlies, and team activities from one calendar-style area."
      nextSteps={[
        'Create an events table with date, type, opponent, and notes.',
        'Track attendance per event.',
        'Summarize training and match participation over time.',
      ]}
    />
  );
}
