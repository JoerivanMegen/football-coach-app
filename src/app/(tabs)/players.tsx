import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  AppHeaderHeight,
  BottomTabInset,
  MaxContentWidth,
  PageTopPadding,
  Spacing,
} from "@/constants/theme";
import { listPlayerAttendanceStatsAsync } from "@/features/player-stats/player-stats-repository";
import type { PlayerAttendanceStats } from "@/features/player-stats/player-stats-types";
import { getPlayerPositionLabel } from "@/features/players/player-position-labels";
import {
  archivePlayerAsync,
  createPlayerAsync,
  listPlayersAsync,
  savePlayerWithKitReassignmentAsync,
  updatePlayerAsync,
} from "@/features/players/player-repository";
import {
  PLAYER_POSITIONS,
  type CreatePlayerInput,
  type Player,
  type PlayerPosition,
} from "@/features/players/player-types";
import { useTheme } from "@/hooks/use-theme";
import { useScrollToTopOnFocus } from "@/hooks/use-scroll-to-top-on-focus";
import { DEFAULT_LOCALE } from "@/i18n/locales";

type PlayerFormState = {
  firstName: string;
  lastName: string;
  nickName: string;
  birthDate: string;
  position: PlayerPosition | null;
  kitNumber: string;
};

type TeamStatsSortKey =
  | "player"
  | "trainingAttendancePercentage"
  | "matchAttendancePercentage"
  | "latePercentage"
  | "matchStarts"
  | "matchStarterPercentage"
  | "averageMatchMinutes"
  | "matchGoals"
  | "matchAssists"
  | "matchYellowCards"
  | "matchRedCards"
  | "matchCleanSheets"
  | "averageMatchRating"
  | "matchGoalsPer90"
  | "matchAssistsPer90"
  | "matchDutiesAssigned"
  | "matchDutiesFulfilled"
  | "matchDutyFulfillmentPercentage"
  | "recentForm";

const emptyFormState: PlayerFormState = {
  firstName: "",
  lastName: "",
  nickName: "",
  birthDate: "",
  position: null,
  kitNumber: "",
};

const WarningColor = "#F59E0B";
const WarningTextColor = "#111827";
const ErrorColor = "#B42318";
const StatsColor = "#2563EB";
const playerPositionSections: { position: PlayerPosition; label: string }[] = [
  { position: "goalkeeper", label: "Goalkeepers" },
  { position: "defender", label: "Defenders" },
  { position: "midfielder", label: "Midfielders" },
  { position: "forward", label: "Attackers" },
];

export default function PlayersScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerAttendanceStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBirthDatePickerOpen, setIsBirthDatePickerOpen] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [selectedStatsPlayerId, setSelectedStatsPlayerId] = useState<
    number | null
  >(null);
  const [isTeamStatsOpen, setIsTeamStatsOpen] = useState(false);
  const [expandedPositionSections, setExpandedPositionSections] = useState<
    Record<PlayerPosition, boolean>
  >({ goalkeeper: true, defender: true, midfielder: true, forward: true });
  const [form, setForm] = useState<PlayerFormState>(emptyFormState);
  const expandAllPositionSections = useCallback(() => {
    setExpandedPositionSections({
      goalkeeper: true,
      defender: true,
      midfielder: true,
      forward: true,
    });
  }, []);
  const scrollViewRef = useScrollToTopOnFocus(expandAllPositionSections);

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

  const loadPlayers = useCallback(async () => {
    try {
      const [nextPlayers, nextPlayerStats] = await Promise.all([
        listPlayersAsync(),
        listPlayerAttendanceStatsAsync(),
      ]);
      setPlayers(nextPlayers);
      setPlayerStats(nextPlayerStats);
    } catch (error) {
      console.warn("Failed to load players", error);
      Alert.alert("Could not load players", "Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPlayers();
    }, [loadPlayers]),
  );

  function openAddPlayerForm() {
    setEditingPlayerId(null);
    setForm(emptyFormState);
    setIsBirthDatePickerOpen(false);
    setIsFormOpen(true);
  }

  function openEditPlayerForm(player: Player) {
    setEditingPlayerId(player.id);
    setForm({
      firstName: player.firstName,
      lastName: player.lastName,
      nickName: player.nickName ?? "",
      birthDate: formatIsoDateForDisplay(player.birthDate),
      position: player.position,
      kitNumber: player.kitNumber === null ? "" : String(player.kitNumber),
    });
    setIsBirthDatePickerOpen(false);
    setIsFormOpen(true);
  }

  function closeForm() {
    if (!isSaving) {
      setIsBirthDatePickerOpen(false);
      setEditingPlayerId(null);
      setIsFormOpen(false);
    }
  }

  async function handleSavePlayer() {
    const firstName = normalizeNameInput(form.firstName);
    const lastName = normalizeNameInput(form.lastName);
    const nickName = normalizeNameInput(form.nickName);
    const kitNumber = form.kitNumber.trim()
      ? Number(form.kitNumber.trim())
      : null;
    const birthDate = parseDisplayDateToIsoDate(form.birthDate);

    if (!firstName || !lastName) {
      Alert.alert(
        "Missing required fields",
        "First name and last name are required.",
      );
      return;
    }

    if (!isValidNameInput(firstName)) {
      Alert.alert(
        "Invalid first name",
        "Use letters only, with single spaces between names.",
      );
      return;
    }

    if (!isValidNameInput(lastName)) {
      Alert.alert(
        "Invalid last name",
        "Use letters only, with single spaces between names.",
      );
      return;
    }

    if (nickName && !isValidNameInput(nickName)) {
      Alert.alert(
        "Invalid nickname",
        "Use letters only, with single spaces between names.",
      );
      return;
    }

    if (form.birthDate.trim() && !birthDate) {
      Alert.alert(
        "Invalid birth date",
        "Use DD-MM-YYYY, for example 24-09-2012.",
      );
      return;
    }

    if (!form.position) {
      Alert.alert("Missing required fields", "Choose a player position.");
      return;
    }

    if (kitNumber !== null && (!Number.isInteger(kitNumber) || kitNumber < 0)) {
      Alert.alert(
        "Invalid kit number",
        "Use a whole number, or leave it empty.",
      );
      return;
    }

    const playerInput: CreatePlayerInput = {
      firstName,
      lastName,
      nickName,
      birthDate,
      position: form.position,
      kitNumber,
    };

    const continueWithKitNumberCheck = () => {
      void checkKitNumberAndSave(playerInput);
    };

    if (findDuplicatePlayer(firstName, lastName, players, editingPlayerId)) {
      confirmDuplicatePlayer(`${firstName} ${lastName}`, () => {
        continueWithKitNumberCheck();
      });
      return;
    }

    await checkKitNumberAndSave(playerInput);
  }

  async function checkKitNumberAndSave(playerInput: CreatePlayerInput) {
    if (playerInput.kitNumber === null || playerInput.kitNumber === undefined) {
      await savePlayer(playerInput);
      return;
    }

    const conflictingPlayer = players.find(
      (player) =>
        player.id !== editingPlayerId &&
        player.kitNumber === playerInput.kitNumber,
    );

    if (!conflictingPlayer) {
      await savePlayer(playerInput);
      return;
    }

    const nextAvailableNumber = findNextAvailableKitNumber(
      playerInput.kitNumber,
      players,
      editingPlayerId,
    );
    const conflictingName = conflictingPlayer.firstName;
    const message = `${conflictingName} already has this kit number. Do you want to change theirs to ${nextAvailableNumber}?`;
    const confirmReassignment = () => {
      void savePlayer(playerInput, {
        playerId: conflictingPlayer.id,
        kitNumber: nextAvailableNumber,
      });
    };

    if (Platform.OS === "web") {
      if (globalThis.confirm(message)) confirmReassignment();
      return;
    }

    Alert.alert("Kit number already taken", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Change number", onPress: confirmReassignment },
    ]);
  }

  async function savePlayer(
    playerInput: CreatePlayerInput,
    kitReassignment?: { playerId: number; kitNumber: number },
  ) {
    setIsSaving(true);

    try {
      if (kitReassignment) {
        await savePlayerWithKitReassignmentAsync(
          editingPlayerId,
          playerInput,
          kitReassignment.playerId,
          kitReassignment.kitNumber,
        );
      } else if (editingPlayerId === null) {
        await createPlayerAsync(playerInput);
      } else {
        await updatePlayerAsync(editingPlayerId, playerInput);
      }
      setIsFormOpen(false);
      setForm(emptyFormState);
      setEditingPlayerId(null);
      await loadPlayers();
    } catch (error) {
      console.warn("Failed to save player", error);
      Alert.alert(
        "Could not save player",
        "Please check the details and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleArchivePlayer(player: Player) {
    const playerName = `${player.firstName} ${player.lastName}`;
    const message = `Delete ${playerName}? This will remove the player from the active squad list.`;

    if (Platform.OS === "web") {
      if (globalThis.confirm(message)) {
        void archivePlayer(player);
      }
      return;
    }

    Alert.alert("Delete player", message, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void archivePlayer(player);
        },
      },
    ]);
  }

  async function archivePlayer(player: Player) {
    try {
      await archivePlayerAsync(player.id);
      await loadPlayers();
    } catch (error) {
      console.warn("Failed to delete player", error);
      Alert.alert("Could not delete player", "Please try again.");
    }
  }

  const playerStatsById = useMemo(
    () => new Map(playerStats.map((stats) => [stats.playerId, stats])),
    [playerStats],
  );
  const selectedStatsPlayer =
    players.find((player) => player.id === selectedStatsPlayerId) ?? null;

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
                Players
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.description}>
                Manage your squad list and start collecting player stats.
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add player"
                onPress={openAddPlayerForm}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
              >
                <SymbolView
                  name={{ ios: "plus", android: "add", web: "add" }}
                  tintColor="#ffffff"
                  size={18}
                />
                <ThemedText type="smallBold" style={styles.actionButtonText}>
                  Add player
                </ThemedText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open team statistics"
                onPress={() => setIsTeamStatsOpen(true)}
                style={({ pressed }) => [styles.teamStatsButton, pressed && styles.pressed]}
              >
                <SymbolView
                  name={{
                    ios: "chart.bar.xaxis",
                    android: "bar_chart",
                    web: "bar_chart",
                  }}
                  tintColor={StatsColor}
                  size={18}
                />
                <ThemedText type="smallBold" style={styles.teamStatsButtonText}>
                  Team stats
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>

          {isLoading ? (
            <ThemedView type="backgroundElement" style={styles.emptyPanel}>
              <ActivityIndicator color={theme.text} />
            </ThemedView>
          ) : players.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyPanel}>
              <ThemedText type="smallBold">No players yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Add your first player to start building the squad.
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedView style={styles.playerList}>
              {playerPositionSections.map((section) => {
                const sectionPlayers = players.filter(
                  (player) => player.position === section.position,
                );
                const isExpanded = expandedPositionSections[section.position];

                return (
                  <ThemedView key={section.position} style={styles.positionSection}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                      accessibilityLabel={`${isExpanded ? "Collapse" : "Expand"} ${section.label}`}
                      onPress={() =>
                        setExpandedPositionSections((current) => ({
                          ...current,
                          [section.position]: !current[section.position],
                        }))
                      }
                      style={({ pressed }) => [pressed && styles.pressed]}
                    >
                      <ThemedView style={styles.positionSectionHeader}>
                        <ThemedView style={styles.positionSectionTitle}>
                          <ThemedText type="default">{section.label}</ThemedText>
                        </ThemedView>
                        <SymbolView
                          name={
                            isExpanded
                              ? { ios: "chevron.up", android: "expand_less", web: "expand_less" }
                              : { ios: "chevron.down", android: "expand_more", web: "expand_more" }
                          }
                          tintColor={theme.text}
                          size={20}
                        />
                      </ThemedView>
                    </Pressable>

                    {isExpanded ? (
                      <ThemedView style={styles.positionSectionPlayers}>
                        {sectionPlayers.length ? (
                          sectionPlayers.map((player) => (
                            <PlayerCard
                              key={player.id}
                              player={player}
                              onArchivePlayer={handleArchivePlayer}
                              onEditPlayer={openEditPlayerForm}
                              onOpenStats={() => setSelectedStatsPlayerId(player.id)}
                            />
                          ))
                        ) : (
                          <ThemedText type="small" themeColor="textSecondary" style={styles.noPositionPlayers}>
                            No {section.label.toLowerCase()} added yet.
                          </ThemedText>
                        )}
                      </ThemedView>
                    ) : null}
                  </ThemedView>
                );
              })}
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>

      <Modal
        visible={isFormOpen}
        animationType="slide"
        transparent
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeForm} />
          <ThemedView type="modalBackground" style={styles.modalSheet}>
            <ThemedView style={styles.modalHeader}>
              <ThemedText type="default">
                {editingPlayerId === null ? "Add player" : "Edit player"}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={closeForm}
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

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formContent}
            >
              <PlayerTextInput
                label="First name"
                required
                value={form.firstName}
                onChangeText={(firstName) =>
                  setForm((current) => ({ ...current, firstName }))
                }
              />
              <PlayerTextInput
                label="Last name"
                required
                value={form.lastName}
                onChangeText={(lastName) =>
                  setForm((current) => ({ ...current, lastName }))
                }
              />
              <PlayerTextInput
                label="Nickname"
                value={form.nickName}
                onChangeText={(nickName) =>
                  setForm((current) => ({ ...current, nickName }))
                }
              />
              {Platform.OS === "web" ? (
                <PlayerTextInput
                  label="Birth date"
                  placeholder="DD-MM-YYYY"
                  value={form.birthDate}
                  onChangeText={(birthDate) =>
                    setForm((current) => ({ ...current, birthDate }))
                  }
                />
              ) : (
                <BirthDatePickerField
                  isOpen={isBirthDatePickerOpen}
                  value={form.birthDate}
                  onOpen={() => setIsBirthDatePickerOpen(true)}
                  onChange={(birthDate) =>
                    setForm((current) => ({ ...current, birthDate }))
                  }
                  onClose={() => setIsBirthDatePickerOpen(false)}
                />
              )}
              <PlayerTextInput
                label="Kit number"
                keyboardType="number-pad"
                value={form.kitNumber}
                onChangeText={(kitNumber) =>
                  setForm((current) => ({ ...current, kitNumber }))
                }
              />

              <ThemedView style={styles.fieldGroup}>
                <ThemedText type="smallBold">Position *</ThemedText>
                <ThemedView style={styles.positionGrid}>
                  {PLAYER_POSITIONS.map((position) => {
                    const isSelected = form.position === position;

                    return (
                      <Pressable
                        key={position}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        onPress={() =>
                          setForm((current) => ({ ...current, position }))
                        }
                        style={({ pressed }) => [
                          styles.positionOption,
                          pressed && styles.pressed,
                        ]}
                      >
                        <ThemedView
                          style={[
                            styles.positionOptionInner,
                            isSelected && styles.positionOptionInnerSelected,
                          ]}
                        >
                          <ThemedText
                            type="smallBold"
                            style={[
                              styles.positionOptionText,
                              isSelected && styles.positionOptionTextSelected,
                            ]}
                          >
                            {getPlayerPositionLabel(position, DEFAULT_LOCALE)}
                          </ThemedText>
                        </ThemedView>
                      </Pressable>
                    );
                  })}
                </ThemedView>
              </ThemedView>
            </ScrollView>

            <ThemedView style={styles.formActions}>
              <Pressable
                accessibilityRole="button"
                onPress={closeForm}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold">Cancel</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={handleSavePlayer}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  isSaving && styles.disabledButton,
                ]}
              >
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {isSaving
                    ? "Saving..."
                    : editingPlayerId === null
                      ? "Save player"
                      : "Update player"}
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>

      <PlayerProfileStatsModal
        player={selectedStatsPlayer}
        stats={
          selectedStatsPlayer
            ? (playerStatsById.get(selectedStatsPlayer.id) ??
              createEmptyPlayerStats(selectedStatsPlayer))
            : null
        }
        visible={selectedStatsPlayer !== null}
        onClose={() => setSelectedStatsPlayerId(null)}
      />

      <TeamStatsModal
        stats={playerStats}
        visible={isTeamStatsOpen}
        onClose={() => setIsTeamStatsOpen(false)}
      />
    </>
  );
}

function PlayerCard({
  player,
  onArchivePlayer,
  onEditPlayer,
  onOpenStats,
}: {
  player: Player;
  onArchivePlayer: (player: Player) => void;
  onEditPlayer: (player: Player) => void;
  onOpenStats: () => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.playerCard}>
      <ThemedView type="backgroundElement" style={styles.playerRow}>
        <ThemedView type="backgroundElement" style={styles.playerToggle}>
          <ThemedView type="backgroundElement" style={styles.playerNameGroup}>
            <ThemedText type="default">
              {player.firstName} {player.lastName}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {getPlayerPositionLabel(player.position, DEFAULT_LOCALE)}
              {player.kitNumber !== null ? ` · #${player.kitNumber}` : ""}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.playerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View stats for ${player.firstName} ${player.lastName}`}
            onPress={onOpenStats}
            style={({ pressed }) => [
              styles.rowActionButton,
              styles.statsButton,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{
                ios: "chart.bar.xaxis",
                android: "bar_chart",
                web: "bar_chart",
              }}
              tintColor={StatsColor}
              size={16}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${player.firstName} ${player.lastName}`}
            onPress={() => onEditPlayer(player)}
            style={({ pressed }) => [
              styles.rowActionButton,
              styles.editButton,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ ios: "pencil", android: "edit", web: "edit" }}
              tintColor={WarningColor}
              size={16}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${player.firstName} ${player.lastName}`}
            onPress={() => onArchivePlayer(player)}
            style={({ pressed }) => [
              styles.rowActionButton,
              styles.deleteButton,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ ios: "trash", android: "delete", web: "delete" }}
              tintColor={ErrorColor}
              size={16}
            />
          </Pressable>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

function PlayerProfileStatsModal({
  onClose,
  player,
  stats,
  visible,
}: {
  onClose: () => void;
  player: Player | null;
  stats: PlayerAttendanceStats | null;
  visible: boolean;
}) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <ThemedView type="modalBackground" style={styles.modalSheet}>
          <ThemedView style={styles.modalHeader}>
            <ThemedView style={styles.statsModalTitleGroup}>
              <ThemedText type="subtitle" style={styles.statsModalPlayerName}>
                {player
                  ? `${player.firstName} ${player.lastName}`
                  : "Player stats"}
              </ThemedText>
              {player ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {getPlayerPositionLabel(player.position, DEFAULT_LOCALE)}
                  {player.kitNumber !== null ? ` · #${player.kitNumber}` : ""}
                </ThemedText>
              ) : null}
            </ThemedView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close player statistics"
              onPress={onClose}
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

          <ScrollView contentContainerStyle={styles.statsModalContent}>
            {stats ? <PlayerStatsPanel stats={stats} /> : null}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TeamStatsModal({
  onClose,
  stats,
  visible,
}: {
  onClose: () => void;
  stats: PlayerAttendanceStats[];
  visible: boolean;
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [sortKey, setSortKey] = useState<TeamStatsSortKey>("player");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const sortedStats = useMemo(
    () => [...stats].sort((left, right) => compareTeamStats(left, right, sortKey, sortDirection)),
    [sortDirection, sortKey, stats],
  );

  function changeSort(nextKey: TeamStatsSortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortKey(nextKey);
      setSortDirection(nextKey === "player" ? "asc" : "desc");
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView
        type="modalBackground"
        style={[
          styles.teamStatsModalScreen,
          {
            paddingTop: safeAreaInsets.top + PageTopPadding,
            paddingBottom: safeAreaInsets.bottom + Spacing.three,
          },
        ]}
      >
        <ThemedView style={styles.teamStatsModalHeader}>
          <ThemedView style={styles.teamStatsModalTitleGroup}>
            <ThemedText type="subtitle" style={styles.teamStatsModalTitle}>
              Team stats
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Compare player attendance, match minutes, and recent form.
            </ThemedText>
          </ThemedView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close team statistics"
            onPress={onClose}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <SymbolView
              name={{ ios: "xmark", android: "close", web: "close" }}
              tintColor={theme.text}
              size={18}
            />
          </Pressable>
        </ThemedView>

        {stats.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.emptyPanel}>
            <ThemedText type="smallBold">No team stats yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Add players and mark attendance to build the team overview.
            </ThemedText>
          </ThemedView>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={styles.teamStatsTableScrollContent}
          >
            <ThemedView type="backgroundElement" style={styles.teamStatsTable}>
              <ThemedView type="backgroundSelected" style={styles.teamStatsTableHeaderRow}>
                {([
                  ["Player", "player", styles.teamStatsPlayerCell],
                  ["Training %", "trainingAttendancePercentage"],
                  ["Match %", "matchAttendancePercentage"],
                  ["Late %", "latePercentage"],
                  ["Starts", "matchStarts"],
                  ["Starter %", "matchStarterPercentage"],
                  ["Avg min", "averageMatchMinutes"],
                  ["Goals", "matchGoals"],
                  ["Assists", "matchAssists"],
                  ["YC", "matchYellowCards"],
                  ["RC", "matchRedCards"],
                  ["Clean sheets", "matchCleanSheets"],
                  ["Avg rating", "averageMatchRating"],
                  ["Goals/90", "matchGoalsPer90"],
                  ["Assists/90", "matchAssistsPer90"],
                  ["Duties", "matchDutiesAssigned"],
                  ["Fulfilled", "matchDutiesFulfilled"],
                  ["Duty %", "matchDutyFulfillmentPercentage"],
                  ["Last 5", "recentForm", styles.teamStatsRecentCell],
                ] as [string, TeamStatsSortKey, object?][]).map(([label, key, style]) => (
                  <TeamStatsHeaderCell
                    key={key}
                    activeSortKey={sortKey}
                    direction={sortDirection}
                    label={label}
                    onSort={changeSort}
                    sortKey={key}
                    style={style}
                  />
                ))}
              </ThemedView>

              <ScrollView showsVerticalScrollIndicator={false}>
                {sortedStats.map((playerStats) => (
                  <ThemedView
                    key={playerStats.playerId}
                    type="backgroundElement"
                    style={styles.teamStatsTableRow}
                  >
                    <ThemedView
                      type="backgroundElement"
                      style={[styles.teamStatsPlayerCell, styles.teamStatsPlayerDataCell]}
                    >
                      <ThemedText type="smallBold">
                        {playerStats.firstName} {playerStats.lastName}
                      </ThemedText>
                      <ThemedText type="code" themeColor="textSecondary">
                        {getPlayerPositionLabel(playerStats.position, DEFAULT_LOCALE)}
                      </ThemedText>
                    </ThemedView>
                    <TeamStatsValueCell
                      value={formatPercentage(playerStats.trainingAttendancePercentage)}
                    />
                    <TeamStatsValueCell
                      value={formatPercentage(playerStats.matchAttendancePercentage)}
                    />
                    <TeamStatsValueCell value={formatPercentage(playerStats.latePercentage)} />
                    <TeamStatsValueCell value={String(playerStats.matchStarts)} />
                    <TeamStatsValueCell
                      value={formatPercentage(playerStats.matchStarterPercentage)}
                    />
                    <TeamStatsValueCell
                      value={formatNullableNumber(playerStats.averageMatchMinutes)}
                    />
                    <TeamStatsValueCell value={String(playerStats.matchGoals)} />
                    <TeamStatsValueCell value={String(playerStats.matchAssists)} />
                    <TeamStatsValueCell value={String(playerStats.matchYellowCards)} />
                    <TeamStatsValueCell value={String(playerStats.matchRedCards)} />
                    <TeamStatsValueCell
                      value={
                        isCleanSheetPosition(playerStats.position)
                          ? String(playerStats.matchCleanSheets)
                          : "-"
                      }
                    />
                    <TeamStatsValueCell
                      value={formatNullableNumber(playerStats.averageMatchRating)}
                    />
                    <TeamStatsValueCell value={formatNullableNumber(playerStats.matchGoalsPer90)} />
                    <TeamStatsValueCell value={formatNullableNumber(playerStats.matchAssistsPer90)} />
                    <TeamStatsValueCell value={String(playerStats.matchDutiesAssigned)} />
                    <TeamStatsValueCell value={String(playerStats.matchDutiesFulfilled)} />
                    <TeamStatsValueCell
                      value={formatPercentage(playerStats.matchDutyFulfillmentPercentage)}
                    />
                    <ThemedView type="backgroundElement" style={styles.teamStatsRecentCell}>
                      <TeamStatsRecentRatings
                        ratings={playerStats.recentMatchRatings.map((rating) => rating.rating)}
                      />
                    </ThemedView>
                  </ThemedView>
                ))}
              </ScrollView>
            </ThemedView>
          </ScrollView>
        )}
      </ThemedView>
    </Modal>
  );
}

function TeamStatsHeaderCell({
  activeSortKey,
  direction,
  label,
  onSort,
  sortKey,
  style,
}: {
  activeSortKey: TeamStatsSortKey;
  direction: "asc" | "desc";
  label: string;
  onSort: (key: TeamStatsSortKey) => void;
  sortKey: TeamStatsSortKey;
  style?: object;
}) {
  const isActive = activeSortKey === sortKey;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sort by ${label}`}
      accessibilityState={{ selected: isActive }}
      onPress={() => onSort(sortKey)}
      style={({ pressed }) => [
        styles.teamStatsTableCell,
        style,
        pressed && styles.pressed,
      ]}
    >
      <ThemedView type="backgroundSelected" style={styles.teamStatsSortableHeader}>
        <ThemedText type="code" themeColor="textSecondary" style={styles.teamStatsHeaderText}>
          {label}
        </ThemedText>
        {isActive ? (
          <ThemedText type="smallBold" style={styles.teamStatsSortIndicator}>
            {direction === "asc" ? "↑" : "↓"}
          </ThemedText>
        ) : null}
      </ThemedView>
    </Pressable>
  );
}

function TeamStatsValueCell({ value }: { value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.teamStatsTableCell}>
      <ThemedText type="smallBold" style={styles.teamStatsValueText}>
        {value}
      </ThemedText>
    </ThemedView>
  );
}

function TeamStatsRecentRatings({ ratings }: { ratings: number[] }) {
  if (ratings.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        -
      </ThemedText>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.teamStatsRecentRatings}>
      {ratings.map((rating, index) => (
        <ThemedView
          key={`${rating}-${index}`}
          style={[styles.teamStatsRecentRatingPill, getRecentRatingStyle(rating)]}
        >
          <ThemedText
            type="smallBold"
            style={[styles.teamStatsRecentRatingText, getRecentRatingTextStyle(rating)]}
          >
            {rating}
          </ThemedText>
        </ThemedView>
      ))}
    </ThemedView>
  );
}

function PlayerStatsPanel({ stats }: { stats: PlayerAttendanceStats }) {
  const hasMarkedEvents = stats.totalEvents > 0 || stats.matchAppearances > 0;

  if (!hasMarkedEvents) {
    return (
      <ThemedView type="backgroundElement" style={styles.playerStatsPanel}>
        <ThemedText type="smallBold">No marked attendance yet</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          These stats update after attendance is saved for an event.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.statsSections}>
      <ThemedView type="backgroundElement" style={styles.playerStatsPanel}>
        <ThemedText type="smallBold">Attendance</ThemedText>
        <ThemedView type="backgroundElement" style={styles.statList}>
          <PlayerStatRow
            label="Training"
            value={formatPercentage(stats.trainingAttendancePercentage)}
            detail={`${stats.trainingAttended}/${stats.trainingEvents} attended`}
          />
          <PlayerStatRow
            label="Matches"
            value={formatPercentage(stats.matchAttendancePercentage)}
            detail={`${stats.matchAttended}/${stats.matchEvents} attended`}
          />
          <PlayerStatRow
            label="Late"
            value={formatPercentage(stats.latePercentage)}
            detail={`${stats.lateCount} ${stats.lateCount === 1 ? "time" : "times"}`}
          />
          <PlayerStatRow
            label="Available but absent"
            value={String(stats.availableButAbsentCount)}
            detail="signed available, did not attend"
          />
          <PlayerStatRow
            label="Out but attended"
            value={String(stats.signedOutButAttendedCount)}
            detail="signed out, still attended"
          />
        </ThemedView>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.playerStatsPanel}>
        <ThemedText type="smallBold">Match data</ThemedText>
        <ThemedView type="backgroundElement" style={styles.statList}>
          <PlayerStatRow
            label="Appearances"
            value={String(stats.matchAppearances)}
            detail={`${stats.matchEvents} completed matches`}
          />
          <PlayerStatRow
            label="Starts"
            value={String(stats.matchStarts)}
            detail="named in the starting XI"
          />
          <PlayerStatRow
            label="Starter"
            value={formatPercentage(stats.matchStarterPercentage)}
            detail="starts per appearance"
          />
          <PlayerStatRow
            label="Avg mins"
            value={formatNullableNumber(stats.averageMatchMinutes)}
            detail={`${stats.totalMatchMinutes} total minutes`}
          />
          <PlayerStatRow
            label="Goals"
            value={String(stats.matchGoals)}
            detail="season match goals"
          />
          <PlayerStatRow
            label="Assists"
            value={String(stats.matchAssists)}
            detail="season match assists"
          />
          <PlayerStatRow
            label="Yellow cards"
            value={String(stats.matchYellowCards)}
            detail="season yellow cards"
          />
          <PlayerStatRow
            label="Red cards"
            value={String(stats.matchRedCards)}
            detail="season red cards"
          />
          {isCleanSheetPosition(stats.position) ? (
            <PlayerStatRow
              label="Clean sheets"
              value={String(stats.matchCleanSheets)}
              detail="0 conceded and at least 60 minutes played"
            />
          ) : null}
          <PlayerStatRow
            label="Average rating"
            value={formatNullableNumber(stats.averageMatchRating)}
            detail="per rated match"
          />
          <PlayerStatRow
            label="Goals/90"
            value={formatNullableNumber(stats.matchGoalsPer90)}
            detail="goals per 90 minutes"
          />
          <PlayerStatRow
            label="Assists/90"
            value={formatNullableNumber(stats.matchAssistsPer90)}
            detail="assists per 90 minutes"
          />
          <PlayerStatRow
            label="Match duties"
            value={String(stats.matchDutiesAssigned)}
            detail={`${stats.matchDutiesFulfilled} fulfilled`}
          />
          <PlayerStatRow
            label="Duty fulfillment"
            value={formatPercentage(stats.matchDutyFulfillmentPercentage)}
            detail="fulfilled per assignment"
          />
        </ThemedView>
        <RecentMatchRatings
          ratings={stats.recentMatchRatings.map((rating) => rating.rating)}
        />
      </ThemedView>

    </ThemedView>
  );
}

function RecentMatchRatings({ ratings }: { ratings: number[] }) {
  return (
    <ThemedView type="backgroundElement" style={styles.recentRatingsGroup}>
      <ThemedText type="smallBold">Recent form</ThemedText>
      {ratings.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No match ratings yet.
        </ThemedText>
      ) : (
        <ThemedView type="backgroundElement" style={styles.recentRatingList}>
          {ratings.map((rating, index) => (
            <ThemedView
              key={`${rating}-${index}`}
              style={[styles.recentRatingPill, getRecentRatingStyle(rating)]}
            >
              <ThemedText
                type="smallBold"
                style={[
                  styles.recentRatingText,
                  getRecentRatingTextStyle(rating),
                ]}
              >
                {rating}
              </ThemedText>
            </ThemedView>
          ))}
        </ThemedView>
      )}
    </ThemedView>
  );
}

function PlayerStatRow({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.statRow}>
      <ThemedView type="backgroundElement" style={styles.statRowText}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </ThemedView>
      <ThemedText type="default" style={styles.statRowValue}>
        {value}
      </ThemedText>
    </ThemedView>
  );
}

type PlayerTextInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  keyboardType?: "default" | "number-pad";
};

function PlayerTextInput({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  keyboardType = "default",
}: PlayerTextInputProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">
        {label}
        {required ? " *" : ""}
      </ThemedText>
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.textInput,
          {
            backgroundColor: theme.backgroundElement,
            color: theme.text,
          },
        ]}
        value={value}
      />
    </ThemedView>
  );
}

type BirthDatePickerFieldProps = {
  isOpen: boolean;
  value: string;
  onOpen: () => void;
  onChange: (value: string) => void;
  onClose: () => void;
};

function BirthDatePickerField({
  isOpen,
  value,
  onOpen,
  onChange,
  onClose,
}: BirthDatePickerFieldProps) {
  const theme = useTheme();
  const selectedDate = parseDisplayDateToDate(value) ?? new Date(2012, 0, 1);

  function handleValueChange(_: unknown, date: Date) {
    if (Platform.OS === "android") {
      onClose();
    }

    onChange(formatDateForDisplay(date));
  }

  function handleDismiss() {
    if (Platform.OS === "android") {
      onClose();
    }
  }

  return (
    <ThemedView style={styles.fieldGroup}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open birth date picker"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.datePickerButton,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{
            ios: "calendar",
            android: "calendar_month",
            web: "calendar_month",
          }}
          tintColor={theme.text}
          size={18}
        />
        <ThemedText type="smallBold">{value || "Choose birth date"}</ThemedText>
      </Pressable>

      {isOpen ? (
        <>
          <DateTimePicker
            display={Platform.OS === "ios" ? "spinner" : "calendar"}
            maximumDate={new Date()}
            mode="date"
            onDismiss={handleDismiss}
            onValueChange={handleValueChange}
            value={selectedDate}
          />
          {Platform.OS === "ios" ? (
            <PickerDoneButton onPress={onClose} />
          ) : null}
        </>
      ) : null}
    </ThemedView>
  );
}

function PickerDoneButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Confirm birth date"
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        styles.pickerDoneButton,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold" style={styles.primaryButtonText}>
        Done
      </ThemedText>
    </Pressable>
  );
}

function parseDisplayDateToIsoDate(value: string) {
  const date = parseDisplayDateToDate(value);

  if (!date) {
    return null;
  }

  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDisplayDateToDate(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(normalizedValue);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date > new Date()
  ) {
    return null;
  }

  return date;
}

function formatDateForDisplay(date: Date) {
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getFullYear()).padStart(4, "0"),
  ].join("-");
}

function formatIsoDateForDisplay(value: string | null) {
  if (!value) {
    return "";
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return "";
  }

  return [match[3], match[2], match[1]].join("-");
}

function normalizeNameInput(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isValidNameInput(value: string) {
  return /^\p{L}+(?: \p{L}+)*$/u.test(value);
}

function findDuplicatePlayer(
  firstName: string,
  lastName: string,
  players: Player[],
  ignoredPlayerId: number | null,
) {
  const normalizedFirstName = normalizePlayerNameForDuplicateCheck(firstName);
  const normalizedLastName = normalizePlayerNameForDuplicateCheck(lastName);

  return players.find(
    (player) =>
      player.id !== ignoredPlayerId &&
      normalizePlayerNameForDuplicateCheck(player.firstName) ===
        normalizedFirstName &&
      normalizePlayerNameForDuplicateCheck(player.lastName) ===
        normalizedLastName,
  );
}

function normalizePlayerNameForDuplicateCheck(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function findNextAvailableKitNumber(
  requestedNumber: number,
  players: Player[],
  ignoredPlayerId: number | null,
) {
  const occupiedNumbers = new Set(
    players
      .filter((player) => player.id !== ignoredPlayerId)
      .map((player) => player.kitNumber)
      .filter((kitNumber): kitNumber is number => kitNumber !== null),
  );
  let candidate = requestedNumber + 1;
  while (occupiedNumbers.has(candidate)) candidate += 1;
  return candidate;
}

function confirmDuplicatePlayer(playerName: string, onConfirm: () => void) {
  const message = `"${playerName}" already exists. Are you sure you want to add another one?`;

  if (Platform.OS === "web") {
    if (globalThis.confirm(message)) {
      onConfirm();
    }
    return;
  }

  Alert.alert("Possible duplicate player", message, [
    {
      text: "Cancel",
      style: "cancel",
    },
    {
      text: "Add anyway",
      style: "default",
      onPress: onConfirm,
    },
  ]);
}

function compareTeamStats(
  left: PlayerAttendanceStats,
  right: PlayerAttendanceStats,
  key: TeamStatsSortKey,
  direction: "asc" | "desc",
) {
  const leftValue = getTeamStatsSortValue(left, key);
  const rightValue = getTeamStatsSortValue(right, key);

  if (leftValue === null && rightValue === null) return 0;
  if (leftValue === null) return 1;
  if (rightValue === null) return -1;

  const comparison = typeof leftValue === "string"
    ? leftValue.localeCompare(String(rightValue))
    : leftValue - Number(rightValue);
  return direction === "asc" ? comparison : -comparison;
}

function getTeamStatsSortValue(stats: PlayerAttendanceStats, key: TeamStatsSortKey) {
  switch (key) {
    case "player":
      return `${stats.firstName} ${stats.lastName}`.toLocaleLowerCase();
    case "trainingAttendancePercentage": return stats.trainingAttendancePercentage;
    case "matchAttendancePercentage": return stats.matchAttendancePercentage;
    case "latePercentage": return stats.latePercentage;
    case "matchStarts": return stats.matchStarts;
    case "matchStarterPercentage": return stats.matchStarterPercentage;
    case "averageMatchMinutes": return stats.averageMatchMinutes;
    case "matchGoals": return stats.matchGoals;
    case "matchAssists": return stats.matchAssists;
    case "matchYellowCards": return stats.matchYellowCards;
    case "matchRedCards": return stats.matchRedCards;
    case "matchCleanSheets":
      return isCleanSheetPosition(stats.position) ? stats.matchCleanSheets : null;
    case "averageMatchRating": return stats.averageMatchRating;
    case "matchGoalsPer90": return stats.matchGoalsPer90;
    case "matchAssistsPer90": return stats.matchAssistsPer90;
    case "matchDutiesAssigned": return stats.matchDutiesAssigned;
    case "matchDutiesFulfilled": return stats.matchDutiesFulfilled;
    case "matchDutyFulfillmentPercentage": return stats.matchDutyFulfillmentPercentage;
    case "recentForm": {
      const ratings = stats.recentMatchRatings.slice(0, 5);
      return ratings.length
        ? ratings.reduce((total, rating) => total + rating.rating, 0) / ratings.length
        : null;
    }
  }
}

function createEmptyPlayerStats(player: Player): PlayerAttendanceStats {
  return {
    playerId: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    nickName: player.nickName,
    position: player.position,
    totalEvents: 0,
    attendedEvents: 0,
    trainingEvents: 0,
    trainingAttended: 0,
    trainingAttendancePercentage: null,
    recentTrainingEvents: 0,
    recentTrainingAttended: 0,
    recentTrainingAttendancePercentage: null,
    matchEvents: 0,
    matchAttended: 0,
    matchAttendancePercentage: null,
    matchAppearances: 0,
    matchStarts: 0,
    matchStarterPercentage: null,
    matchGoals: 0,
    matchAssists: 0,
    matchYellowCards: 0,
    matchRedCards: 0,
    matchCleanSheets: 0,
    matchGoalsPer90: null,
    matchAssistsPer90: null,
    matchDutiesAssigned: 0,
    matchDutiesFulfilled: 0,
    matchDutyFulfillmentPercentage: null,
    teamEvents: 0,
    teamEventsAttended: 0,
    teamEventAttendancePercentage: null,
    totalMatchMinutes: 0,
    averageMatchMinutes: null,
    averageMatchRating: null,
    lateCount: 0,
    latePercentage: null,
    availableButAbsentCount: 0,
    signedOutButAttendedCount: 0,
    recentMatchRatings: [],
  };
}

function isCleanSheetPosition(position: Player["position"]) {
  return position === "goalkeeper" || position === "defender";
}

function formatPercentage(value: number | null) {
  return value === null ? "-" : `${value}%`;
}

function formatNullableNumber(value: number | null) {
  return value === null ? "-" : String(value);
}

function getRecentRatingStyle(rating: number) {
  if (rating >= 8) {
    return styles.recentRatingGood;
  }

  if (rating >= 5) {
    return styles.recentRatingOk;
  }

  return styles.recentRatingPoor;
}

function getRecentRatingTextStyle(rating: number) {
  return rating >= 5 && rating < 8
    ? styles.recentRatingTextDark
    : styles.recentRatingTextLight;
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
    alignItems: "flex-end",
    gap: Spacing.two,
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
  teamStatsButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: StatsColor,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: Spacing.one,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  actionButtonText: {
    color: "#ffffff",
  },
  teamStatsButtonText: {
    color: StatsColor,
  },
  pressed: {
    opacity: 0.7,
  },
  emptyPanel: {
    alignItems: "center",
    borderRadius: Spacing.three,
    gap: Spacing.two,
    minHeight: 180,
    justifyContent: "center",
    padding: Spacing.four,
  },
  emptyText: {
    textAlign: "center",
  },
  playerList: {
    gap: Spacing.three,
  },
  positionSection: {
    gap: Spacing.two,
  },
  positionSectionHeader: {
    alignItems: "center",
    borderRadius: Spacing.three,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: Spacing.three,
  },
  positionSectionTitle: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  positionSectionPlayers: {
    gap: Spacing.two,
  },
  noPositionPlayers: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  playerCard: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  playerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 52,
  },
  playerToggle: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.two,
  },
  playerNameGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  playerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
    justifyContent: "flex-end",
  },
  rowActionButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    height: 40,
    minHeight: 40,
    justifyContent: "center",
    width: 40,
  },
  editButton: {
    backgroundColor: "transparent",
    borderColor: WarningColor,
    borderWidth: 1.5,
  },
  statsButton: {
    backgroundColor: "transparent",
    borderColor: StatsColor,
    borderWidth: 1.5,
  },
  deleteButton: {
    backgroundColor: "transparent",
    borderColor: ErrorColor,
    borderWidth: 1.5,
  },
  playerStatsPanel: {
    borderRadius: Spacing.two,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  statsSections: {
    gap: Spacing.three,
  },
  statList: {
    gap: Spacing.two,
  },
  statRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
    justifyContent: "space-between",
    minHeight: 48,
  },
  statRowText: {
    flex: 1,
    gap: Spacing.half,
  },
  statRowValue: {
    textAlign: "right",
  },
  recentRatingsGroup: {
    gap: Spacing.two,
  },
  recentRatingList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  recentRatingPill: {
    alignItems: "center",
    borderRadius: Spacing.two,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  recentRatingGood: {
    backgroundColor: "#1C7C54",
  },
  recentRatingOk: {
    backgroundColor: WarningColor,
  },
  recentRatingPoor: {
    backgroundColor: ErrorColor,
  },
  recentRatingText: {
    textAlign: "center",
  },
  recentRatingTextLight: {
    color: "#ffffff",
  },
  recentRatingTextDark: {
    color: WarningTextColor,
  },
  statsModalTitleGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  statsModalPlayerName: {
    fontSize: 24,
    lineHeight: 30,
  },
  statsModalContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
  teamStatsModalScreen: {
    flex: 1,
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  teamStatsModalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.three,
    justifyContent: "space-between",
  },
  teamStatsModalTitleGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  teamStatsModalTitle: {
    lineHeight: 38,
  },
  teamStatsTableScrollContent: {
    paddingBottom: Spacing.three,
  },
  teamStatsTable: {
    borderRadius: Spacing.three,
    minWidth: 1030,
    overflow: "hidden",
  },
  teamStatsTableHeaderRow: {
    flexDirection: "row",
    minHeight: 48,
  },
  teamStatsTableRow: {
    borderTopColor: "rgba(128, 128, 128, 0.18)",
    borderTopWidth: 1,
    flexDirection: "row",
    minHeight: 64,
  },
  teamStatsTableCell: {
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    width: 92,
  },
  teamStatsPlayerCell: {
    paddingLeft: Spacing.three,
    paddingRight: Spacing.three,
    width: 170,
  },
  teamStatsPlayerDataCell: {
    paddingBottom: Spacing.three,
    paddingTop: Spacing.three,
  },
  teamStatsRecentCell: {
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    width: 210,
  },
  teamStatsHeaderText: {
    textTransform: "uppercase",
  },
  teamStatsSortableHeader: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "center",
  },
  teamStatsSortIndicator: {
    color: "#1C7C54",
  },
  teamStatsValueText: {
    textAlign: "center",
  },
  teamStatsRecentRatings: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  teamStatsRecentRatingPill: {
    alignItems: "center",
    borderRadius: Spacing.two,
    height: 28,
    justifyContent: "center",
    width: 32,
  },
  teamStatsRecentRatingText: {
    fontSize: 13,
    lineHeight: 18,
  },
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
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: "100%",
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  formContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
  fieldGroup: {
    gap: Spacing.two,
  },
  textInput: {
    borderRadius: Spacing.two,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  datePickerButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  pickerDoneButton: {
    alignSelf: "flex-end",
    marginTop: Spacing.one,
  },
  positionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  positionOption: {
    minWidth: 136,
  },
  positionOptionInner: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "#1C7C54",
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  positionOptionInnerSelected: {
    backgroundColor: "#1C7C54",
  },
  positionOptionText: {
    color: "#1C7C54",
  },
  positionOptionTextSelected: {
    color: "#ffffff",
  },
  formActions: {
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "flex-end",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "#7A7A7A",
    borderRadius: Spacing.two,
    borderWidth: 1.5,
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
});
