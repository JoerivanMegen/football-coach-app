import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, PageTopPadding, Spacing } from "@/constants/theme";
import { EventAttendanceModal } from "@/features/events/components/event-attendance-modal";
import { EventSection } from "@/features/events/components/event-section";
import { EventWizard } from "@/features/events/components/event-wizard/event-wizard";
import type {
  EventType,
  EventWizardFormState,
} from "@/features/events/components/event-wizard/event-wizard-types";
import { EventTypes } from "@/features/events/components/event-wizard/event-wizard-types";
import {
  createEventAsync,
  deleteEventAsync,
  listEventAttendancePlayersAsync,
  listEventsAsync,
  updateEventAsync,
} from "@/features/events/event-repository";
import type { CoachEvent, EventAttendancePlayer } from "@/features/events/event-types";
import { useTheme } from "@/hooks/use-theme";

type EventTypeFilter = EventType | "all";

const eventTypeFilters = [
  { label: "All", value: "all" },
  { label: "Training", value: "training" },
  { label: "Match", value: "match" },
  { label: "Other", value: "other" },
] satisfies { label: string; value: EventTypeFilter }[];
const creatableEventTypes = EventTypes.filter(
  (eventType) => eventType !== "match",
);

export default function EventsScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [events, setEvents] = useState<CoachEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardEditingEvent, setWizardEditingEvent] =
    useState<CoachEvent | null>(null);
  const [wizardInitialForm, setWizardInitialForm] =
    useState<EventWizardFormState | null>(null);
  const [selectedAttendanceEvent, setSelectedAttendanceEvent] =
    useState<CoachEvent | null>(null);
  const [selectedEventTypeFilter, setSelectedEventTypeFilter] =
    useState<EventTypeFilter>("all");
  const [isEventTypeFilterExpanded, setIsEventTypeFilterExpanded] =
    useState(false);

  const insets = useMemo(
    () => ({
      ...safeAreaInsets,
      bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
    }),
    [safeAreaInsets],
  );

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: PageTopPadding,
      paddingBottom: Spacing.five,
    },
  });

  function openWizard() {
    setWizardEditingEvent(null);
    setWizardInitialForm(null);
    setIsWizardOpen(true);
  }

  function closeWizard() {
    setIsWizardOpen(false);
    setWizardEditingEvent(null);
    setWizardInitialForm(null);
  }

  const loadEvents = useCallback(async () => {
    await Promise.resolve();
    setIsLoading(true);

    try {
      setEvents(await listEventsAsync());
    } catch (error) {
      console.warn("Failed to load events", error);
      Alert.alert("Could not load events", "Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    listEventsAsync()
      .then((nextEvents) => {
        if (isMounted) {
          setEvents(nextEvents);
        }
      })
      .catch((error: unknown) => {
        console.warn("Failed to load events", error);
        Alert.alert("Could not load events", "Please try again.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSaveEvent(form: EventWizardFormState) {
    try {
      const eventInput = {
        type: form.type ?? "other",
        title: form.title,
        eventDate: parseDisplayDateToIsoDate(form.date),
        startTime: form.startTime,
        location: form.location,
        opponent: form.opponent,
        notes: form.notes,
        playerSignups: Object.entries(form.playerStatuses).map(
          ([playerId, signupStatus]) => ({
            playerId: Number(playerId),
            signupStatus,
          }),
        ),
      };

      if (wizardEditingEvent) {
        await updateEventAsync({
          id: wizardEditingEvent.id,
          ...eventInput,
        });
      } else {
        await createEventAsync(eventInput);
      }

      await loadEvents();
    } catch (error) {
      console.warn("Failed to save event", error);
      Alert.alert(
        "Could not save event",
        "Please check the event details and try again.",
      );
      throw error;
    }
  }

  function handleStartAttendance(event: CoachEvent) {
    setSelectedAttendanceEvent(event);
  }

  async function handleEditEvent(event: CoachEvent) {
    try {
      const attendancePlayers = await listEventAttendancePlayersAsync(event.id);
      setWizardEditingEvent(event);
      setWizardInitialForm(
        createEventWizardFormStateFromEvent(event, attendancePlayers),
      );
      setIsWizardOpen(true);
    } catch (error) {
      console.warn("Failed to load event for editing", error);
      Alert.alert("Could not edit event", "Please try again.");
    }
  }

  function handleCancelEvent(event: CoachEvent) {
    const message = `Cancel "${event.title}"? This will remove the event and its attendance data.`;

    if (Platform.OS === "web") {
      if (globalThis.confirm(message)) {
        void cancelEventAsync(event);
      }
      return;
    }

    Alert.alert("Cancel event", message, [
      {
        text: "Keep event",
        style: "cancel",
      },
      {
        text: "Cancel event",
        style: "destructive",
        onPress: () => {
          void cancelEventAsync(event);
        },
      },
    ]);
  }

  async function cancelEventAsync(event: CoachEvent) {
    try {
      await deleteEventAsync(event.id);
      await loadEvents();
    } catch (error) {
      console.warn("Failed to cancel event", error);
      Alert.alert("Could not cancel event", "Please try again.");
    }
  }

  function closeAttendanceModal() {
    setSelectedAttendanceEvent(null);
  }

  const filteredEvents = useMemo(
    () => filterEventsByType(events, selectedEventTypeFilter),
    [events, selectedEventTypeFilter],
  );
  const eventSections = useMemo(
    () => splitEventsBySection(filteredEvents),
    [filteredEvents],
  );
  const selectedEventTypeFilterLabel = getEventTypeFilterLabel(
    selectedEventTypeFilter,
  );

  return (
    <>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentInset={insets}
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
      >
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedView style={styles.titleGroup}>
              <ThemedText type="subtitle" style={styles.title}>
                Events
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.description}>
                Plan trainings, matches, and team moments before filling
                attendance later.
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add event"
                onPress={openWizard}
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: "plus", android: "add", web: "add" }}
                  tintColor="#ffffff"
                  size={18}
                />
                <ThemedText type="smallBold" style={styles.addButtonText}>
                  Add event
                </ThemedText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create match in Match Day"
                onPress={() => router.push("/match-day")}
                style={({ pressed }) => [
                  styles.matchDayButton,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: "plus", android: "add", web: "add" }}
                  tintColor="#ffffff"
                  size={18}
                />
                <ThemedText type="smallBold" style={styles.matchDayButtonText}>
                  Add match
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.filterPanel}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isEventTypeFilterExpanded }}
              onPress={() =>
                setIsEventTypeFilterExpanded((current) => !current)
              }
              style={({ pressed }) => [
                styles.filterToggle,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold">
                Event type - {selectedEventTypeFilterLabel}
              </ThemedText>
              <SymbolView
                name={{
                  ios: isEventTypeFilterExpanded
                    ? "chevron.up"
                    : "chevron.down",
                  android: isEventTypeFilterExpanded
                    ? "keyboard_arrow_up"
                    : "keyboard_arrow_down",
                  web: isEventTypeFilterExpanded
                    ? "keyboard_arrow_up"
                    : "keyboard_arrow_down",
                }}
                tintColor={theme.text}
                size={18}
              />
            </Pressable>

            {isEventTypeFilterExpanded ? (
              <ThemedView type="backgroundElement" style={styles.filterOptions}>
                {eventTypeFilters.map((filter) => {
                  const isSelected = selectedEventTypeFilter === filter.value;

                  return (
                    <Pressable
                      key={filter.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => setSelectedEventTypeFilter(filter.value)}
                      style={({ pressed }) => [
                        styles.filterButton,
                        isSelected && styles.filterButtonSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={isSelected && styles.filterButtonTextSelected}
                        themeColor={isSelected ? undefined : "textSecondary"}
                      >
                        {filter.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ThemedView>
            ) : null}
          </ThemedView>

          {isLoading ? (
            <ThemedView type="backgroundElement" style={styles.loadingPanel}>
              <ActivityIndicator color={theme.text} />
            </ThemedView>
          ) : (
            <ThemedView style={styles.eventSections}>
              <EventSection
                title="Upcoming"
                description="Future trainings, matches, and team activities will show here."
                events={eventSections.upcoming}
                onCancelEvent={handleCancelEvent}
                onEditEvent={handleEditEvent}
              />
              <EventSection
                title="Needs attendance"
                description="Past events waiting for attendance will show here."
                events={eventSections.needsAttendance}
                actionLabel="Add attendance"
                onCancelEvent={handleCancelEvent}
                onEditEvent={handleEditEvent}
                onEventAction={handleStartAttendance}
              />
              <EventSection
                title="Completed"
                description="Events with finished attendance will show here."
                events={eventSections.completed}
                onCancelEvent={handleCancelEvent}
                onEditAttendance={handleStartAttendance}
                onEditEvent={handleEditEvent}
              />
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>

      {isWizardOpen ? (
        <EventWizard
          eventTypes={wizardEditingEvent ? undefined : creatableEventTypes}
          initialForm={wizardInitialForm}
          saveButtonLabel={wizardEditingEvent ? "Save changes" : "Save event"}
          title={wizardEditingEvent ? "Edit event" : "Add event"}
          visible={isWizardOpen}
          onClose={closeWizard}
          onSave={handleSaveEvent}
        />
      ) : null}
      <EventAttendanceModal
        event={selectedAttendanceEvent}
        visible={selectedAttendanceEvent !== null}
        onClose={closeAttendanceModal}
        onSaved={loadEvents}
      />
    </>
  );
}

function filterEventsByType(events: CoachEvent[], filter: EventTypeFilter) {
  if (filter === "all") {
    return events;
  }

  return events.filter((event) => event.type === filter);
}

function getEventTypeFilterLabel(filter: EventTypeFilter) {
  return (
    eventTypeFilters.find((eventTypeFilter) => eventTypeFilter.value === filter)
      ?.label ?? "All"
  );
}

function createEventWizardFormStateFromEvent(
  event: CoachEvent,
  attendancePlayers: EventAttendancePlayer[],
): EventWizardFormState {
  return {
    type: event.type,
    title: event.title,
    date: formatIsoDateForDisplayInput(event.eventDate),
    startTime: event.startTime ?? "",
    location: event.location ?? "",
    opponent: event.opponent ?? "",
    notes: event.notes,
    playerStatuses: Object.fromEntries(
      attendancePlayers.map((player) => [player.playerId, player.signupStatus]),
    ),
  };
}

function splitEventsBySection(events: CoachEvent[]) {
  const today = getTodayIsoDate();

  return {
    upcoming: sortEventsByMostRecentDate(
      events.filter(
        (event) =>
          event.eventDate >= today && event.attendanceStatus === "not_marked",
      ),
    ),
    needsAttendance: sortEventsByMostRecentDate(
      events.filter(
        (event) =>
          event.eventDate < today && event.attendanceStatus === "not_marked",
      ),
    ),
    completed: sortEventsByMostRecentDate(
      events.filter((event) => event.attendanceStatus === "marked"),
    ),
  };
}

function sortEventsByMostRecentDate(events: CoachEvent[]) {
  return [...events].sort((firstEvent, secondEvent) => {
    const dateComparison = secondEvent.eventDate.localeCompare(
      firstEvent.eventDate,
    );

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return (secondEvent.startTime ?? "").localeCompare(
      firstEvent.startTime ?? "",
    );
  });
}

function getTodayIsoDate() {
  const today = new Date();
  return [
    String(today.getFullYear()).padStart(4, "0"),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDisplayDateToIsoDate(value: string) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());

  if (!match) {
    throw new Error(`Invalid event date: ${value}`);
  }

  return [match[3], match[2], match[1]].join("-");
}

function formatIsoDateForDisplayInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return value;
  }

  return [match[3], match[2], match[1]].join("-");
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  container: {
    flexGrow: 1,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: PageTopPadding,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.three,
    justifyContent: "space-between",
  },
  titleGroup: {
    flex: 1,
    gap: Spacing.two,
  },
  title: {
    lineHeight: 38,
  },
  description: {
    maxWidth: 560,
  },
  headerActions: {
    alignItems: "stretch",
    backgroundColor: "transparent",
    gap: Spacing.two,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: "#1C7C54",
    borderRadius: Spacing.three,
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "flex-start",
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  addButtonText: {
    color: "#ffffff",
  },
  matchDayButton: {
    alignItems: "center",
    backgroundColor: "#536DFE",
    borderRadius: Spacing.three,
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  matchDayButtonText: {
    color: "#ffffff",
  },
  pressed: {
    opacity: 0.7,
  },
  eventSections: {
    gap: Spacing.four,
  },
  filterPanel: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  filterToggle: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 36,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  filterButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
  },
  filterButtonSelected: {
    backgroundColor: "#1C7C54",
  },
  filterButtonTextSelected: {
    color: "#ffffff",
  },
  loadingPanel: {
    alignItems: "center",
    borderRadius: Spacing.three,
    minHeight: 160,
    justifyContent: "center",
    padding: Spacing.four,
  },
});
