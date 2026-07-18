import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { eventWizardStyles as styles } from '@/features/events/components/event-wizard/event-wizard-styles';
import {
  EventTypes,
  type EventType,
} from '@/features/events/components/event-wizard/event-wizard-types';
import { useTheme } from '@/hooks/use-theme';

type EventTypeStepProps = {
  eventTypes?: readonly EventType[];
  selectedType: EventType | null;
  onSelectType: (type: EventType) => void;
};

export function EventTypeStep({
  eventTypes = EventTypes,
  selectedType,
  onSelectType,
}: EventTypeStepProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.stepContent}>
      <ThemedText type="smallBold">Event type</ThemedText>
      <ThemedView style={styles.typeGrid}>
        {eventTypes.map((type) => {
          const isSelected = selectedType === type;

          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectType(type)}
              style={({ pressed }) => [styles.typeOption, pressed && styles.pressed]}>
              <ThemedView
                type={isSelected ? 'backgroundSelected' : 'backgroundElement'}
                style={styles.typeOptionInner}>
                <SymbolView name={getEventTypeIcon(type)} tintColor={theme.text} size={22} />
                <ThemedView type={isSelected ? 'backgroundSelected' : 'backgroundElement'}>
                  <ThemedText type="smallBold">{getEventTypeLabel(type)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {getEventTypeDescription(type)}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

export function getEventTypeLabel(type: EventType) {
  switch (type) {
    case 'training':
      return 'Training';
    case 'match':
      return 'Match';
    case 'other':
      return 'Other';
  }
}

function getEventTypeDescription(type: EventType) {
  switch (type) {
    case 'training':
      return 'Training session or practice.';
    case 'match':
      return 'Fixture, friendly, or tournament match.';
    case 'other':
      return 'Team night, meeting, or custom event.';
  }
}

function getEventTypeIcon(type: EventType): SymbolViewProps['name'] {
  switch (type) {
    case 'training':
      return { ios: 'figure.soccer', android: 'exercise', web: 'exercise' };
    case 'match':
      return { ios: 'sportscourt.fill', android: 'sports_soccer', web: 'sports_soccer' };
    case 'other':
      return { ios: 'star.fill', android: 'celebration', web: 'celebration' };
  }
}
