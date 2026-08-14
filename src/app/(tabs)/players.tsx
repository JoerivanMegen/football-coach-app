import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  ActionColors,
  BottomTabInset,
  PageTopPadding,
  Spacing,
} from "@/constants/theme";
import { listPlayerAttendanceStatsAsync } from "@/features/player-stats/player-stats-repository";
import type { PlayerAttendanceStats } from "@/features/player-stats/player-stats-types";
import { PlayerCard } from "@/features/players/components/player-card";
import { emptyPlayerFormState, PlayerFormModal, type PlayerFormState } from "@/features/players/components/player-form-modal";
import { PlayerProfileStatsModal } from "@/features/players/components/player-profile-stats-modal";
import { PlayerStatsPanel, TeamStatsModal } from "@/features/players/components/player-statistics-modals";
import { playerStyles as styles } from "@/features/players/components/player-styles";
import { createEmptyPlayerStats as createSharedEmptyPlayerStats } from "@/features/players/player-stats-utils";
import {
  findDuplicatePlayer,
  findNextAvailableKitNumber,
  formatIsoDateForDisplay,
  formatDateForDisplay,
  isValidNameInput,
  normalizeNameInput,
  parseDisplayDateToIsoDate,
} from "@/features/players/player-form-utils";
import {
  archivePlayerAsync,
  createPlayerAsync,
  deletePlayerInjuryAsync,
  listPlayerInjuriesAsync,
  listPlayersAsync,
  savePlayerWithKitReassignmentAsync,
  savePlayerInjuryStatusAsync,
  updatePlayerAsync,
  updatePlayerInjuryAsync,
} from "@/features/players/player-repository";
import {
  type CreatePlayerInput,
  type Player,
  type PlayerInjury,
  type PlayerPosition,
} from "@/features/players/player-types";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";
import type { TranslationKey } from "@/i18n/generated/translations";

const playerPositionSections: { position: PlayerPosition; labelKey: TranslationKey }[] = [
  { position: "goalkeeper", labelKey: "players.overview.groups.goalkeepers" },
  { position: "defender", labelKey: "players.overview.groups.defenders" },
  { position: "midfielder", labelKey: "players.overview.groups.midfielders" },
  { position: "forward", labelKey: "players.overview.groups.attackers" },
];

export default function PlayersScreen() {
  const router = useRouter();
  const { openTeamStats } = useLocalSearchParams<{ openTeamStats?: string }>();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useI18n();
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerAttendanceStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBirthDatePickerOpen, setIsBirthDatePickerOpen] = useState(false);
  const [isInjuryDatePickerOpen, setIsInjuryDatePickerOpen] = useState(false);
  const [originalInjuryDate, setOriginalInjuryDate] = useState<string | null>(null);
  const [playerInjuries, setPlayerInjuries] = useState<PlayerInjury[]>([]);
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [selectedStatsPlayerId, setSelectedStatsPlayerId] = useState<
    number | null
  >(null);
  const [isTeamStatsOpen, setIsTeamStatsOpen] = useState(false);

  function closeTeamStats() {
    setIsTeamStatsOpen(false);
    if (openTeamStats) {
      router.setParams({ openTeamStats: "" });
    }
  }
  const [expandedPositionSections, setExpandedPositionSections] = useState<
    Record<PlayerPosition, boolean>
  >({ goalkeeper: true, defender: true, midfielder: true, forward: true });
  const [form, setForm] = useState<PlayerFormState>(emptyPlayerFormState);
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
      Alert.alert(t("players.errors.load.title"), t("players.errors.load.message"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void loadPlayers();
    }, [loadPlayers]),
  );

  function openAddPlayerForm() {
    setEditingPlayerId(null);
    setForm(emptyPlayerFormState);
    setIsBirthDatePickerOpen(false);
    setIsInjuryDatePickerOpen(false);
    setOriginalInjuryDate(null);
    setPlayerInjuries([]);
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
      isInjured: player.activeInjuryStartDate !== null,
      injuryDate: player.activeInjuryStartDate
        ? formatIsoDateForDisplay(player.activeInjuryStartDate)
        : formatDateForDisplay(new Date()),
      injuryNote: "",
    });
    setIsBirthDatePickerOpen(false);
    setIsInjuryDatePickerOpen(false);
    setOriginalInjuryDate(
      player.activeInjuryStartDate
        ? formatIsoDateForDisplay(player.activeInjuryStartDate)
        : null,
    );
    setIsFormOpen(true);
    void listPlayerInjuriesAsync(player.id).then((injuries) => {
      setPlayerInjuries(injuries);
      const activeInjury = injuries.find((injury) => injury.endDate === null);
      if (activeInjury) {
        setForm((current) => ({ ...current, injuryNote: activeInjury.note }));
      }
    });
  }

  function closeForm() {
    if (!isSaving) {
      setIsBirthDatePickerOpen(false);
      setIsInjuryDatePickerOpen(false);
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
    const injuryDate = parseDisplayDateToIsoDate(form.injuryDate);

    if (!firstName || !lastName) {
      Alert.alert(
        t("players.form.validation.required_names.title"),
        t("players.form.validation.required_names.message"),
      );
      return;
    }

    if (!isValidNameInput(firstName)) {
      Alert.alert(
        t("players.form.validation.invalid_first_name.title"),
        t("players.form.validation.invalid_first_name.message"),
      );
      return;
    }

    if (!isValidNameInput(lastName)) {
      Alert.alert(
        t("players.form.validation.invalid_last_name.title"),
        t("players.form.validation.invalid_last_name.message"),
      );
      return;
    }

    if (nickName && !isValidNameInput(nickName)) {
      Alert.alert(
        t("players.form.validation.invalid_nickname"),
        t("players.form.validation.invalid_first_name.message"),
      );
      return;
    }

    if (form.birthDate.trim() && !birthDate) {
      Alert.alert(
        t("players.form.validation.invalid_birth_date.title"),
        t("players.form.validation.invalid_birth_date.message"),
      );
      return;
    }

    if (editingPlayerId !== null && !injuryDate) {
      Alert.alert(
        t("players.form.validation.invalid_injury_date.title"),
        t("players.form.validation.invalid_injury_date.message"),
      );
      return;
    }

    const editingPlayer = players.find((player) => player.id === editingPlayerId);
    if (
      editingPlayer?.activeInjuryStartDate &&
      !form.isInjured &&
      injuryDate &&
      injuryDate < editingPlayer.activeInjuryStartDate
    ) {
      Alert.alert(
        t("players.form.validation.invalid_injury_date.title"),
        t("players.form.validation.invalid_injury_date.message"),
      );
      return;
    }

    if (!form.position) {
      Alert.alert(t("players.form.validation.required_names.title"), t("players.form.validation.position_required"));
      return;
    }

    if (kitNumber !== null && (!Number.isInteger(kitNumber) || kitNumber < 0)) {
      Alert.alert(
        t("players.form.validation.invalid_kit_number.title"),
        t("players.form.validation.invalid_kit_number.message"),
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
      }, t);
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
    const message = t("players.form.duplicate.kit_number_message", {
      name: conflictingName,
      number: nextAvailableNumber,
    });
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

    Alert.alert(t("players.form.duplicate.kit_number_title"), message, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("players.form.duplicate.change_number"),
        onPress: confirmReassignment,
      },
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
      if (editingPlayerId !== null) {
        const injuryDate = parseDisplayDateToIsoDate(form.injuryDate);
        if (!injuryDate) {
          throw new Error("Invalid injury date.");
        }
        await savePlayerInjuryStatusAsync(
          editingPlayerId,
          form.isInjured,
          injuryDate,
          form.injuryNote,
        );
      }
      setIsFormOpen(false);
      setForm(emptyPlayerFormState);
      setEditingPlayerId(null);
      await loadPlayers();
    } catch (error) {
      console.warn("Failed to save player", error);
      Alert.alert(
        t("players.errors.save.title"),
        t("players.errors.save.message"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function updateInjury(
    injuryId: number,
    input: { startDate: string; endDate: string | null; note: string },
  ) {
    if (editingPlayerId === null) return false;
    try {
      await updatePlayerInjuryAsync(injuryId, input);
      const injuries = await listPlayerInjuriesAsync(editingPlayerId);
      setPlayerInjuries(injuries);
      const activeInjury = injuries.find((injury) => injury.endDate === null);
      setOriginalInjuryDate(
        activeInjury ? formatIsoDateForDisplay(activeInjury.startDate) : null,
      );
      setForm((current) => ({
        ...current,
        isInjured: Boolean(activeInjury),
        injuryDate: activeInjury
          ? formatIsoDateForDisplay(activeInjury.startDate)
          : current.injuryDate,
        injuryNote: activeInjury?.note ?? "",
      }));
      await loadPlayers();
      return true;
    } catch (error) {
      console.warn("Failed to update injury", error);
      Alert.alert(
        t("players.form.validation.invalid_injury_date.title"),
        error instanceof Error && error.message.includes("overlap")
          ? t("players.form.injury.overlap_error")
          : t("players.form.validation.invalid_injury_date.message"),
      );
      return false;
    }
  }

  function deleteInjury(injury: PlayerInjury) {
    const confirmDelete = async () => {
      await deletePlayerInjuryAsync(injury.id);
      if (injury.endDate === null) {
        setForm((current) => ({
          ...current,
          isInjured: false,
          injuryDate: formatDateForDisplay(new Date()),
          injuryNote: "",
        }));
        setOriginalInjuryDate(null);
      }
      if (editingPlayerId !== null) {
        setPlayerInjuries(await listPlayerInjuriesAsync(editingPlayerId));
      }
      await loadPlayers();
    };
    if (Platform.OS === "web") {
      if (globalThis.confirm(t("players.form.injury.delete_message"))) {
        void confirmDelete();
      }
      return;
    }
    Alert.alert(
      t("players.form.injury.delete_title"),
      t("players.form.injury.delete_message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => void confirmDelete(),
        },
      ],
    );
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

    Alert.alert(t("players.confirm.delete_title"), message, [
      {
        text: t("common.cancel"),
        style: "cancel",
      },
      {
        text: t("common.delete"),
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
      Alert.alert(t("players.errors.delete.title"), t("players.errors.delete.message"));
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
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentInset={insets}
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
      >
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedView style={styles.titleGroup}>
              <ThemedText type="subtitle" style={styles.title}>
                {t("players.overview.title")}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.description}>
                {t("players.overview.subtitle")}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("players.overview.add_player")}
                onPress={openAddPlayerForm}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
              >
                <SymbolView
                  name={{ ios: "plus", android: "add", web: "add" }}
                  tintColor="#ffffff"
                  size={18}
                />
                <ThemedText type="smallBold" style={styles.actionButtonText}>
                  {t("players.overview.add_player")}
                </ThemedText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("players.overview.open_team_stats")}
                onPress={() => setIsTeamStatsOpen(true)}
                style={({ pressed }) => [styles.teamStatsButton, pressed && styles.pressed]}
              >
                <SymbolView
                  name={{
                    ios: "chart.bar.xaxis",
                    android: "bar_chart",
                    web: "bar_chart",
                  }}
                  tintColor={ActionColors.info}
                  size={18}
                />
                <ThemedText type="smallBold" style={styles.teamStatsButtonText}>
                  {t("players.stats.team_title")}
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
              <ThemedText type="smallBold">{t("players.overview.empty.title")}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                {t("players.overview.empty.description")}
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedView style={styles.playerList}>
              {playerPositionSections.map((section) => {
                const sectionLabel = t(section.labelKey);
                const sectionPlayers = players.filter(
                  (player) => player.position === section.position,
                );
                const isExpanded = expandedPositionSections[section.position];

                return (
                  <ThemedView key={section.position} style={styles.positionSection}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                      accessibilityLabel={sectionLabel}
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
                          <ThemedText type="default">{sectionLabel}</ThemedText>
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
                            {t("players.overview.empty.title")}
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

<PlayerFormModal
        editing={editingPlayerId !== null}
        form={form}
        isBirthDatePickerOpen={isBirthDatePickerOpen}
        isInjuryDatePickerOpen={isInjuryDatePickerOpen}
        isSaving={isSaving}
        onChange={setForm}
        onClose={closeForm}
        onSave={() => void handleSavePlayer()}
        onSetBirthDatePickerOpen={setIsBirthDatePickerOpen}
        onSetInjuryDatePickerOpen={setIsInjuryDatePickerOpen}
        injuries={playerInjuries}
        onDeleteInjury={deleteInjury}
        onUpdateInjury={updateInjury}
        originalInjuryDate={originalInjuryDate}
        visible={isFormOpen}
      />

      <PlayerProfileStatsModal
        player={selectedStatsPlayer}
        visible={selectedStatsPlayer !== null}
        onClose={() => setSelectedStatsPlayerId(null)}
      >
        {selectedStatsPlayer ? (
          <PlayerStatsPanel
            stats={playerStatsById.get(selectedStatsPlayer.id) ?? createSharedEmptyPlayerStats(selectedStatsPlayer)}
          />
        ) : null}
      </PlayerProfileStatsModal>

      <TeamStatsModal
        stats={playerStats}
        visible={isTeamStatsOpen || openTeamStats === "true"}
        onClose={closeTeamStats}
      />
    </>
  );
}

function confirmDuplicatePlayer(
  playerName: string,
  onConfirm: () => void,
  t: ReturnType<typeof useI18n>["t"],
) {
  const message = t("players.form.duplicate.player_message", {
    name: playerName,
  });

  if (Platform.OS === "web") {
    if (globalThis.confirm(message)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(t("players.form.duplicate.player_title"), message, [
    {
      text: t("common.cancel"),
      style: "cancel",
    },
    {
      text: t("players.form.duplicate.add_anyway"),
      style: "default",
      onPress: onConfirm,
    },
  ]);
}
