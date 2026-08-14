import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getMatchLocationLabel } from '@/features/events/components/event-wizard/event-details-step';
import { getEventTypeLabel } from '@/features/events/components/event-wizard/event-type-step';
import { getSignupStatusLabel } from '@/features/events/components/event-wizard/event-players-step';
import { eventWizardStyles as styles } from '@/features/events/components/event-wizard/event-wizard-styles';
import {
  type EventWizardFormState,
  type MatchLocation,
  type SignupStatus,
} from '@/features/events/components/event-wizard/event-wizard-types';
import type { Player } from '@/features/players/player-types';
import { useI18n } from '@/i18n/i18n-provider';

type EventReviewStepProps = {
  players: Player[];
  form: EventWizardFormState;
};

export function EventReviewStep({ players, form }: EventReviewStepProps) {
  const { t } = useI18n();
  const availablePlayers = players.filter(
    (player) => form.playerStatuses[player.id] === 'available'
  );

  return (
    <ThemedView style={styles.stepContent}>
      <ThemedView type="backgroundElement" style={styles.reviewPanel}>
        <ReviewRow label={t('training.add_training.review.type')} value={form.type ? getEventTypeLabel(form.type, t) : '-'} />
        <ReviewRow label={t('training.add_training.review.title')} value={form.title || '-'} />
        <ReviewRow label={t('training.add_training.review.date')} value={form.date || '-'} />
        <ReviewRow label={t('training.add_training.review.start_time')} value={form.startTime || '-'} />
        <ReviewRow label={t('training.add_training.review.location')} value={getLocationReviewValue(form, t)} />
        {form.type === 'match' ? <ReviewRow label={t('training.add_training.review.opponent')} value={form.opponent || '-'} /> : null}
        <ReviewRow label={t('training.add_training.review.players_tracked')} value={String(players.length)} />
        <ReviewRow
          label={getSignupStatusLabel('available', t)}
          value={String(countPlayersWithStatus(form.playerStatuses, 'available'))}
        />
        <ReviewRow
          label={getSignupStatusLabel('unavailable', t)}
          value={String(countPlayersWithStatus(form.playerStatuses, 'unavailable'))}
        />
        <ReviewRow
          label={getSignupStatusLabel('unknown', t)}
          value={String(countPlayersWithStatus(form.playerStatuses, 'unknown'))}
        />
      </ThemedView>

      <ThemedView style={styles.reviewPlayerList}>
        <ThemedText type="smallBold">{t('training.add_training.review.available_players')}</ThemedText>
        {availablePlayers.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.emptyWizardPanel}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('training.add_training.review.no_available_players')}
            </ThemedText>
          </ThemedView>
        ) : (
          availablePlayers.map((player) => (
            <ThemedView key={player.id} type="backgroundElement" style={styles.reviewPlayerRow}>
              <ThemedText type="smallBold">
                {player.firstName} {player.lastName}
              </ThemedText>
            </ThemedView>
          ))
        )}
      </ThemedView>
    </ThemedView>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.reviewRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.reviewValue}>
        {value}
      </ThemedText>
    </ThemedView>
  );
}

function countPlayersWithStatus(
  playerStatuses: Record<number, SignupStatus>,
  signupStatus: SignupStatus
) {
  return Object.values(playerStatuses).filter((status) => status === signupStatus).length;
}

function getLocationReviewValue(form: EventWizardFormState, t: ReturnType<typeof useI18n>['t']) {
  if (form.type === 'match' && isMatchLocation(form.location)) {
    return getMatchLocationLabel(form.location, t);
  }

  return form.location || '-';
}

function isMatchLocation(value: string): value is MatchLocation {
  return value === 'home' || value === 'away';
}
