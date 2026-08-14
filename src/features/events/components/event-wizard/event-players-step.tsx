import { SymbolView } from 'expo-symbols';
import { Alert, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { eventWizardStyles as styles } from '@/features/events/components/event-wizard/event-wizard-styles';
import {
  SignupStatuses,
  type EventWizardFormState,
  type SignupStatus,
} from '@/features/events/components/event-wizard/event-wizard-types';
import type { Player, PlayerInjury } from '@/features/players/player-types';
import { isPlayerInjuredOnDate } from '@/features/players/player-injury-utils';
import { useI18n } from '@/i18n/i18n-provider';

type EventPlayersStepProps = {
  players: Player[];
  form: EventWizardFormState;
  injuriesByPlayerId: Map<number, PlayerInjury[]>;
  onChangeForm: (nextForm: EventWizardFormState) => void;
};

export function EventPlayersStep({
  players,
  form,
  injuriesByPlayerId,
  onChangeForm,
}: EventPlayersStepProps) {
  const { t } = useI18n();

  function updatePlayerStatus(player: Player, status: SignupStatus) {
    const update = () =>
      onChangeForm({
        ...form,
        playerStatuses: {
          ...form.playerStatuses,
          [player.id]: status,
        },
      });

    if (
      status !== 'available' ||
      !isPlayerInjuredOnDate(player, form.date, injuriesByPlayerId)
    ) {
      update();
      return;
    }

    Alert.alert(
      t('training.add_training.players.injury_override.title'),
      t('training.add_training.players.injury_override.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('training.add_training.players.injury_override.action'),
          onPress: update,
        },
      ],
    );
  }

  return (
    <ThemedView style={styles.stepContent}>
      <ThemedText type="smallBold">
        {t('training.add_training.players.title')}
      </ThemedText>
      {players.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptyWizardPanel}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('training.add_training.players.empty')}
          </ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.availabilityList}>
          {players.map((player) => (
            <ThemedView key={player.id} type="backgroundElement" style={styles.availabilityRow}>
              <ThemedView style={styles.availabilityPlayerNameRow}>
                <ThemedText type="smallBold">
                  {player.firstName} {player.lastName}
                </ThemedText>
                {isPlayerInjuredOnDate(
                  player,
                  form.date,
                  injuriesByPlayerId,
                ) ? (
                  <SymbolView
                    accessibilityLabel={t(
                      'training.add_training.players.injured',
                    )}
                    name={{ ios: 'cross.case.fill', android: 'healing', web: 'healing' }}
                    tintColor="#B42318"
                    size={16}
                  />
                ) : null}
              </ThemedView>
              <ThemedView type="backgroundElement" style={styles.availabilityOptions}>
                {SignupStatuses.map((status) => {
                  const isSelected = (form.playerStatuses[player.id] ?? 'unknown') === status;

                  return (
                    <Pressable
                      key={status}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => updatePlayerStatus(player, status)}
                      style={({ pressed }) => [
                        styles.availabilityOption,
                        isSelected && styles.availabilityOptionSelected,
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={isSelected && styles.availabilityOptionSelectedText}>
                        {getSignupStatusLabel(status, t)}
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

export function getSignupStatusLabel(
  status: SignupStatus,
  t: ReturnType<typeof useI18n>['t'],
) {
  switch (status) {
    case 'available':
      return t('training.add_training.players.available');
    case 'unavailable':
      return t('training.add_training.players.out');
    case 'unknown':
      return t('training.add_training.players.unknown');
  }
}
