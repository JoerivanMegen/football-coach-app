import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getEventTypeLabel } from '@/features/events/components/event-wizard/event-type-step';
import { listEventAttendancePlayersAsync } from '@/features/events/event-repository';
import type { CoachEvent, EventAttendancePlayer } from '@/features/events/event-types';
import { useTheme } from '@/hooks/use-theme';

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
            {events.length} {events.length === 1 ? 'event' : 'events'}
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
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [attendancePlayers, setAttendancePlayers] = useState<EventAttendancePlayer[] | null>(null);
  const isExpanded = expandedEventId === event.id;

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
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={toggleExpanded}
        style={({ pressed }) => [styles.eventCardToggle, pressed && styles.pressed]}>
        <ThemedView type="backgroundElement" style={styles.eventCardHeader}>
          <ThemedView type="backgroundElement" style={styles.eventTitleGroup}>
            <ThemedText type="default">{getCollapsedEventTitle(event)}</ThemedText>
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
          accessibilityLabel={`${actionLabel} for ${event.title}`}
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
  if (!onEditAttendance && !onEditEvent && !onCancelEvent) {
    return null;
  }

  return (
    <ThemedView type="backgroundElement" style={styles.expandedActions}>
      <ThemedView type="backgroundElement" style={styles.expandedActionRow}>
        {event.attendanceStatus === 'marked' && onEditAttendance ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit attendance for ${event.title}`}
            onPress={() => onEditAttendance(event)}
            style={({ pressed }) => [
              styles.expandedActionButton,
              styles.editAttendanceButton,
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'checkmark.circle', android: 'fact_check', web: 'fact_check' }}
              tintColor="#ffffff"
              size={18}
            />
            <ThemedText type="smallBold" style={styles.expandedActionButtonText}>
              Edit attendance
            </ThemedText>
          </Pressable>
        ) : null}

        {onEditEvent ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${event.title}`}
            onPress={() => onEditEvent(event)}
            style={({ pressed }) => [
              styles.expandedActionButton,
              styles.editEventButton,
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
              tintColor="#111827"
              size={18}
            />
            <ThemedText type="smallBold" style={styles.editEventButtonText}>
              Edit event
            </ThemedText>
          </Pressable>
        ) : null}
      </ThemedView>

      {onCancelEvent ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cancel ${event.title}`}
          onPress={() => onCancelEvent(event)}
          style={({ pressed }) => [
            styles.expandedActionButton,
            styles.cancelEventButton,
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'xmark.circle', android: 'cancel', web: 'cancel' }}
            tintColor="#ffffff"
            size={18}
          />
          <ThemedText type="smallBold" style={styles.expandedActionButtonText}>
            Cancel event
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
  if (event.attendanceStatus !== 'marked') {
    return (
      <ThemedView type="backgroundSelected" style={styles.eventDetailsPanel}>
        <ThemedText type="small" themeColor="textSecondary">
          {getSignupSummary(event)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Attendance has not been marked for this event yet.
        </ThemedText>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView type="backgroundSelected" style={styles.eventDetailsPanel}>
        <ThemedText type="small" themeColor="textSecondary">
          Loading attendance...
        </ThemedText>
      </ThemedView>
    );
  }

  const presentPlayers = attendancePlayers?.filter((player) => player.isPresent) ?? [];

  return (
    <ThemedView type="backgroundSelected" style={styles.eventDetailsPanel}>
      <EventPlayerList title="Attended" players={presentPlayers} />
    </ThemedView>
  );
}

function EventPlayerList({ players, title }: { players: EventAttendancePlayer[]; title: string }) {
  return (
    <ThemedView type="backgroundSelected" style={styles.detailList}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {players.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          None
        </ThemedText>
      ) : (
        players.map((player) => (
          <ThemedText
            key={player.playerId}
            type="small"
            themeColor="textSecondary"
            style={player.isLate && styles.latePlayerText}>
            {player.firstName} {player.lastName}
          </ThemedText>
        ))
      )}
    </ThemedView>
  );
}

function getCollapsedEventTitle(event: CoachEvent) {
  switch (event.type) {
    case 'training':
      return getEventTypeLabel(event.type);
    case 'match':
      return event.opponent
        ? `${getEventTypeLabel(event.type)} vs ${event.opponent}`
        : getEventTypeLabel(event.type);
    case 'other':
      return event.title;
  }
}

function getSignupSummary(event: CoachEvent) {
  return `${event.availableCount} available · ${event.unavailableCount} out · ${event.unknownCount} unknown`;
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
  latePlayerText: {
    color: '#F59E0B',
  },
  emptySectionPanel: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  cardActionButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#1C7C54',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.one,
    minHeight: 40,
    paddingHorizontal: Spacing.three,
  },
  cardActionButtonText: {
    color: '#ffffff',
  },
  expandedActions: {
    gap: Spacing.two,
  },
  expandedActionRow: {
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
  },
  editAttendanceButton: {
    backgroundColor: '#1C7C54',
  },
  editEventButton: {
    backgroundColor: '#F59E0B',
  },
  cancelEventButton: {
    backgroundColor: '#B42318',
  },
  expandedActionButtonText: {
    color: '#ffffff',
  },
  editEventButtonText: {
    color: '#111827',
  },
  pressed: {
    opacity: 0.7,
  },
});
