import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getMatchLocationLabel } from '@/features/events/components/event-wizard/event-details-step';
import { getEventTypeLabel } from '@/features/events/components/event-wizard/event-type-step';
import type { MatchLocation } from '@/features/events/components/event-wizard/event-wizard-types';
import type { CoachEvent } from '@/features/events/event-types';

type EventSectionProps = {
  title: string;
  description: string;
  events: CoachEvent[];
};

export function EventSection({ title, description, events }: EventSectionProps) {
  return (
    <ThemedView style={styles.eventSection}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {events.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptySectionPanel}>
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.eventList}>
          {events.map((event) => (
            <ThemedView key={event.id} type="backgroundElement" style={styles.eventCard}>
              <ThemedView type="backgroundElement" style={styles.eventCardHeader}>
                <ThemedView type="backgroundElement" style={styles.eventTitleGroup}>
                  <ThemedText type="default">{event.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {getEventMetaText(event)}
                  </ThemedText>
                </ThemedView>
                <ThemedText type="smallBold">{getEventTypeLabel(event.type)}</ThemedText>
              </ThemedView>

              <ThemedText type="small" themeColor="textSecondary">
                {getSignupSummary(event)}
              </ThemedText>
            </ThemedView>
          ))}
        </ThemedView>
      )}
    </ThemedView>
  );
}

function getEventMetaText(event: CoachEvent) {
  const parts = [
    formatIsoDateForDisplay(event.eventDate),
    event.startTime,
    getLocationDisplayValue(event),
    event.opponent ? `vs ${event.opponent}` : null,
  ].filter(Boolean);

  return parts.join(' · ');
}

function getLocationDisplayValue(event: CoachEvent) {
  if (event.type === 'match' && isMatchLocation(event.location)) {
    return getMatchLocationLabel(event.location);
  }

  return event.location;
}

function isMatchLocation(value: string | null): value is MatchLocation {
  return value === 'home' || value === 'away';
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
  eventList: {
    gap: Spacing.two,
  },
  eventCard: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
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
  emptySectionPanel: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
});
