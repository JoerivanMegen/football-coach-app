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
import { AppHeaderHeight, BottomTabInset, MaxContentWidth, PageTopPadding, Spacing } from "@/constants/theme";
import { EventAttendanceModal } from "@/features/events/components/event-attendance-modal";
import { EventSection } from "@/features/events/components/event-section";
import { formatDateForDisplay } from "@/features/events/components/event-wizard/event-details-step";
import { EventWizard } from "@/features/events/components/event-wizard/event-wizard";
import type {
  EventWizardFormState,
} from "@/features/events/components/event-wizard/event-wizard-types";
import {
  createEventAsync,
  deleteEventAsync,
  listEventAttendancePlayersAsync,
  listEventsAsync,
  updateEventAsync,
} from "@/features/events/event-repository";
import type { CoachEvent, EventAttendancePlayer } from "@/features/events/event-types";
import { getTeamSettingsAsync } from "@/features/settings/team-settings-repository";
import type { TrainingDay } from "@/features/settings/team-settings-types";
import { useTheme } from "@/hooks/use-theme";
import { useScrollToTopOnFocus } from "@/hooks/use-scroll-to-top-on-focus";

export default function EventsScreen() {
  const scrollViewRef = useScrollToTopOnFocus();
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

  async function openWizard() {
    setWizardEditingEvent(null);

    try {
      const settings = await getTeamSettingsAsync();
      setWizardInitialForm(
        createEmptyTrainingWizardFormState({
          location: settings?.clubLocation ?? "",
          startTime: settings?.trainingStartTime ?? "",
          trainingDays: settings?.trainingDays ?? [],
        }),
      );
    } catch (error) {
      console.warn("Failed to load training defaults", error);
      setWizardInitialForm(createEmptyTrainingWizardFormState());
    }

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
      Alert.alert("Could not load trainings", "Please try again.");
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
        Alert.alert("Could not load trainings", "Please try again.");
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
        type: form.type ?? "training",
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
        "Could not save training",
        "Please check the training details and try again.",
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
      Alert.alert("Could not edit training", "Please try again.");
    }
  }

  function handleCancelEvent(event: CoachEvent) {
    const message = `Cancel "${event.title}"? This will remove the training and its attendance data.`;

    if (Platform.OS === "web") {
      if (globalThis.confirm(message)) {
        void cancelEventAsync(event);
      }
      return;
    }

    Alert.alert("Cancel training", message, [
      {
        text: "Keep training",
        style: "cancel",
      },
      {
        text: "Cancel training",
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
      Alert.alert("Could not cancel training", "Please try again.");
    }
  }

  function closeAttendanceModal() {
    setSelectedAttendanceEvent(null);
  }

  const filteredEvents = useMemo(
    () => events.filter((event) => event.type === "training"),
    [events],
  );
  const eventSections = useMemo(
    () => splitEventsBySection(filteredEvents),
    [filteredEvents],
  );

  return (
    <>
      <ScrollView
        ref={scrollViewRef}
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentInset={insets}
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
      >
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedView style={styles.titleGroup}>
              <ThemedText type="subtitle" style={styles.title}>
                Training
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.description}>
                Plan training sessions and keep attendance ready for player
                statistics.
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add training"
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
                  Add training
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
                  tintColor="#536DFE"
                  size={18}
                />
                <ThemedText type="smallBold" style={styles.matchDayButtonText}>
                  Add match
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>

          {isLoading ? (
            <ThemedView type="backgroundElement" style={styles.loadingPanel}>
              <ActivityIndicator color={theme.text} />
            </ThemedView>
          ) : (
            <ThemedView style={styles.eventSections}>
              <EventSection
                title="Upcoming"
                description="Future trainings will show here."
                events={eventSections.upcoming}
                onCancelEvent={handleCancelEvent}
                onEditEvent={handleEditEvent}
              />
              <EventSection
                title="Needs attendance"
                description="Past trainings waiting for attendance will show here."
                events={eventSections.needsAttendance}
                actionLabel="Add attendance"
                onCancelEvent={handleCancelEvent}
                onEditEvent={handleEditEvent}
                onEventAction={handleStartAttendance}
              />
              <EventSection
                title="Completed"
                description="Trainings with finished attendance will show here."
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
          initialForm={wizardInitialForm}
          saveButtonLabel={wizardEditingEvent ? "Save changes" : "Save training"}
          title={wizardEditingEvent ? "Edit training" : "Add training"}
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

function createEmptyTrainingWizardFormState({
  location = "",
  startTime = "",
  trainingDays = [],
}: {
  location?: string;
  startTime?: string;
  trainingDays?: TrainingDay[];
} = {}): EventWizardFormState {
  const nextTrainingDate = getNextTrainingDate(
    new Date(),
    trainingDays,
    startTime,
  );

  return {
    type: "training",
    title: "Training",
    date: formatDateForDisplay(nextTrainingDate),
    startTime,
    location,
    opponent: "",
    notes: "",
    playerStatuses: {},
  };
}

const trainingDayNumbers: Record<TrainingDay, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function getNextTrainingDate(
  now: Date,
  trainingDays: TrainingDay[],
  startTime: string,
) {
  if (trainingDays.length === 0) {
    return now;
  }

  const selectedDayNumbers = new Set(
    trainingDays.map((day) => trainingDayNumbers[day]),
  );
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(startTime.trim());

  for (let daysAhead = 0; daysAhead <= 7; daysAhead += 1) {
    const candidate = new Date(now);
    candidate.setHours(12, 0, 0, 0);
    candidate.setDate(candidate.getDate() + daysAhead);

    if (!selectedDayNumbers.has(candidate.getDay())) {
      continue;
    }

    if (timeMatch) {
      candidate.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);

      if (candidate.getTime() <= now.getTime()) {
        continue;
      }
    }

    return candidate;
  }

  return now;
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
    paddingTop: AppHeaderHeight + PageTopPadding,
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
    backgroundColor: "transparent",
    borderColor: "#536DFE",
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  matchDayButtonText: {
    color: "#536DFE",
  },
  pressed: {
    opacity: 0.7,
  },
  eventSections: {
    gap: Spacing.four,
  },
  loadingPanel: {
    alignItems: "center",
    borderRadius: Spacing.three,
    minHeight: 160,
    justifyContent: "center",
    padding: Spacing.four,
  },
});
