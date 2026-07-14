import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { getSignupStatusLabel } from "@/features/events/components/event-wizard/event-players-step";
import type { SignupStatus } from "@/features/events/components/event-wizard/event-wizard-types";
import {
  listEventAttendancePlayersAsync,
  saveEventAttendanceAsync,
} from "@/features/events/event-repository";
import type {
  CoachEvent,
  EventAttendancePlayer,
} from "@/features/events/event-types";
import { useTheme } from "@/hooks/use-theme";

type EventAttendanceModalProps = {
  event: CoachEvent | null;
  visible: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function EventAttendanceModal({
  event,
  visible,
  onClose,
  onSaved,
}: EventAttendanceModalProps) {
  const theme = useTheme();
  const [players, setPlayers] = useState<EventAttendancePlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isMatchEvent = event?.type === "match";

  useEffect(() => {
    if (!visible || !event) {
      return;
    }

    let isMounted = true;

    Promise.resolve()
      .then(() => {
        if (isMounted) {
          setIsLoading(true);
        }

        return listEventAttendancePlayersAsync(event.id);
      })
      .then((nextPlayers) => {
        if (isMounted) {
          setPlayers(nextPlayers);
        }
      })
      .catch((error: unknown) => {
        console.warn("Failed to load attendance players", error);
        Alert.alert("Could not load attendance", "Please try again.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [event, visible]);

  function handleClose() {
    if (!isSaving) {
      setPlayers([]);
      onClose();
    }
  }

  function updatePlayerAttendance(
    playerId: number,
    updater: (player: EventAttendancePlayer) => EventAttendancePlayer,
  ) {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) =>
        player.playerId === playerId ? updater(player) : player,
      ),
    );
  }

  async function handleSaveAttendance() {
    if (!event) {
      return;
    }

    if (
      isMatchEvent &&
      players.some((player) => !isValidMinutesPlayed(player.minutesPlayed))
    ) {
      Alert.alert("Invalid minutes", "Use whole minutes from 0 to 300.");
      return;
    }

    if (
      isMatchEvent &&
      players.some((player) => !isValidMatchRating(player.matchRating))
    ) {
      Alert.alert("Invalid rating", "Use a match rating from 1 to 10.");
      return;
    }

    setIsSaving(true);

    try {
      await saveEventAttendanceAsync(
        event.id,
        players.map((player) => ({
          playerId: player.playerId,
          isPresent: player.isPresent,
          isLate: player.isLate,
          minutesPlayed:
            isMatchEvent && player.isPresent ? player.minutesPlayed : null,
          matchRating:
            isMatchEvent && player.isPresent ? player.matchRating : null,
        })),
      );
      await onSaved();
      setPlayers([]);
      onClose();
    } catch (error) {
      console.warn("Failed to save attendance", error);
      Alert.alert("Could not save attendance", "Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <ThemedView style={styles.modalSheet}>
          <ThemedView style={styles.modalHeader}>
            <ThemedView style={styles.modalTitleGroup}>
              <ThemedText type="default">Add attendance</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {event?.title ?? ""}
              </ThemedText>
            </ThemedView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={handleClose}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{ ios: "xmark", android: "close", web: "close" }}
                tintColor={theme.text}
                size={18}
              />
            </Pressable>
          </ThemedView>

          {isLoading ? (
            <ThemedView type="backgroundElement" style={styles.loadingPanel}>
              <ActivityIndicator color={theme.text} />
            </ThemedView>
          ) : (
            <ScrollView contentContainerStyle={styles.attendanceContent}>
              {players.length === 0 ? (
                <ThemedView type="backgroundElement" style={styles.emptyPanel}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Add players first to record attendance.
                  </ThemedText>
                </ThemedView>
              ) : (
                SignupStatusOrder.map((signupStatus) => {
                  const groupPlayers = players.filter(
                    (player) => player.signupStatus === signupStatus,
                  );

                  if (groupPlayers.length === 0) {
                    return null;
                  }

                  return (
                    <ThemedView
                      key={signupStatus}
                      style={styles.attendanceGroup}
                    >
                      <ThemedText type="smallBold">
                        {getSignupStatusLabel(signupStatus)}
                      </ThemedText>
                      {groupPlayers.map((player) => (
                        <ThemedView
                          key={player.playerId}
                          type="backgroundElement"
                          style={styles.attendanceRow}
                        >
                          <ThemedView
                            type="backgroundElement"
                            style={styles.playerNameGroup}
                          >
                            <ThemedText type="default" style={styles.playerName}>
                              {player.firstName} {player.lastName}
                            </ThemedText>
                          </ThemedView>

                          <ThemedView
                            type="backgroundElement"
                            style={styles.rowControls}
                          >
                            <ThemedView
                              type="backgroundElement"
                              style={styles.presentOptions}
                            >
                              <AttendanceToggle
                                isSelected={player.isPresent}
                                label="Present"
                                onPress={() =>
                                  updatePlayerAttendance(
                                    player.playerId,
                                    (currentPlayer) => ({
                                      ...currentPlayer,
                                      isPresent: true,
                                    }),
                                  )
                                }
                              />
                              <AttendanceToggle
                                isSelected={!player.isPresent}
                                label="Absent"
                                onPress={() =>
                                  updatePlayerAttendance(
                                    player.playerId,
                                    (currentPlayer) => ({
                                      ...currentPlayer,
                                      isPresent: false,
                                      isLate: false,
                                      minutesPlayed: null,
                                      matchRating: null,
                                    }),
                                  )
                                }
                              />
                            </ThemedView>

                            <LateCheckbox
                              disabled={!player.isPresent}
                              isChecked={player.isLate}
                              onPress={() =>
                                updatePlayerAttendance(
                                  player.playerId,
                                  (currentPlayer) => ({
                                    ...currentPlayer,
                                    isLate: !currentPlayer.isLate,
                                  }),
                                )
                              }
                            />

                            {isMatchEvent ? (
                              <MinutesPlayedInput
                                disabled={!player.isPresent}
                                value={player.minutesPlayed}
                                onChange={(minutesPlayed) =>
                                  updatePlayerAttendance(
                                    player.playerId,
                                    (currentPlayer) => ({
                                      ...currentPlayer,
                                      minutesPlayed,
                                    }),
                                  )
                                }
                              />
                            ) : null}

                            {isMatchEvent ? (
                              <MatchRatingInput
                                disabled={!player.isPresent}
                                value={player.matchRating}
                                onChange={(matchRating) =>
                                  updatePlayerAttendance(
                                    player.playerId,
                                    (currentPlayer) => ({
                                      ...currentPlayer,
                                      matchRating,
                                    }),
                                  )
                                }
                              />
                            ) : null}
                          </ThemedView>
                        </ThemedView>
                      ))}
                    </ThemedView>
                  );
                })
              )}
            </ScrollView>
          )}

          <ThemedView style={styles.formActions}>
            <Pressable
              accessibilityRole="button"
              onPress={handleClose}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving || isLoading}
              onPress={handleSaveAttendance}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                (isSaving || isLoading) && styles.disabledButton,
              ]}
            >
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                {isSaving ? "Saving..." : "Save attendance"}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AttendanceToggle({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.attendanceToggle,
        isSelected && styles.attendanceToggleSelected,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={isSelected && styles.attendanceToggleTextSelected}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function LateCheckbox({
  disabled,
  isChecked,
  onPress,
}: {
  disabled: boolean;
  isChecked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isChecked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.lateCheckbox,
        disabled && styles.disabledButton,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={{
          ios: isChecked ? "checkmark.square.fill" : "square",
          android: isChecked ? "check_box" : "check_box_outline_blank",
          web: isChecked ? "check_box" : "check_box_outline_blank",
        }}
        size={20}
      />
      <ThemedText type="smallBold">Late</ThemedText>
    </Pressable>
  );
}

function MinutesPlayedInput({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: number | null) => void;
  value: number | null;
}) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.minutesInputGroup}>
      <ThemedText type="smallBold">Minutes played</ThemedText>
      <TextInput
        accessibilityLabel="Minutes played"
        editable={!disabled}
        keyboardType="number-pad"
        onChangeText={(text) => onChange(parseMinutesPlayedInput(text))}
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.minutesInput,
          {
            backgroundColor: theme.backgroundSelected,
            color: theme.text,
          },
          disabled && styles.disabledButton,
        ]}
        value={value === null ? "" : String(value)}
      />
    </ThemedView>
  );
}

function parseMinutesPlayedInput(value: string) {
  const sanitizedValue = value.replace(/\D/g, "");
  return sanitizedValue ? Number(sanitizedValue) : null;
}

function isValidMinutesPlayed(value: number | null) {
  return (
    value === null || (Number.isInteger(value) && value >= 0 && value <= 300)
  );
}

function MatchRatingInput({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: number | null) => void;
  value: number | null;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.ratingGroup}>
      <ThemedText type="smallBold">Match rating</ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ratingOptions}
      >
        {MatchRatingValues.map((rating) => (
          <RatingButton
            key={rating}
            disabled={disabled}
            isSelected={value === rating}
            onPress={() => onChange(value === rating ? null : rating)}
            rating={rating}
          />
        ))}
      </ScrollView>
    </ThemedView>
  );
}

function RatingButton({
  disabled,
  isSelected,
  onPress,
  rating,
}: {
  disabled: boolean;
  isSelected: boolean;
  onPress: () => void;
  rating: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ratingButton,
        isSelected && styles.ratingButtonSelected,
        disabled && styles.disabledButton,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={isSelected && styles.ratingButtonTextSelected}
      >
        {rating}
      </ThemedText>
    </Pressable>
  );
}

function isValidMatchRating(value: number | null) {
  return (
    value === null || (Number.isInteger(value) && value >= 1 && value <= 10)
  );
}

const SignupStatusOrder: SignupStatus[] = [
  "available",
  "unknown",
  "unavailable",
];
const MatchRatingValues = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  modalSheet: {
    alignSelf: "center",
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    gap: Spacing.three,
    maxHeight: "92%",
    padding: Spacing.three,
    width: "100%",
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalTitleGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  loadingPanel: {
    alignItems: "center",
    borderRadius: Spacing.two,
    minHeight: 160,
    justifyContent: "center",
  },
  emptyPanel: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  attendanceContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
  attendanceGroup: {
    gap: Spacing.two,
  },
  attendanceRow: {
    borderRadius: Spacing.two,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  playerNameGroup: {
    gap: Spacing.one,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 24,
  },
  rowControls: {
    gap: Spacing.two,
  },
  presentOptions: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  attendanceToggle: {
    alignItems: "center",
    borderRadius: Spacing.two,
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  attendanceToggleSelected: {
    backgroundColor: "#1C7C54",
  },
  attendanceToggleTextSelected: {
    color: "#ffffff",
  },
  lateCheckbox: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: Spacing.one,
    minHeight: 36,
  },
  minutesInputGroup: {
    gap: Spacing.one,
  },
  minutesInput: {
    borderRadius: Spacing.two,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  ratingGroup: {
    gap: Spacing.one,
  },
  ratingOptions: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  ratingButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    minHeight: 36,
    justifyContent: "center",
    width: 36,
  },
  ratingButtonSelected: {
    backgroundColor: "#1C7C54",
  },
  ratingButtonTextSelected: {
    color: "#ffffff",
  },
  formActions: {
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "flex-end",
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1C7C54",
    borderRadius: Spacing.two,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  primaryButtonText: {
    color: "#ffffff",
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
