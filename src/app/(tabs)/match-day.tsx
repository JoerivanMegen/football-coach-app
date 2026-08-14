import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { formatDateForDisplay } from "@/features/events/components/event-wizard/event-details-step";
import type { SignupStatus } from "@/features/events/components/event-wizard/event-wizard-types";
import { listGuestPlayersAsync } from "@/features/match-day/guest-player-repository";
import {
  createMatchDayMatchAsync,
  deleteMatchDayMatchAsync,
  listMatchDayMatchesAsync,
  updateMatchDayMatchAsync,
  updateMatchDayMatchResultAsync,
} from "@/features/match-day/match-day-repository";
import {
  formatIsoDateForDisplay,
  getMatchCategoryIcon,
  hasMatchResult,
  parseDisplayDateToDate,
  parseDisplayDateToIsoDate,
  parseDisplayTimeToDate,
} from "@/features/match-day/match-day-utils";
import { matchDayStyles as styles } from "@/features/match-day/components/match-day-styles";
import { MatchOverviewList } from "@/features/match-day/components/match-overview-list";
import { MatchOverviewCard } from "@/features/match-day/components/match-overview-card";
import { MatchDetailsStep } from "@/features/match-day/components/match-details-step";
import { MatchAvailabilityStep } from "@/features/match-day/components/match-availability-step";
import {
  MatchResultPlayerStep,
  MatchResultReviewStep,
  MatchResultScoreStep,
} from "@/features/match-day/components/match-result-steps";
import { ShareMatchPreviewModal } from "@/features/match-day/components/match-share-flow";
import { GuestPlayerModal } from "@/features/match-day/components/guest-player-modal";
import { FormationSelector } from "@/features/match-day/components/formation-selector";
import {
  FloatingPlayerActions,
  FootballPitch,
  LineupJersey,
  MatchdayPlayerStatsModal,
  PlayerPickerSheet,
  ReviewPitch,
  SubstituteBench,
} from "@/features/match-day/components/lineup-components";
import {
  defaultLineupKitSettings,
  defaultMatchDurationMinutes,
  defaultTeamName,
  formationSlots,
  matchFormations,
  substituteSlots,
} from "@/features/match-day/match-day-config";
import {
  formatPlayerDisplayName,
  formatPlayerName,
  getAssignedPlayer,
  getAssignmentSlot,
  moveAssignment,
  removePlayerFromAssignments,
} from "@/features/match-day/lineup-utils";
import {
  capPlayerScoringToTeamScore,
  initializeMatchResultPlayerStats,
} from "@/features/match-day/match-result-utils";
import type {
  DropTarget,
  JerseyResultBadges,
  LineupAssignments,
  LineupKitSettings,
  MatchCategory,
  MatchFormation,
  MatchResultFormState,
  MatchResultSquadEntry,
  MatchSetupFormState,
  SharePreviewState,
} from "@/features/match-day/match-day-view-types";
import type {
  MatchDayMatch,
  MatchPlayerResultStat,
  MatchPlayerResultStats,
} from "@/features/match-day/match-day-types";
import { listPlayerAttendanceStatsAsync } from "@/features/player-stats/player-stats-repository";
import type { PlayerAttendanceStats } from "@/features/player-stats/player-stats-types";
import { isPlayerInjuredOnDate } from "@/features/players/player-injury-utils";
import { listAllPlayerInjuriesAsync, listPlayersAsync } from "@/features/players/player-repository";
import { type Player, type PlayerInjury } from "@/features/players/player-types";
import { getTeamSettingsAsync } from "@/features/settings/team-settings-repository";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";
import {
  cancelMatchResultReminderAsync,
  scheduleMatchResultReminderAsync,
} from "@/features/notifications/match-result-notifications";

function createEmptyMatchSetupFormState(venue = ""): MatchSetupFormState {
  return {
    opponent: "",
    date: formatDateForDisplay(new Date()),
    startTime: "",
    location: "home",
    venue,
    category: "league",
    formation: "4-3-3",
    notes: "",
    captainPlayerId: null,
    matchDutyPlayerIds: [],
    guestPlayerIds: [],
    playerStatuses: {},
    lineupAssignments: {},
  };
}

function createMatchSetupFormStateFromMatch(
  match: MatchDayMatch,
): MatchSetupFormState {
  return {
    opponent: match.opponent,
    date: formatIsoDateForDisplay(match.matchDate),
    startTime: match.startTime,
    location: match.location,
    venue: match.venue,
    category: match.category,
    formation: normalizeMatchFormation(match.formation),
    notes: match.notes,
    captainPlayerId: match.captainPlayerId,
    matchDutyPlayerIds: match.matchDutyPlayerIds,
    guestPlayerIds: match.guestPlayerIds,
    playerStatuses: match.playerStatuses,
    lineupAssignments: match.lineupAssignments,
  };
}

function createSavedMatchSharePreview(
  match: MatchDayMatch,
  players: Player[],
): SharePreviewState {
  const matchPlayers = applyGuestKitNumbers(players, match.guestPlayerIds);
  const squadEntries = getMatchResultSquadEntries(match, matchPlayers);
  const playerRoleById = new Map(
    squadEntries.map((entry) => [entry.player.id, entry.role]),
  );

  return {
    form: createMatchSetupFormStateFromMatch(match),
    opponentScore: match.opponentScore ?? undefined,
    ownScore: match.ownScore ?? undefined,
    playerResultStats: hasMatchResult(match)
      ? match.playerResultStats
      : undefined,
    playerRoleById,
    players: matchPlayers,
  };
}

export default function MatchDayScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { shareMatchId } = useLocalSearchParams<{ shareMatchId?: string }>();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [isMatchSetupOpen, setIsMatchSetupOpen] = useState(false);
  const [matches, setMatches] = useState<MatchDayMatch[]>([]);
  const [overviewPlayers, setOverviewPlayers] = useState<Player[]>([]);
  const [kitSettings, setKitSettings] = useState<LineupKitSettings>(
    defaultLineupKitSettings,
  );
  const [teamName, setTeamName] = useState(defaultTeamName);
  const [clubLocation, setClubLocation] = useState("");
  const [preferNicknames, setPreferNicknames] = useState(false);
  const [matchDutyEnabled, setMatchDutyEnabled] = useState(true);
  const [matchDurationMinutes, setMatchDurationMinutes] = useState(
    defaultMatchDurationMinutes,
  );
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [resultMatchId, setResultMatchId] = useState<number | null>(null);
  const [sharePreview, setSharePreview] = useState<SharePreviewState | null>(
    null,
  );
  const [matchSetupForm, setMatchSetupForm] = useState<MatchSetupFormState>(
    createEmptyMatchSetupFormState,
  );
  const [matchResultForm, setMatchResultForm] = useState<MatchResultFormState>({
    ownScore: 0,
    opponentScore: 0,
    resultNotes: "",
    playerResultStats: {},
    fulfilledMatchDutyPlayerIds: [],
  });
  const editingMatchHasResult =
    editingMatchId !== null &&
    matches.some(
      (match) => match.id === editingMatchId && hasMatchResult(match),
    );
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

  const loadMatches = useCallback(async () => {
    try {
      const [nextMatches, nextPlayers, nextGuests, nextSettings] =
        await Promise.all([
          listMatchDayMatchesAsync(),
          listPlayersAsync(),
          listGuestPlayersAsync(),
          getTeamSettingsAsync(),
        ]);
      setMatches(nextMatches);
      setOverviewPlayers([...nextPlayers, ...nextGuests]);
      setKitSettings(nextSettings ?? defaultLineupKitSettings);
      setTeamName(nextSettings?.teamName.trim() || defaultTeamName);
      setClubLocation(nextSettings?.clubLocation ?? "");
      setPreferNicknames(nextSettings?.preferNicknames ?? false);
      setMatchDutyEnabled(nextSettings?.matchDutyEnabled ?? true);
      setMatchDurationMinutes(
        nextSettings?.matchDurationMinutes ?? defaultMatchDurationMinutes,
      );
    } catch (error) {
      console.warn("Failed to load match day matches", error);
      Alert.alert("Could not load matches", "Please try again.");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      listMatchDayMatchesAsync(),
      listPlayersAsync(),
      listGuestPlayersAsync(),
      getTeamSettingsAsync(),
    ])
      .then(([nextMatches, nextPlayers, nextGuests, nextSettings]) => {
        if (isMounted) {
          setMatches(nextMatches);
          setOverviewPlayers([...nextPlayers, ...nextGuests]);
          setKitSettings(nextSettings ?? defaultLineupKitSettings);
          setTeamName(nextSettings?.teamName.trim() || defaultTeamName);
          setClubLocation(nextSettings?.clubLocation ?? "");
          setPreferNicknames(nextSettings?.preferNicknames ?? false);
          setMatchDutyEnabled(nextSettings?.matchDutyEnabled ?? true);
          setMatchDurationMinutes(
            nextSettings?.matchDurationMinutes ?? defaultMatchDurationMinutes,
          );
          const requestedShareMatch = shareMatchId
            ? nextMatches.find((match) => match.id === Number(shareMatchId))
            : undefined;
          if (requestedShareMatch) {
            setSharePreview(
              createSavedMatchSharePreview(requestedShareMatch, [
                ...nextPlayers,
                ...nextGuests,
              ]),
            );
          }
        }
      })
      .catch((error: unknown) => {
        console.warn("Failed to load match day matches", error);
        Alert.alert("Could not load matches", "Please try again.");
      });

    return () => {
      isMounted = false;
    };
  }, [shareMatchId]);

  useFocusEffect(
    useCallback(() => {
      let isFocused = true;

      getTeamSettingsAsync()
        .then((nextSettings) => {
          if (isFocused) {
            setKitSettings(nextSettings ?? defaultLineupKitSettings);
            setTeamName(nextSettings?.teamName.trim() || defaultTeamName);
            setClubLocation(nextSettings?.clubLocation ?? "");
            setPreferNicknames(nextSettings?.preferNicknames ?? false);
            setMatchDutyEnabled(nextSettings?.matchDutyEnabled ?? true);
            setMatchDurationMinutes(
              nextSettings?.matchDurationMinutes ?? defaultMatchDurationMinutes,
            );
          }
        })
        .catch((error: unknown) => {
          console.warn("Failed to load team settings", error);
        });

      return () => {
        isFocused = false;
      };
    }, []),
  );

  function openAddMatchWizard() {
    setEditingMatchId(null);
    setMatchSetupForm(createEmptyMatchSetupFormState(clubLocation));
    setIsMatchSetupOpen(true);
  }

  function openEditMatchWizard(match: MatchDayMatch) {
    setEditingMatchId(match.id);
    setMatchSetupForm(createMatchSetupFormStateFromMatch(match));
    setIsMatchSetupOpen(true);
  }

  function closeMatchSetupWizard() {
    setEditingMatchId(null);
    setIsMatchSetupOpen(false);
  }

  function openResultWizard(match: MatchDayMatch) {
    const squadEntries = getMatchResultSquadEntries(
      match,
      applyGuestKitNumbers(overviewPlayers, match.guestPlayerIds),
    );

    setResultMatchId(match.id);
    setMatchResultForm({
      ownScore: match.ownScore ?? 0,
      opponentScore: match.opponentScore ?? 0,
      resultNotes: match.resultNotes,
      fulfilledMatchDutyPlayerIds: match.fulfilledMatchDutyPlayerIds.filter(
        (playerId) => match.matchDutyPlayerIds.includes(playerId),
      ),
      playerResultStats: initializeMatchResultPlayerStats(
        match.playerResultStats,
        squadEntries,
        matchDurationMinutes,
      ),
    });
  }

  function closeResultWizard() {
    setResultMatchId(null);
  }

  function openSetupSharePreview(form: MatchSetupFormState, players: Player[]) {
    setSharePreview({
      form,
      players,
    });
  }

  function openResultSharePreview(
    match: MatchDayMatch,
    form: MatchResultFormState,
    squadEntries: MatchResultSquadEntry[],
  ) {
    const matchForm = createMatchSetupFormStateFromMatch(match);
    const playerRoleById = new Map(
      squadEntries.map((entry) => [entry.player.id, entry.role]),
    );

    setSharePreview({
      form: matchForm,
      opponentScore: form.opponentScore,
      ownScore: form.ownScore,
      playerResultStats: form.playerResultStats,
      playerRoleById,
      players: squadEntries.map((entry) => entry.player),
    });
  }

  function openSavedMatchSharePreview(match: MatchDayMatch) {
    setSharePreview(createSavedMatchSharePreview(match, overviewPlayers));
  }

  function closeSharePreview() {
    setSharePreview(null);
    if (shareMatchId) {
      router.setParams({ shareMatchId: "" });
    }
  }

  async function handleSaveResult() {
    if (!resultMatchId) {
      return false;
    }

    const resultMatch =
      matches.find((match) => match.id === resultMatchId) ?? null;
    const squadEntries = getMatchResultSquadEntries(
      resultMatch,
      applyGuestKitNumbers(overviewPlayers, resultMatch?.guestPlayerIds ?? []),
    );

    try {
      await updateMatchDayMatchResultAsync({
        id: resultMatchId,
        matchDurationMinutes,
        ...matchResultForm,
        playerResultStats: capPlayerScoringToTeamScore(
          matchResultForm.playerResultStats,
          squadEntries,
          matchResultForm.ownScore,
          matchDurationMinutes,
        ),
      });
      await cancelMatchResultReminderAsync(resultMatchId);
      setExpandedMatchId(resultMatchId);
      setResultMatchId(null);
      await loadMatches();
      return true;
    } catch (error) {
      console.warn("Failed to save match result", error);
      Alert.alert(
        t("matchday.errors.save_result"),
        t("common.errors.generic_message"),
      );
      return false;
    }
  }

  async function handleSaveMatch() {
    if (
      !validateMatchSetupForm(matchSetupForm, t, editingMatchHasResult) ||
      !validateMatchCaptain(matchSetupForm, t)
    ) {
      return;
    }

    try {
      const matchInput = {
        opponent: matchSetupForm.opponent,
        matchDate: parseDisplayDateToIsoDate(matchSetupForm.date),
        startTime: matchSetupForm.startTime,
        location: matchSetupForm.location,
        venue:
          matchSetupForm.location === "home"
            ? matchSetupForm.venue.trim() || clubLocation
            : "",
        category: matchSetupForm.category,
        formation: matchSetupForm.formation,
        notes: matchSetupForm.notes,
        captainPlayerId: matchSetupForm.captainPlayerId,
        matchDutyPlayerIds: matchDutyEnabled ? matchSetupForm.matchDutyPlayerIds : [],
        guestPlayerIds: matchSetupForm.guestPlayerIds,
        playerStatuses: matchSetupForm.playerStatuses,
        lineupAssignments: matchSetupForm.lineupAssignments,
      };

      let savedMatchId: number;
      if (editingMatchId) {
        await updateMatchDayMatchAsync({
          ...matchInput,
          id: editingMatchId,
        });
        savedMatchId = editingMatchId;
        setExpandedMatchId(editingMatchId);
      } else {
        savedMatchId = await createMatchDayMatchAsync(matchInput);
      }

      const existingSavedMatch = editingMatchId
        ? matches.find((match) => match.id === editingMatchId)
        : undefined;
      const savedMatchAlreadyHasResult = existingSavedMatch
        ? hasMatchResult(existingSavedMatch)
        : false;
      if (savedMatchAlreadyHasResult) {
        await cancelMatchResultReminderAsync(savedMatchId);
      } else {
        await scheduleMatchResultReminderAsync(
          savedMatchId,
          matchInput.matchDate,
          matchInput.startTime,
          locale,
        );
      }

      await loadMatches();
      setMatchSetupForm(createEmptyMatchSetupFormState(clubLocation));
      setEditingMatchId(null);
      setIsMatchSetupOpen(false);
    } catch (error) {
      console.warn("Failed to save match", error);
      Alert.alert(
        t("matchday.errors.save_match.title"),
        t("matchday.errors.save_match.message"),
      );
    }
  }

  function confirmDeleteMatch(match: MatchDayMatch) {
    Alert.alert(
      t("matchday.confirm.delete_title"),
      t("matchday.confirm.delete_message", { opponent: match.opponent }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            void handleDeleteMatch(match);
          },
        },
      ],
    );
  }

  async function handleDeleteMatch(match: MatchDayMatch) {
    try {
      await deleteMatchDayMatchAsync(match.id);
      await cancelMatchResultReminderAsync(match.id);
      setExpandedMatchId((currentMatchId) =>
        currentMatchId === match.id ? null : currentMatchId,
      );
      await loadMatches();
    } catch (error) {
      console.warn("Failed to delete match", error);
      Alert.alert("Could not delete match", "Please try again.");
    }
  }

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
                {t("matchday.overview.title")}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.description}>
                {t("matchday.overview.subtitle")}
              </ThemedText>
            </ThemedView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("matchday.overview.add_match")}
              onPress={openAddMatchWizard}
              style={({ pressed }) => [
                styles.addMatchButton,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{ ios: "plus", android: "add", web: "add" }}
                tintColor="#ffffff"
                size={18}
              />
              <ThemedText type="smallBold" style={styles.addMatchButtonText}>
                {t("matchday.overview.add_match")}
              </ThemedText>
            </Pressable>
          </ThemedView>

          <MatchDayMatchList
            expandedMatchId={expandedMatchId}
            kitSettings={kitSettings}
            matchDurationMinutes={matchDurationMinutes}
            matches={matches}
            players={overviewPlayers}
            preferNicknames={preferNicknames}
            teamName={teamName}
            onDeleteMatch={confirmDeleteMatch}
            onEditMatch={openEditMatchWizard}
            onEditResult={openResultWizard}
            onShareMatch={openSavedMatchSharePreview}
            onToggleMatch={(matchId) =>
              setExpandedMatchId((currentMatchId) =>
                currentMatchId === matchId ? null : matchId,
              )
            }
          />
        </ThemedView>
      </ScrollView>

      <MatchSetupModal
        clubLocation={clubLocation}
        form={matchSetupForm}
        kitSettings={kitSettings}
        matchDutyEnabled={matchDutyEnabled}
        hasExistingResult={editingMatchHasResult}
        mode={editingMatchId ? "edit" : "create"}
        preferNicknames={preferNicknames}
        visible={isMatchSetupOpen && sharePreview === null}
        onChangeForm={setMatchSetupForm}
        onClose={closeMatchSetupWizard}
        onContinue={handleSaveMatch}
        onShare={openSetupSharePreview}
      />
      <MatchResultModal
        form={matchResultForm}
        kitSettings={kitSettings}
        matchDurationMinutes={matchDurationMinutes}
        match={matches.find((match) => match.id === resultMatchId) ?? null}
        preferNicknames={preferNicknames}
        squadEntries={
          resultMatchId
            ? getMatchResultSquadEntries(
                matches.find((match) => match.id === resultMatchId) ?? null,
                applyGuestKitNumbers(
                  overviewPlayers,
                  matches.find((match) => match.id === resultMatchId)
                    ?.guestPlayerIds ?? [],
                ),
              )
            : []
        }
        visible={resultMatchId !== null && sharePreview === null}
        teamName={teamName}
        onChangeForm={setMatchResultForm}
        onClose={closeResultWizard}
        onSave={handleSaveResult}
        onShare={openResultSharePreview}
      />
      <ShareMatchPreviewModal
        kitSettings={kitSettings}
        matchDurationMinutes={matchDurationMinutes}
        preferNicknames={preferNicknames}
        preview={sharePreview}
        teamName={teamName}
        visible={sharePreview !== null}
        onClose={closeSharePreview}
      />
    </>
  );
}

export function MatchResultModal({
  form,
  kitSettings,
  matchDurationMinutes,
  match,
  onChangeForm,
  onClose,
  onSave,
  onShare,
  preferNicknames,
  squadEntries,
  teamName,
  visible,
}: {
  form: MatchResultFormState;
  kitSettings: LineupKitSettings;
  matchDurationMinutes: number;
  match: MatchDayMatch | null;
  onChangeForm: Dispatch<SetStateAction<MatchResultFormState>>;
  onClose: () => void;
  onSave: () => Promise<boolean>;
  onShare: (
    match: MatchDayMatch,
    form: MatchResultFormState,
    squadEntries: MatchResultSquadEntry[],
  ) => void;
  preferNicknames: boolean;
  squadEntries: MatchResultSquadEntry[];
  teamName: string;
  visible: boolean;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const [wizardStep, setWizardStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const resultStepKeys = [
    "matchday.result.steps.result",
    "matchday.result.steps.performance",
    "matchday.result.steps.review",
  ] as const;

  function handleClose() {
    setWizardStep(0);
    onClose();
  }

  function handleContinue() {
    if (wizardStep !== 1) {
      setWizardStep((currentStep) => currentStep + 1);
      return;
    }

    const assignedPlayerGoals = squadEntries.reduce(
      (totalGoals, { player }) =>
        totalGoals + (form.playerResultStats[player.id]?.goals ?? 0),
      0,
    );

    if (assignedPlayerGoals < form.ownScore) {
      Alert.alert(
        t("matchday.result.validation.goals_mismatch.title"),
        t("matchday.result.validation.goals_mismatch.message"),
        [
          { text: t("common.no"), style: "cancel" },
          {
            text: t("common.yes"),
            onPress: () => setWizardStep(2),
          },
        ],
      );
      return;
    }

    setWizardStep(2);
  }

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (await onSave()) {
        setWizardStep(0);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveAndShare() {
    if (isSaving || !match) return;
    setIsSaving(true);
    try {
      if (await onSave()) {
        setWizardStep(0);
        onShare(match, form, squadEntries);
      }
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
        <ThemedView type="modalBackground" style={styles.modalSheet}>
          <ThemedView style={styles.modalHeader}>
            <ThemedView style={styles.modalTitleGroup}>
              <ThemedText type="default">
                {t("matchday.result.title")}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t("common.step")} {wizardStep + 1} {t("common.of")} 3:{" "}
                {t(resultStepKeys[wizardStep])}
              </ThemedText>
            </ThemedView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
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

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formContent}
          >
            {wizardStep === 0 ? (
              <MatchResultScoreStep
                form={form}
                opponent={
                  match?.opponent ?? t("matchday.result.score.unknown_opponent")
                }
                teamName={teamName}
                onChangeForm={onChangeForm}
              />
            ) : wizardStep === 1 ? (
              <MatchResultPlayerStep
                form={form}
                kitSettings={kitSettings}
                matchDurationMinutes={matchDurationMinutes}
                matchDutyPlayerIds={match?.matchDutyPlayerIds ?? []}
                match={match}
                preferNicknames={preferNicknames}
                squadEntries={squadEntries}
                onChangeForm={onChangeForm}
              />
            ) : (
              <MatchResultReviewStep
                form={form}
                kitSettings={kitSettings}
                matchDurationMinutes={matchDurationMinutes}
                match={match}
                preferNicknames={preferNicknames}
                squadEntries={squadEntries}
                teamName={teamName}
              />
            )}
          </ScrollView>

          {wizardStep === 2 ? (
            <ThemedView style={styles.reviewActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setWizardStep(1)}
                style={({ pressed }) => [
                  styles.reviewActionButton,
                  styles.reviewBackButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={styles.reviewBackButtonText}
                >
                  {t("common.back")}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSaving || !match}
                onPress={handleSaveAndShare}
                style={({ pressed }) => [
                  styles.reviewActionButton,
                  styles.reviewShareButton,
                  pressed && styles.pressed,
                  (isSaving || !match) && styles.disabledButton,
                ]}
              >
                <ThemedText type="smallBold" style={styles.reviewActionText}>
                  {isSaving
                    ? t("matchday.result.actions.saving")
                    : t("matchday.result.actions.save_and_share")}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.reviewActionButton,
                  styles.reviewSaveButton,
                  pressed && styles.pressed,
                  isSaving && styles.disabledButton,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={[styles.reviewActionText, styles.reviewSaveButtonText]}
                >
                  {isSaving
                    ? t("matchday.result.actions.saving")
                    : t("common.save")}
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : (
            <ThemedView style={styles.formActions}>
              <Pressable
                accessibilityRole="button"
                onPress={
                  wizardStep === 0
                    ? handleClose
                    : () => setWizardStep((currentStep) => currentStep - 1)
                }
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold">
                  {wizardStep === 0 ? t("common.cancel") : t("common.back")}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleContinue}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {t("common.next")}
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MatchSetupModal({
  clubLocation,
  form,
  hasExistingResult,
  kitSettings,
  matchDutyEnabled,
  mode,
  onChangeForm,
  onClose,
  onContinue,
  onShare,
  preferNicknames,
  visible,
}: {
  clubLocation: string;
  form: MatchSetupFormState;
  hasExistingResult: boolean;
  kitSettings: LineupKitSettings;
  matchDutyEnabled: boolean;
  mode: "create" | "edit";
  onChangeForm: Dispatch<SetStateAction<MatchSetupFormState>>;
  onClose: () => void;
  onContinue: () => Promise<void> | void;
  onShare: (form: MatchSetupFormState, players: Player[]) => void;
  preferNicknames: boolean;
  visible: boolean;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerInjuries, setPlayerInjuries] = useState<PlayerInjury[]>([]);
  const [guestPlayers, setGuestPlayers] = useState<Player[]>([]);
  const [isGuestPlayerModalOpen, setIsGuestPlayerModalOpen] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerAttendanceStats[]>([]);
  const [wizardStep, setWizardStep] = useState(0);
  const [isDraggingPlayer, setIsDraggingPlayer] = useState(false);
  const [isMatchDataLoaded, setIsMatchDataLoaded] = useState(false);
  const hasInitializedCreateAvailability = useRef(false);
  const matchGuestPlayers = form.guestPlayerIds.flatMap(
    (guestPlayerId, index) => {
      const player = guestPlayers.find(
        (guestPlayer) => guestPlayer.id === guestPlayerId,
      );
      return player ? [{ ...player, kitNumber: 70 + index }] : [];
    },
  );
  const matchPlayers = [...players, ...matchGuestPlayers];
  const availablePlayers = matchPlayers.filter(
    (player) => form.playerStatuses[player.id] === "available",
  );
  const injuriesByPlayerId = useMemo(() => {
    const grouped = new Map<number, PlayerInjury[]>();
    for (const injury of playerInjuries) {
      const injuries = grouped.get(injury.playerId) ?? [];
      injuries.push(injury);
      grouped.set(injury.playerId, injuries);
    }
    return grouped;
  }, [playerInjuries]);

  useEffect(() => {
    if (!visible) {
      hasInitializedCreateAvailability.current = false;
      return;
    }

    let isMounted = true;

    async function loadMatchData() {
      try {
        const [loadedPlayers, loadedGuests, loadedPlayerStats, loadedInjuries] =
          await Promise.all([
            listPlayersAsync(),
            listGuestPlayersAsync(),
            listPlayerAttendanceStatsAsync(),
            listAllPlayerInjuriesAsync(),
          ]);

        if (isMounted) {
          setPlayers(loadedPlayers);
          setGuestPlayers(loadedGuests);
          setPlayerStats(loadedPlayerStats);
          setPlayerInjuries(loadedInjuries);
          setIsMatchDataLoaded(true);
          onChangeForm((currentForm) => ({
            ...currentForm,
            playerStatuses: initializeMatchPlayerStatuses(
              currentForm.playerStatuses,
              [
                ...loadedPlayers,
                ...loadedGuests.filter((player) =>
                  currentForm.guestPlayerIds.includes(player.id),
                ),
              ],
            ),
          }));
        }
      } catch (error) {
        console.warn("Failed to load match setup data", error);
      }
    }

    loadMatchData();

    return () => {
      isMounted = false;
    };
  }, [onChangeForm, visible]);

  useEffect(() => {
    if (
      !visible ||
      !isMatchDataLoaded ||
      mode !== "create" ||
      wizardStep !== 1 ||
      hasInitializedCreateAvailability.current
    ) {
      return;
    }

    hasInitializedCreateAvailability.current = true;
    onChangeForm((currentForm) => ({
      ...currentForm,
      playerStatuses: initializeMatchPlayerStatusesForCreate(
        currentForm.playerStatuses,
        [
          ...players,
          ...guestPlayers.filter((player) =>
            currentForm.guestPlayerIds.includes(player.id),
          ),
        ],
        currentForm.date,
        injuriesByPlayerId,
      ),
    }));
  }, [guestPlayers, injuriesByPlayerId, isMatchDataLoaded, mode, onChangeForm, players, visible, wizardStep]);

  function handleClose() {
    setIsMatchDataLoaded(false);
    setWizardStep(0);
    setIsDraggingPlayer(false);
    setIsGuestPlayerModalOpen(false);
    onClose();
  }

  function addGuestToMatch(player: Player) {
    if (
      !form.guestPlayerIds.includes(player.id) &&
      form.guestPlayerIds.length >= 10
    ) {
      Alert.alert(
        t("matchday.add_match.guest_players.limit.title"),
        t("matchday.add_match.guest_players.limit.message"),
      );
      return;
    }
    setGuestPlayers((currentPlayers) => [
      player,
      ...currentPlayers.filter(
        (currentPlayer) => currentPlayer.id !== player.id,
      ),
    ]);
    onChangeForm((currentForm) => ({
      ...currentForm,
      guestPlayerIds: currentForm.guestPlayerIds.includes(player.id)
        ? currentForm.guestPlayerIds
        : [...currentForm.guestPlayerIds, player.id],
      playerStatuses: {
        ...currentForm.playerStatuses,
        [player.id]: "available",
      },
    }));
  }

  async function handleNext() {
    if (wizardStep === 0) {
      if (!validateMatchSetupForm(form, t, hasExistingResult)) {
        return;
      }

      setWizardStep(1);
      return;
    }

    if (wizardStep === 1) {
      if (!validateMatchCaptain(form, t)) {
        return;
      }

      if (availablePlayers.length === 0) {
        Alert.alert(
          t("matchday.add_match.validation.availability.title"),
          t("matchday.add_match.validation.availability.message"),
        );
        return;
      }

      if (availablePlayers.length < 11) {
        Alert.alert(
          t("matchday.add_match.validation.low_availability.title"),
          t("matchday.add_match.validation.low_availability.message"),
          [
            {
              text: t("matchday.add_match.actions.go_back"),
              style: "cancel",
            },
            {
              text: t("matchday.add_match.actions.continue_anyway"),
              onPress: () => setWizardStep(2),
            },
          ],
        );
        return;
      }

      setWizardStep(2);
      return;
    }

    if (wizardStep === 2) {
      if (getSelectedPitchPlayerCount(form, availablePlayers) < 11) {
        Alert.alert(
          t("matchday.add_match.validation.lineup.title"),
          t("matchday.add_match.validation.lineup.message"),
        );
        return;
      }

      setWizardStep(3);
      return;
    }

    setWizardStep(0);
    await onContinue();
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
        <ThemedView type="modalBackground" style={styles.modalSheet}>
          <ThemedView style={styles.modalHeader}>
            <ThemedView style={styles.modalTitleGroup}>
              <ThemedText type="default">
                {mode === "edit"
                  ? t("matchday.add_match.edit_title")
                  : t("matchday.add_match.title")}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t("matchday.add_match.progress", {
                  step: wizardStep + 1,
                  total: 4,
                  label: getMatchSetupStepLabel(wizardStep, t),
                })}
              </ThemedText>
            </ThemedView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("matchday.add_match.close")}
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

          <ScrollView
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!isDraggingPlayer}
            contentContainerStyle={styles.formContent}
          >
            {wizardStep === 0 ? (
              <MatchDetailsStep
                clubLocation={clubLocation}
                form={form}
                maximumDate={hasExistingResult ? getEndOfToday() : undefined}
                onChangeForm={onChangeForm}
              />
            ) : wizardStep === 1 ? (
              <MatchAvailabilityStep
                form={form}
                injuriesByPlayerId={injuriesByPlayerId}
                matchDutyEnabled={matchDutyEnabled}
                players={matchPlayers}
                onChangeForm={onChangeForm}
                onOpenGuestPlayerModal={() => setIsGuestPlayerModalOpen(true)}
              />
            ) : wizardStep === 2 ? (
              <MatchFormationStep
                form={form}
                kitSettings={kitSettings}
                playerStats={playerStats}
                players={availablePlayers}
                preferNicknames={preferNicknames}
                onChangeForm={onChangeForm}
                onDragPlayerChange={setIsDraggingPlayer}
              />
            ) : (
              <MatchReviewStep
                form={form}
                kitSettings={kitSettings}
                matchDutyEnabled={matchDutyEnabled}
                preferNicknames={preferNicknames}
                players={availablePlayers}
              />
            )}
          </ScrollView>

          {wizardStep === 3 ? (
            <ThemedView style={styles.reviewActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setWizardStep(2)}
                style={({ pressed }) => [
                  styles.reviewActionButton,
                  styles.reviewBackButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={styles.reviewBackButtonText}
                >
                  {t("common.back")}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => onShare(form, availablePlayers)}
                style={({ pressed }) => [
                  styles.reviewActionButton,
                  styles.reviewShareButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.reviewActionText}>
                  {t("common.share")}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleNext}
                style={({ pressed }) => [
                  styles.reviewActionButton,
                  styles.reviewSaveButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={[styles.reviewActionText, styles.reviewSaveButtonText]}
                >
                  {mode === "edit"
                    ? t("matchday.add_match.actions.update")
                    : t("common.save")}
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : (
            <ThemedView style={styles.formActions}>
              <Pressable
                accessibilityRole="button"
                onPress={
                  wizardStep === 0
                    ? handleClose
                    : () => setWizardStep((currentStep) => currentStep - 1)
                }
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold">
                  {wizardStep === 0 ? t("common.cancel") : t("common.back")}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleNext}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {wizardStep === 2
                    ? t("matchday.add_match.actions.review")
                    : t("common.next")}
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}
        </ThemedView>
        <GuestPlayerModal
          guestPlayers={guestPlayers}
          matchGuestPlayerIds={form.guestPlayerIds}
          visible={isGuestPlayerModalOpen}
          onAddGuest={addGuestToMatch}
          onClose={() => setIsGuestPlayerModalOpen(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MatchDayMatchList({
  expandedMatchId,
  kitSettings,
  matchDurationMinutes,
  matches,
  onDeleteMatch,
  onEditMatch,
  onEditResult,
  onShareMatch,
  onToggleMatch,
  players,
  preferNicknames,
  teamName,
}: {
  expandedMatchId: number | null;
  kitSettings: LineupKitSettings;
  matchDurationMinutes: number;
  matches: MatchDayMatch[];
  onDeleteMatch: (match: MatchDayMatch) => void;
  onEditMatch: (match: MatchDayMatch) => void;
  onEditResult: (match: MatchDayMatch) => void;
  onShareMatch: (match: MatchDayMatch) => void;
  onToggleMatch: (matchId: number) => void;
  players: Player[];
  preferNicknames: boolean;
  teamName: string;
}) {
  function renderMatchCard(match: MatchDayMatch) {
    const isExpanded = expandedMatchId === match.id;
    const matchForm = createMatchSetupFormStateFromMatch(match);
    const matchPlayers = applyGuestKitNumbers(players, match.guestPlayerIds);
    const resultSquadEntries = getMatchResultSquadEntries(match, matchPlayers);
    const playerRoleById = new Map(resultSquadEntries.map((entry) => [entry.player.id, entry.role]));

    return (
      <MatchOverviewCard
        key={match.id}
        isExpanded={isExpanded}
        match={match}
        onDelete={() => onDeleteMatch(match)}
        onEdit={() => onEditMatch(match)}
        onEditResult={() => onEditResult(match)}
        onShare={() => onShareMatch(match)}
        onToggle={() => onToggleMatch(match.id)}
        teamName={teamName}
      >
        <MatchReviewStep
          form={matchForm}
          kitSettings={kitSettings}
          matchDurationMinutes={matchDurationMinutes}
          playerResultStats={hasMatchResult(match) ? match.playerResultStats : undefined}
          playerRoleById={playerRoleById}
          players={matchPlayers}
          preferNicknames={preferNicknames}
        />
      </MatchOverviewCard>
    );
  }


  return <MatchOverviewList matches={matches} renderMatchCard={renderMatchCard} />;
}

function MatchFormationStep({
  form,
  kitSettings,
  onDragPlayerChange,
  onChangeForm,
  playerStats,
  players,
  preferNicknames,
}: {
  form: MatchSetupFormState;
  kitSettings: LineupKitSettings;
  onDragPlayerChange: (isDragging: boolean) => void;
  onChangeForm: Dispatch<SetStateAction<MatchSetupFormState>>;
  playerStats: PlayerAttendanceStats[];
  players: Player[];
  preferNicknames: boolean;
}) {
  const selectedFormation = normalizeMatchFormation(form.formation);
  const lineupAssignments = form.lineupAssignments;
  const [dropTargets, setDropTargets] = useState<Record<string, DropTarget>>(
    {},
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedActionSlotId, setSelectedActionSlotId] = useState<
    string | null
  >(null);
  const [selectedStatsPlayer, setSelectedStatsPlayer] = useState<Player | null>(
    null,
  );
  const playerStatsById = useMemo(
    () => new Map(playerStats.map((stats) => [stats.playerId, stats])),
    [playerStats],
  );
  const selectedSlot = selectedSlotId
    ? getAssignmentSlot(selectedFormation, selectedSlotId)
    : null;
  const selectedActionSlot = selectedActionSlotId
    ? getAssignmentSlot(selectedFormation, selectedActionSlotId)
    : null;
  const selectedActionPlayer = selectedActionSlot
    ? getAssignedPlayer(lineupAssignments[selectedActionSlot.id], players)
    : null;
  const selectedActionTarget = selectedActionSlotId
    ? dropTargets[selectedActionSlotId]
    : undefined;

  const updateLineupAssignments = useCallback(
    (
      update:
        | LineupAssignments
        | ((currentAssignments: LineupAssignments) => LineupAssignments),
    ) => {
      onChangeForm((currentForm) => ({
        ...currentForm,
        lineupAssignments:
          typeof update === "function"
            ? update(currentForm.lineupAssignments)
            : update,
      }));
    },
    [onChangeForm],
  );

  const handleMovePlayer = useCallback(
    (fromSlotId: string, toSlotId: string) => {
      updateLineupAssignments((currentAssignments) =>
        moveAssignment(currentAssignments, fromSlotId, toSlotId),
      );
    },
    [updateLineupAssignments],
  );

  const registerDropTargets = useCallback(
    (targets: DropTarget[]) => {
      setDropTargets((currentTargets) => {
        const nextTargets = { ...currentTargets };

        for (const target of targets) {
          nextTargets[target.id] = target;
        }

        return nextTargets;
      });
    },
    [setDropTargets],
  );

  const registerDropTarget = useCallback(
    (target: DropTarget) => {
      setDropTargets((currentTargets) => ({
        ...currentTargets,
        [target.id]: target,
      }));
    },
    [setDropTargets],
  );

  function handleSelectAssignedSlot(slotId: string) {
    setSelectedActionSlotId((currentSlotId) =>
      currentSlotId === slotId ? null : slotId,
    );
  }

  function handleSelectEmptySlot(slotId: string) {
    setSelectedActionSlotId(null);
    setSelectedSlotId(slotId);
  }

  return (
    <ThemedView style={styles.formationStep}>
      <FormationSelector
        value={selectedFormation}
        onChange={(formation) => onChangeForm({ ...form, formation })}
      />

      <ThemedView style={styles.lineupDropSurface}>
        <FootballPitch
          assignments={lineupAssignments}
          captainPlayerId={form.captainPlayerId}
          dropTargets={dropTargets}
          formation={selectedFormation}
          kitSettings={kitSettings}
          players={players}
          preferNicknames={preferNicknames}
          onDragPlayerChange={onDragPlayerChange}
          onMovePlayer={handleMovePlayer}
          onRegisterDropTargets={registerDropTargets}
          onSelectAssignedSlot={handleSelectAssignedSlot}
          onSelectSlot={handleSelectEmptySlot}
        />

        <SubstituteBench
          assignments={lineupAssignments}
          captainPlayerId={form.captainPlayerId}
          dropTargets={dropTargets}
          kitSettings={kitSettings}
          players={players}
          preferNicknames={preferNicknames}
          onDragPlayerChange={onDragPlayerChange}
          onMovePlayer={handleMovePlayer}
          onRegisterDropTarget={registerDropTarget}
          onSelectAssignedSlot={handleSelectAssignedSlot}
          onSelectSlot={handleSelectEmptySlot}
        />

        {selectedActionPlayer && selectedActionSlot && selectedActionTarget ? (
          <FloatingPlayerActions
            player={selectedActionPlayer}
            preferNicknames={preferNicknames}
            target={selectedActionTarget}
            onRemove={() => {
              updateLineupAssignments((currentAssignments) => {
                const nextAssignments = { ...currentAssignments };
                delete nextAssignments[selectedActionSlot.id];
                return nextAssignments;
              });
              setSelectedActionSlotId(null);
            }}
            onShowStats={() => {
              setSelectedStatsPlayer(selectedActionPlayer);
              setSelectedActionSlotId(null);
            }}
            onSwap={() => {
              setSelectedSlotId(selectedActionSlot.id);
              setSelectedActionSlotId(null);
            }}
          />
        ) : null}
      </ThemedView>

      <PlayerPickerSheet
        assignedPlayerIds={lineupAssignments}
        kitSettings={kitSettings}
        players={players}
        preferNicknames={preferNicknames}
        selectedSlot={selectedSlot}
        visible={selectedSlot !== null}
        onClose={() => setSelectedSlotId(null)}
        onRemove={() => {
          if (!selectedSlot) {
            return;
          }

          updateLineupAssignments((currentAssignments) => {
            const nextAssignments = { ...currentAssignments };
            delete nextAssignments[selectedSlot.id];
            return nextAssignments;
          });
          setSelectedSlotId(null);
        }}
        onSelectPlayer={(player) => {
          if (!selectedSlot) {
            return;
          }

          updateLineupAssignments((currentAssignments) => ({
            ...removePlayerFromAssignments(currentAssignments, player.id),
            [selectedSlot.id]: player.id,
          }));
          setSelectedSlotId(null);
        }}
      />

      <MatchdayPlayerStatsModal
        player={selectedStatsPlayer}
        stats={
          selectedStatsPlayer
            ? (playerStatsById.get(selectedStatsPlayer.id) ?? null)
            : null
        }
        visible={selectedStatsPlayer !== null}
        onClose={() => setSelectedStatsPlayer(null)}
      />
    </ThemedView>
  );
}

function MatchReviewStep({
  form,
  kitSettings,
  matchDutyEnabled = true,
  matchDurationMinutes = defaultMatchDurationMinutes,
  playerResultStats,
  playerRoleById,
  players,
  preferNicknames,
}: {
  form: MatchSetupFormState;
  kitSettings: LineupKitSettings;
  matchDutyEnabled?: boolean;
  matchDurationMinutes?: number;
  playerResultStats?: MatchPlayerResultStats;
  playerRoleById?: Map<number, MatchResultSquadEntry["role"]>;
  players: Player[];
  preferNicknames: boolean;
}) {
  const { t } = useI18n();
  const captain = getAssignedPlayer(form.captainPlayerId ?? undefined, players);
  const matchDutyPlayers = form.matchDutyPlayerIds.flatMap((playerId) => {
    const player = getAssignedPlayer(playerId, players);
    return player ? [player] : [];
  });
  const substitutes = getAssignedSubstitutes(form, players);

  return (
    <ThemedView style={styles.reviewStep}>
      <ThemedView style={styles.reviewHeader}>
        <ThemedView style={styles.reviewOpponentRow}>
          <ThemedText type="subtitle" style={styles.reviewOpponent}>
            {form.opponent.trim()}
          </ThemedText>
          <MatchCategoryIcon category={form.category} size={26} />
        </ThemedView>
        <ThemedText type="default">
          {t("matchday.add_match.review.date_time", {
            date: form.date,
            time: form.startTime,
          })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("matchday.add_match.review.location", {
            location: t(
              `matchday.add_match.match_details.location.${form.location}`,
            ),
          })}
        </ThemedText>
      </ThemedView>

      <ReviewPitch
        form={form}
        kitSettings={kitSettings}
        matchDurationMinutes={matchDurationMinutes}
        playerResultStats={playerResultStats}
        playerRoleById={playerRoleById}
        players={players}
        preferNicknames={preferNicknames}
      />

      <ThemedView style={styles.reviewLists}>
        <ThemedView style={styles.reviewListSection}>
          <ThemedText type="default">
            {t("matchday.add_match.roles.title")}
          </ThemedText>
          <ThemedView style={styles.reviewRoleGrid}>
            <ThemedView type="backgroundElement" style={styles.reviewRoleCard}>
              <ThemedText type="small" themeColor="textSecondary">
                {t("matchday.add_match.roles.captain")}
              </ThemedText>
              <ThemedText type="smallBold" numberOfLines={1}>
                {captain ? formatPlayerName(captain, preferNicknames) : "-"}
              </ThemedText>
            </ThemedView>
            {matchDutyEnabled ? (
              <ThemedView type="backgroundElement" style={styles.reviewRoleCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  {t("matchday.add_match.roles.match_duty")}
                </ThemedText>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {matchDutyPlayers.length > 0
                    ? matchDutyPlayers
                        .map((player) =>
                          formatPlayerName(player, preferNicknames),
                        )
                        .join(", ")
                    : "-"}
                </ThemedText>
              </ThemedView>
            ) : null}
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.reviewListSection}>
          <ThemedText type="default">
            {t("matchday.add_match.lineup.substitutes")}
          </ThemedText>
          {substitutes.length > 0 ? (
            playerResultStats ? (
              <ThemedView style={styles.resultSubstituteGrid}>
                {substitutes.map(({ player }) => (
                  <ThemedView
                    key={player.id}
                    type="backgroundElement"
                    style={styles.resultSubstituteRow}
                  >
                    <LineupJersey
                      compact
                      dense
                      isCaptain={player.id === form.captainPlayerId}
                      kitSettings={kitSettings}
                      player={player}
                      preferNicknames={preferNicknames}
                      resultBadges={getJerseyResultBadges(
                        playerResultStats[player.id],
                        playerRoleById?.get(player.id) ?? "substitute",
                        matchDurationMinutes,
                      )}
                      showName
                    />
                  </ThemedView>
                ))}
              </ThemedView>
            ) : (
              <ThemedView style={styles.reviewPlayerGrid}>
                {substitutes.map(({ player, slot }) => (
                  <ThemedView key={slot.id} style={styles.reviewPlayerRow}>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.reviewPlayerSlotLabel}
                    >
                      {t("matchday.add_match.lineup.substitute_prefix")}
                    </ThemedText>
                    <ThemedText
                      type="smallBold"
                      numberOfLines={2}
                      style={styles.reviewPlayerName}
                    >
                      {formatPlayerDisplayName(player)}
                    </ThemedText>
                  </ThemedView>
                ))}
              </ThemedView>
            )
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {t("matchday.add_match.lineup.no_substitutes")}
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

function MatchCategoryIcon({
  category,
  size,
}: {
  category: MatchCategory;
  size: number;
}) {
  if (category === "friendly") {
    return (
      <FontAwesome6
        name="handshake"
        solid
        color={ActionColors.primary}
        size={size}
      />
    );
  }

  return (
    <SymbolView
      name={getMatchCategoryIcon(category)}
      tintColor={ActionColors.primary}
      size={size}
    />
  );
}

function normalizeMatchFormation(value: unknown): MatchFormation {
  return matchFormations.includes(value as MatchFormation)
    ? (value as MatchFormation)
    : "4-3-3";
}

function getMatchSetupStepLabel(
  step: number,
  t: ReturnType<typeof useI18n>["t"],
) {
  switch (step) {
    case 0:
      return t("matchday.add_match.steps.match_details");
    case 1:
      return t("matchday.add_match.steps.player_availability");
    case 2:
      return t("matchday.add_match.steps.lineup");
    default:
      return t("matchday.add_match.steps.review");
  }
}

function initializeMatchPlayerStatuses(
  currentStatuses: Record<number, SignupStatus>,
  players: Player[],
) {
  return Object.fromEntries(
    players.map((player) => [
      player.id,
      currentStatuses[player.id] ?? "available",
    ]),
  );
}

function initializeMatchPlayerStatusesForCreate(
  currentStatuses: Record<number, SignupStatus>,
  players: Player[],
  matchDate: string,
  injuriesByPlayerId: Map<number, PlayerInjury[]>,
) {
  return Object.fromEntries(
    players.map((player) => [
      player.id,
      !player.isGuest &&
      isPlayerInjuredOnDate(player, matchDate, injuriesByPlayerId)
        ? "unavailable"
        : (currentStatuses[player.id] ?? "available"),
    ]),
  );
}

function getSelectedPitchPlayerCount(
  form: MatchSetupFormState,
  availablePlayers: Player[],
) {
  const selectedFormation = normalizeMatchFormation(form.formation);
  const availablePlayerIds = new Set(
    availablePlayers.map((player) => player.id),
  );

  return formationSlots[selectedFormation].filter((slot) =>
    availablePlayerIds.has(form.lineupAssignments[slot.id]),
  ).length;
}

function getAssignedStarters(form: MatchSetupFormState, players: Player[]) {
  const selectedFormation = normalizeMatchFormation(form.formation);

  return formationSlots[selectedFormation].flatMap((slot) => {
    const player = getAssignedPlayer(form.lineupAssignments[slot.id], players);
    return player ? [{ player, slot }] : [];
  });
}

function applyGuestKitNumbers(players: Player[], guestPlayerIds: number[]) {
  const kitNumberByGuestId = new Map(
    guestPlayerIds.map((playerId, index) => [playerId, 70 + index]),
  );

  return players.map((player) => {
    const guestKitNumber = kitNumberByGuestId.get(player.id);
    return guestKitNumber === undefined
      ? player
      : { ...player, kitNumber: guestKitNumber };
  });
}

function getAssignedSubstitutes(form: MatchSetupFormState, players: Player[]) {
  return substituteSlots.flatMap((slot) => {
    const player = getAssignedPlayer(form.lineupAssignments[slot.id], players);
    return player ? [{ player, slot }] : [];
  });
}

function getMatchResultSquadEntries(
  match: MatchDayMatch | null,
  players: Player[],
): MatchResultSquadEntry[] {
  if (!match) {
    return [];
  }

  const form = createMatchSetupFormStateFromMatch(match);
  const starters = getAssignedStarters(form, players).map(({ player }) => ({
    player,
    role: "starter" as const,
  }));
  const substitutes = getAssignedSubstitutes(form, players).map(
    ({ player }) => ({
      player,
      role: "substitute" as const,
    }),
  );

  return [...starters, ...substitutes];
}

function getJerseyResultBadges(
  stat: MatchPlayerResultStat | undefined,
  role: MatchResultSquadEntry["role"],
  matchDurationMinutes: number,
): JerseyResultBadges | null {
  if (!stat) {
    return null;
  }

  return {
    assists: stat.assists,
    card: stat.card,
    goals: stat.goals,
    subDirection: getSubDirection(stat, role, matchDurationMinutes),
  };
}

function getSubDirection(
  stat: MatchPlayerResultStat,
  role: MatchResultSquadEntry["role"],
  matchDurationMinutes: number,
) {
  if (stat.attendance === "no-show") {
    return null;
  }

  if (role === "starter" && stat.minutesPlayed < matchDurationMinutes) {
    return "off";
  }

  if (role === "substitute" && stat.minutesPlayed > 0) {
    return "on";
  }

  return null;
}

function validateMatchSetupForm(
  form: MatchSetupFormState,
  t: ReturnType<typeof useI18n>["t"],
  disallowFutureDate = false,
) {
  if (!form.opponent.trim()) {
    Alert.alert(
      t("matchday.add_match.validation.opponent.title"),
      t("matchday.add_match.validation.opponent.message"),
    );
    return false;
  }

  if (!parseDisplayDateToDate(form.date)) {
    Alert.alert(
      t("matchday.add_match.validation.date.title"),
      t("matchday.add_match.validation.date.message"),
    );
    return false;
  }

  if (
    disallowFutureDate &&
    parseDisplayDateToDate(form.date)!.getTime() > getEndOfToday().getTime()
  ) {
    Alert.alert(
      t("matchday.add_match.validation.result_date.title"),
      t("matchday.add_match.validation.result_date.message"),
    );
    return false;
  }

  if (!parseDisplayTimeToDate(form.startTime)) {
    Alert.alert(
      t("matchday.add_match.validation.time.title"),
      t("matchday.add_match.validation.time.message"),
    );
    return false;
  }

  return true;
}

function getEndOfToday() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

function validateMatchCaptain(
  form: MatchSetupFormState,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (form.captainPlayerId === null) {
    Alert.alert(
      t("matchday.add_match.validation.captain.title"),
      t("matchday.add_match.validation.captain.message"),
    );
    return false;
  }

  return true;
}
