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
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { EventSection } from "@/features/events/components/event-section";
import { EventWizard } from "@/features/events/components/event-wizard/event-wizard";
import type { EventWizardFormState } from "@/features/events/components/event-wizard/event-wizard-types";
import {
  createEventAsync,
  listEventsAsync,
} from "@/features/events/event-repository";
import type { CoachEvent } from "@/features/events/event-types";
import { useTheme } from "@/hooks/use-theme";

export default function EventsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [events, setEvents] = useState<CoachEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

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
      paddingTop: Spacing.five,
      paddingBottom: Spacing.five,
    },
  });

  function openWizard() {
    setIsWizardOpen(true);
  }

  function closeWizard() {
    setIsWizardOpen(false);
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
      await createEventAsync({
        type: form.type ?? "other",
        title: form.title,
        eventDate: parseDisplayDateToIsoDate(form.date),
        startTime: form.startTime,
        location: form.location,
        opponent: form.opponent,
        notes: form.notes,
        playerSignups: Object.entries(form.playerStatuses).map(([playerId, signupStatus]) => ({
          playerId: Number(playerId),
          signupStatus,
        })),
      });
      await loadEvents();
    } catch (error) {
      console.warn("Failed to save event", error);
      Alert.alert("Could not save event", "Please check the event details and try again.");
      throw error;
    }
  }

  const eventSections = useMemo(() => splitEventsBySection(events), [events]);

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
              />
              <EventSection
                title="Needs attendance"
                description="Past events waiting for attendance will show here."
                events={eventSections.needsAttendance}
              />
              <EventSection
                title="Completed"
                description="Events with finished attendance will show here."
                events={eventSections.completed}
              />
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>

      <EventWizard visible={isWizardOpen} onClose={closeWizard} onSave={handleSaveEvent} />
    </>
  );
}

function splitEventsBySection(events: CoachEvent[]) {
  const today = getTodayIsoDate();

  return {
    upcoming: events.filter(
      (event) => event.eventDate >= today && event.attendanceStatus === "not_marked",
    ),
    needsAttendance: events.filter(
      (event) => event.eventDate < today && event.attendanceStatus === "not_marked",
    ),
    completed: events.filter((event) => event.attendanceStatus === "marked"),
  };
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

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  container: {
    flexGrow: 1,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
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
  addButton: {
    alignItems: "center",
    backgroundColor: "#1C7C54",
    borderRadius: Spacing.three,
    flexDirection: "row",
    gap: Spacing.one,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  addButtonText: {
    color: "#ffffff",
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
