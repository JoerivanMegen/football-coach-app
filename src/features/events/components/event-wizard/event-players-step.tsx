import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { eventWizardStyles as styles } from '@/features/events/components/event-wizard/event-wizard-styles';
import {
  SignupStatuses,
  type EventWizardFormState,
  type SignupStatus,
} from '@/features/events/components/event-wizard/event-wizard-types';
import type { Player } from '@/features/players/player-types';

type EventPlayersStepProps = {
  players: Player[];
  form: EventWizardFormState;
  onChangeForm: (nextForm: EventWizardFormState) => void;
};

export function EventPlayersStep({ players, form, onChangeForm }: EventPlayersStepProps) {
  return (
    <ThemedView style={styles.stepContent}>
      <ThemedText type="smallBold">Player availability</ThemedText>
      {players.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptyWizardPanel}>
          <ThemedText type="small" themeColor="textSecondary">
            Add players first to plan availability for this event.
          </ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.availabilityList}>
          {players.map((player) => (
            <ThemedView key={player.id} type="backgroundElement" style={styles.availabilityRow}>
              <ThemedText type="smallBold">
                {player.firstName} {player.lastName}
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.availabilityOptions}>
                {SignupStatuses.map((status) => {
                  const isSelected = (form.playerStatuses[player.id] ?? 'unknown') === status;

                  return (
                    <Pressable
                      key={status}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() =>
                        onChangeForm({
                          ...form,
                          playerStatuses: {
                            ...form.playerStatuses,
                            [player.id]: status,
                          },
                        })
                      }
                      style={({ pressed }) => [
                        styles.availabilityOption,
                        isSelected && styles.availabilityOptionSelected,
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={isSelected && styles.availabilityOptionSelectedText}>
                        {getSignupStatusLabel(status)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ThemedView>
            </ThemedView>
          ))}
        </ThemedView>
      )}
    </ThemedView>
  );
}

export function getSignupStatusLabel(status: SignupStatus) {
  switch (status) {
    case 'available':
      return 'Available';
    case 'unavailable':
      return 'Out';
    case 'unknown':
      return 'Unknown';
  }
}
