import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { listEventAttendancePlayersAsync } from '@/features/events/event-repository';
import type { CoachEvent, EventAttendancePlayer } from '@/features/events/event-types';
import { isTrainingAttendanceOverdue } from '@/features/notifications/match-result-notifications';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/i18n-provider';

type EventSectionProps = {
  title: string;
  description: string;
  events: CoachEvent[];
  actionLabel?: string;
  onEventAction?: (event: CoachEvent) => void;
  onEditAttendance?: (event: CoachEvent) => void;
  onEditEvent?: (event: CoachEvent) => void;
  onCancelEvent?: (event: CoachEvent) => void;
};

export function EventSection({
  title,
  description,
  events,
  actionLabel,
  onEventAction,
  onEditAttendance,
  onEditEvent,
  onCancelEvent,
}: EventSectionProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [isSectionExpanded, setIsSectionExpanded] = useState(true);
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);

  function toggleSection() {
    setIsSectionExpanded((current) => {
      const nextValue = !current;

      if (!nextValue) {
        setExpandedEventId(null);
      }

      return nextValue;
    });
  }

  return (
    <ThemedView style={styles.eventSection}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isSectionExpanded }}
        onPress={toggleSection}
        style={({ pressed }) => [styles.sectionHeader, pressed && styles.pressed]}>
        <ThemedView style={styles.sectionTitleGroup}>
          <ThemedText type="smallBold">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t(
              events.length === 1
                ? 'training.sections.count'
                : 'training.sections.count_plural',
              { count: events.length },
            )}
          </ThemedText>
        </ThemedView>
        <SymbolView
          name={{
            ios: isSectionExpanded ? 'chevron.up' : 'chevron.down',
            android: isSectionExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down',
            web: isSectionExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down',
          }}
          tintColor={theme.text}
          size={18}
        />
      </Pressable>

      {!isSectionExpanded ? null : events.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptySectionPanel}>
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.eventList}>
          {events.map((event) => (
            <EventCard
              key={event.id}
              actionLabel={actionLabel}
              event={event}
              expandedEventId={expandedEventId}
              onEditAttendance={onEditAttendance}
              onEditEvent={onEditEvent}
              onCancelEvent={onCancelEvent}
              onEventAction={onEventAction}
              onToggleExpanded={setExpandedEventId}
            />
          ))}
        </ThemedView>
      )}
    </ThemedView>
  );
}

function EventCard({
  actionLabel,
  event,
  expandedEventId,
  onEditAttendance,
  onEditEvent,
  onCancelEvent,
  onEventAction,
  onToggleExpanded,
}: {
  actionLabel?: string;
  event: CoachEvent;
  expandedEventId: number | null;
  onEditAttendance?: (event: CoachEvent) => void;
  onEditEvent?: (event: CoachEvent) => void;
  onCancelEvent?: (event: CoachEvent) => void;
  onEventAction?: (event: CoachEvent) => void;
  onToggleExpanded: (eventId: number | null) => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [attendancePlayers, setAttendancePlayers] = useState<EventAttendancePlayer[] | null>(null);
  const isExpanded = expandedEventId === event.id;
  const showAttendanceReminder =
    event.type === 'training' &&
    isTrainingAttendanceOverdue(
      event.eventDate,
      event.startTime,
      event.attendanceStatus,
    );

  async function toggleExpanded() {
    const shouldExpand = !isExpanded;
    onToggleExpanded(shouldExpand ? event.id : null);

    if (!shouldExpand || event.attendanceStatus !== 'marked' || attendancePlayers) {
      return;
    }

    setIsLoadingDetails(true);

    try {
      setAttendancePlayers(await listEventAttendancePlayersAsync(event.id));
    } finally {
      setIsLoadingDetails(false);
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.eventCard}>
      {showAttendanceReminder ? <ThemedView style={styles.notificationDot} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={toggleExpanded}
        style={({ pressed }) => [styles.eventCardToggle, pressed && styles.pressed]}>
        <ThemedView type="backgroundElement" style={styles.eventCardHeader}>
          <ThemedView type="backgroundElement" style={styles.eventTitleGroup}>
            <ThemedText type="default">
              {getCollapsedEventTitle(event, t('training.card.title'))}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatIsoDateForDisplay(event.eventDate)}
            </ThemedText>
          </ThemedView>
          <ThemedView type="backgroundElement" style={styles.eventTypeGroup}>
            <SymbolView
              name={{
                ios: isExpanded ? 'chevron.up' : 'chevron.down',
                android: isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down',
                web: isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down',
              }}
              tintColor={theme.text}
              size={18}
            />
          </ThemedView>
        </ThemedView>

      </Pressable>

      {isExpanded ? (
        <>
          <EventCardDetails
            attendancePlayers={attendancePlayers}
            event={event}
            isLoading={isLoadingDetails}
          />
          <EventExpandedActions
            event={event}
            onEditAttendance={onEditAttendance}
            onEditEvent={onEditEvent}
            onCancelEvent={onCancelEvent}
          />
        </>
      ) : null}

      {actionLabel && onEventAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('training.card.action_for', {
            action: actionLabel,
            title: event.title,
          })}
          onPress={() => onEventAction(event)}
          style={({ pressed }) => [styles.cardActionButton, pressed && styles.pressed]}>
          <SymbolView
            name={{
              ios: 'checkmark.circle',
              android: 'check_circle',
              web: 'check_circle',
            }}
            tintColor="#ffffff"
            size={18}
          />
          <ThemedText type="smallBold" style={styles.cardActionButtonText}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

function EventExpandedActions({
  event,
  onEditAttendance,
  onEditEvent,
  onCancelEvent,
}: {
  event: CoachEvent;
  onEditAttendance?: (event: CoachEvent) => void;
  onEditEvent?: (event: CoachEvent) => void;
  onCancelEvent?: (event: CoachEvent) => void;
}) {
  const { t } = useI18n();

  if (!onEditAttendance && !onEditEvent && !onCancelEvent) {
    return null;
  }

  return (
    <ThemedView type="backgroundElement" style={styles.expandedActions}>
      <ThemedView type="backgroundElement" style={styles.expandedActionRow}>
        {event.attendanceStatus === 'marked' && onEditAttendance ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('training.card.edit_attendance_for', {
              title: event.title,
            })}
            onPress={() => onEditAttendance(event)}
            style={({ pressed }) => [
              styles.expandedActionButton,
              styles.editAttendanceButton,
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'checkmark.circle', android: 'fact_check', web: 'fact_check' }}
              tintColor="#1C7C54"
              size={18}
            />
            <ThemedText
              type="smallBold"
              style={[
                styles.expandedActionButtonText,
                styles.editAttendanceButtonText,
              ]}
            >
              {t('training.attendance.edit')}
            </ThemedText>
          </Pressable>
        ) : null}

        {onEditEvent ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('training.card.edit_for', {
              title: event.title,
            })}
            onPress={() => onEditEvent(event)}
            style={({ pressed }) => [
              styles.expandedActionButton,
              styles.editEventButton,
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
              tintColor="#F59E0B"
              size={18}
            />
            <ThemedText
              type="smallBold"
              style={[
                styles.expandedActionButtonText,
                styles.editEventButtonText,
              ]}
            >
              {t('training.actions.edit')}
            </ThemedText>
          </Pressable>
        ) : null}
      </ThemedView>

      {onCancelEvent ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('training.card.cancel_for', {
            title: event.title,
          })}
          onPress={() => onCancelEvent(event)}
          style={({ pressed }) => [
            styles.expandedActionButton,
            styles.cancelEventButton,
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'xmark.circle', android: 'cancel', web: 'cancel' }}
            tintColor="#B42318"
            size={18}
          />
          <ThemedText
            type="smallBold"
            style={[
              styles.expandedActionButtonText,
              styles.cancelEventButtonText,
            ]}
          >
            {t('training.actions.cancel')}
          </ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

function EventCardDetails({
  attendancePlayers,
  event,
  isLoading,
}: {
  attendancePlayers: EventAttendancePlayer[] | null;
  event: CoachEvent;
  isLoading: boolean;
}) {
  const { t } = useI18n();

  if (event.attendanceStatus !== 'marked') {
    return (
      <ThemedView type="backgroundElement" style={styles.eventDetailsPanel}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('training.card.signup_summary', {
            available: event.availableCount,
            unavailable: event.unavailableCount,
            unknown: event.unknownCount,
          })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('training.attendance.not_marked')}
        </ThemedText>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView type="backgroundElement" style={styles.eventDetailsPanel}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('training.attendance.loading')}
        </ThemedText>
      </ThemedView>
    );
  }

  const presentPlayers = attendancePlayers?.filter((player) => player.isPresent) ?? [];

  return (
    <ThemedView type="backgroundElement" style={styles.eventDetailsPanel}>
      <EventPlayerList
        title={t('training.attendance.attended')}
        players={presentPlayers}
        showMatchDetails={event.type === 'match'}
      />
    </ThemedView>
  );
}

function EventPlayerList({
  players,
  showMatchDetails,
  title,
}: {
  players: EventAttendancePlayer[];
  showMatchDetails: boolean;
  title: string;
}) {
  const { t } = useI18n();

  return (
    <ThemedView type="backgroundElement" style={styles.detailList}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {players.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('training.attendance.none')}
        </ThemedText>
      ) : showMatchDetails ? (
        <MatchAttendanceTable players={players} />
      ) : (
        players.map((player) => (
          <ThemedView key={player.playerId} type="backgroundElement" style={styles.detailPlayerRow}>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={player.isLate && styles.latePlayerText}>
              {player.firstName} {player.lastName}
            </ThemedText>
          </ThemedView>
        ))
      )}
    </ThemedView>
  );
}

function MatchAttendanceTable({ players }: { players: EventAttendancePlayer[] }) {
  const { t } = useI18n();

  return (
    <ThemedView type="backgroundElement" style={styles.matchAttendanceTable}>
      <ThemedView type="backgroundElement" style={styles.matchAttendanceHeaderRow}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.matchAttendanceNameCell}>
          {t('training.attendance.columns.name')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.matchAttendanceStatCell}>
          {t('training.attendance.columns.minutes')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.matchAttendanceStatCell}>
          {t('training.attendance.columns.rating')}
        </ThemedText>
      </ThemedView>

      {players.map((player) => (
        <ThemedView key={player.playerId} type="backgroundElement" style={styles.matchAttendanceRow}>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={[styles.matchAttendanceNameCell, player.isLate && styles.latePlayerText]}>
            {player.firstName} {player.lastName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.matchAttendanceStatCell}>
            {player.minutesPlayed === null ? '-' : player.minutesPlayed}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.matchAttendanceStatCell}>
            {player.matchRating === null ? '-' : player.matchRating}
          </ThemedText>
        </ThemedView>
      ))}
    </ThemedView>
  );
}

function getCollapsedEventTitle(event: CoachEvent, trainingLabel: string) {
  switch (event.type) {
    case 'training':
      return trainingLabel;
    case 'match':
      return event.title;
    case 'other':
      return event.title;
  }
}

function formatIsoDateForDisplay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  return [match[3], match[2], match[1]].join('-');
}

const styles = StyleSheet.create({
  eventSection: {
    gap: Spacing.two,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  sectionTitleGroup: {
    gap: Spacing.half,
  },
  eventList: {
    gap: Spacing.two,
  },
  eventCard: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
    position: 'relative',
  },
  notificationDot: {
    backgroundColor: '#FF7A1A',
    borderColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    position: 'absolute',
    right: -5,
    top: -5,
    width: 20,
    zIndex: 2,
  },
  eventCardToggle: {
    gap: Spacing.two,
  },
  eventCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  eventTitleGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  eventTypeGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  eventDetailsPanel: {
    borderRadius: Spacing.two,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  detailList: {
    gap: Spacing.one,
  },
  detailPlayerRow: {
    gap: Spacing.half,
  },
  matchAttendanceTable: {
    gap: Spacing.one,
  },
  matchAttendanceHeaderRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  matchAttendanceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 28,
  },
  matchAttendanceNameCell: {
    flex: 1,
  },
  matchAttendanceStatCell: {
    textAlign: 'right',
    width: 56,
  },
  latePlayerText: {
    color: '#F59E0B',
  },
  emptySectionPanel: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  cardActionButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#1C7C54',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.one,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    width: '100%',
  },
  cardActionButtonText: {
    color: '#ffffff',
    flexShrink: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  expandedActions: {
    gap: Spacing.two,
  },
  expandedActionRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  expandedActionButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.one,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  expandedActionButtonText: {
    flexShrink: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  editAttendanceButton: {
    backgroundColor: 'transparent',
    borderColor: '#1C7C54',
    borderWidth: 1.5,
  },
  editEventButton: {
    backgroundColor: 'transparent',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
  },
  cancelEventButton: {
    backgroundColor: 'transparent',
    borderColor: '#B42318',
    borderWidth: 1.5,
  },
  editAttendanceButtonText: {
    color: '#1C7C54',
  },
  editEventButtonText: {
    color: '#F59E0B',
  },
  cancelEventButtonText: {
    color: '#B42318',
  },
  pressed: {
    opacity: 0.7,
  },
});
