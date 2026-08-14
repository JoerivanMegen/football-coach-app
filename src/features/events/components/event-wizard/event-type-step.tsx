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
import { useI18n } from '@/i18n/i18n-provider';
import type { TranslationKey } from '@/i18n/generated/translations';

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
  const { t } = useI18n();

  return (
    <ThemedView style={styles.stepContent}>
      <ThemedText type="smallBold">{t('training.add_training.steps.type')}</ThemedText>
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
                  <ThemedText type="smallBold">{getEventTypeLabel(type, t)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {getEventTypeDescription(type, t)}
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

export function getEventTypeLabel(type: EventType, t: (key: TranslationKey) => string) {
  switch (type) {
    case 'training':
      return t('training.add_training.types.training.label');
    case 'match':
      return t('training.add_training.types.match.label');
    case 'other':
      return t('training.add_training.types.other.label');
  }
}

function getEventTypeDescription(type: EventType, t: (key: TranslationKey) => string) {
  switch (type) {
    case 'training':
      return t('training.add_training.types.training.description');
    case 'match':
      return t('training.add_training.types.match.description');
    case 'other':
      return t('training.add_training.types.other.description');
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
