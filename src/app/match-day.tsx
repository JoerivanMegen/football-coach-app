import DateTimePicker from "@react-native-community/datetimepicker";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Image } from "expo-image";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  TextInput,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BottomTabInset,
  MaxContentWidth,
  ModalBackgroundColor,
  PageTopPadding,
  Spacing,
} from "@/constants/theme";
import {
  formatDateForDisplay,
  formatTimeForDisplay,
} from "@/features/events/components/event-wizard/event-details-step";
import type { SignupStatus } from "@/features/events/components/event-wizard/event-wizard-types";
import {
  createMatchDayMatchAsync,
  listMatchDayMatchesAsync,
} from "@/features/match-day/match-day-repository";
import type {
  MatchDayCategory,
  MatchDayLocation,
  MatchDayMatch,
} from "@/features/match-day/match-day-types";
import { listPlayerAttendanceStatsAsync } from "@/features/player-stats/player-stats-repository";
import type { PlayerAttendanceStats } from "@/features/player-stats/player-stats-types";
import { getPlayerPositionLabel } from "@/features/players/player-position-labels";
import { listPlayersAsync } from "@/features/players/player-repository";
import type { Player } from "@/features/players/player-types";
import { useTheme } from "@/hooks/use-theme";

type MatchLocation = MatchDayLocation;
type MatchCategory = MatchDayCategory;
type MatchFormation =
  | "4-3-3"
  | "4-3-3 attacking"
  | "4-3-3 defensive"
  | "4-4-2"
  | "3-5-2"
  | "5-3-2"
  | "4-2-3-1"
  | "4-1-2-1-2"
  | "4-3-1-2"
  | "4-1-3-2";
type FormationOption = {
  label: string;
  value: MatchFormation;
};
type PitchSlot = {
  id: string;
  left: `${number}%`;
  top: `${number}%`;
  label?: string;
  isGoalkeeper?: boolean;
};
type AssignmentSlot = {
  id: string;
  label?: string;
};
type PitchLayout = {
  height: number;
  width: number;
  x: number;
  y: number;
};
type PitchPoint = {
  x: number;
  y: number;
};
type DropTarget = PitchPoint & {
  id: string;
};
type LineupAssignments = Record<string, number>;
type LayoutBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type MatchSetupFormState = {
  opponent: string;
  date: string;
  startTime: string;
  location: MatchLocation;
  category: MatchCategory;
  formation: MatchFormation;
  notes: string;
  playerStatuses: Record<number, SignupStatus>;
  lineupAssignments: LineupAssignments;
};

const matchLocations = ["home", "away"] satisfies MatchLocation[];
const matchCategories = ["league", "cup", "friendly"] satisfies MatchCategory[];
const matchFormationOptions = [
  { label: "4-3-3", value: "4-3-3" },
  { label: "4-3-3 attacking", value: "4-3-3 attacking" },
  { label: "4-3-3 defensive", value: "4-3-3 defensive" },
  { label: "4-4-2", value: "4-4-2" },
  { label: "3-5-2", value: "3-5-2" },
  { label: "5-3-2", value: "5-3-2" },
  { label: "4-2-3-1", value: "4-2-3-1" },
  { label: "4-1-2-1-2", value: "4-1-2-1-2" },
  { label: "4-3-1-2", value: "4-3-1-2" },
  { label: "4-1-3-2", value: "4-1-3-2" },
] satisfies FormationOption[];
const matchFormations: MatchFormation[] = matchFormationOptions.map(
  (option) => option.value,
);
const substituteSlots = Array.from({ length: 7 }, (_, index) => ({
  id: `sub-${index + 1}`,
  label: `SUB ${index + 1}`,
})) satisfies AssignmentSlot[];

function createPitchSlot(
  positionNumber: number,
  top: `${number}%`,
  left: `${number}%`,
): PitchSlot {
  return {
    id: String(positionNumber),
    top,
    left,
    isGoalkeeper: positionNumber === 11,
  };
}

const formationSlots = {
  "4-3-3": [
    createPitchSlot(1, "23%", "24%"),
    createPitchSlot(2, "20%", "50%"),
    createPitchSlot(3, "23%", "76%"),
    createPitchSlot(4, "45%", "30%"),
    createPitchSlot(5, "42%", "50%"),
    createPitchSlot(6, "45%", "70%"),
    createPitchSlot(7, "62%", "18%"),
    createPitchSlot(8, "65%", "38%"),
    createPitchSlot(9, "65%", "62%"),
    createPitchSlot(10, "62%", "82%"),
    createPitchSlot(11, "78%", "50%"),
  ],
  "4-3-3 attacking": [
    createPitchSlot(1, "23%", "24%"),
    createPitchSlot(2, "20%", "50%"),
    createPitchSlot(3, "23%", "76%"),
    createPitchSlot(4, "48%", "32%"),
    createPitchSlot(5, "34%", "50%"),
    createPitchSlot(6, "48%", "68%"),
    createPitchSlot(7, "62%", "18%"),
    createPitchSlot(8, "65%", "38%"),
    createPitchSlot(9, "65%", "62%"),
    createPitchSlot(10, "62%", "82%"),
    createPitchSlot(11, "78%", "50%"),
  ],
  "4-3-3 defensive": [
    createPitchSlot(1, "23%", "24%"),
    createPitchSlot(2, "20%", "50%"),
    createPitchSlot(3, "23%", "76%"),
    createPitchSlot(4, "43%", "30%"),
    createPitchSlot(5, "55%", "50%"),
    createPitchSlot(6, "43%", "70%"),
    createPitchSlot(7, "62%", "18%"),
    createPitchSlot(8, "65%", "38%"),
    createPitchSlot(9, "65%", "62%"),
    createPitchSlot(10, "62%", "82%"),
    createPitchSlot(11, "78%", "50%"),
  ],
  "4-4-2": [
    createPitchSlot(1, "23%", "38%"),
    createPitchSlot(2, "23%", "62%"),
    createPitchSlot(3, "45%", "18%"),
    createPitchSlot(4, "45%", "38%"),
    createPitchSlot(5, "45%", "62%"),
    createPitchSlot(6, "45%", "82%"),
    createPitchSlot(7, "62%", "18%"),
    createPitchSlot(8, "65%", "38%"),
    createPitchSlot(9, "65%", "62%"),
    createPitchSlot(10, "62%", "82%"),
    createPitchSlot(11, "78%", "50%"),
  ],
  "3-5-2": [
    createPitchSlot(1, "23%", "38%"),
    createPitchSlot(2, "23%", "62%"),
    createPitchSlot(3, "45%", "14%"),
    createPitchSlot(4, "45%", "32%"),
    createPitchSlot(5, "43%", "50%"),
    createPitchSlot(6, "45%", "68%"),
    createPitchSlot(7, "45%", "86%"),
    createPitchSlot(8, "65%", "28%"),
    createPitchSlot(9, "66%", "50%"),
    createPitchSlot(10, "65%", "72%"),
    createPitchSlot(11, "78%", "50%"),
  ],
  "5-3-2": [
    createPitchSlot(1, "23%", "38%"),
    createPitchSlot(2, "23%", "62%"),
    createPitchSlot(3, "45%", "30%"),
    createPitchSlot(4, "43%", "50%"),
    createPitchSlot(5, "45%", "70%"),
    createPitchSlot(6, "62%", "10%"),
    createPitchSlot(7, "65%", "30%"),
    createPitchSlot(8, "66%", "50%"),
    createPitchSlot(9, "65%", "70%"),
    createPitchSlot(10, "62%", "90%"),
    createPitchSlot(11, "78%", "50%"),
  ],
  "4-2-3-1": [
    createPitchSlot(1, "21%", "50%"),
    createPitchSlot(2, "36%", "24%"),
    createPitchSlot(3, "34%", "50%"),
    createPitchSlot(4, "36%", "76%"),
    createPitchSlot(5, "56%", "38%"),
    createPitchSlot(6, "56%", "62%"),
    createPitchSlot(7, "62%", "18%"),
    createPitchSlot(8, "65%", "38%"),
    createPitchSlot(9, "65%", "62%"),
    createPitchSlot(10, "62%", "82%"),
    createPitchSlot(11, "78%", "50%"),
  ],
  "4-1-2-1-2": [
    createPitchSlot(1, "23%", "38%"),
    createPitchSlot(2, "23%", "62%"),
    createPitchSlot(3, "34%", "50%"),
    createPitchSlot(4, "50%", "34%"),
    createPitchSlot(5, "50%", "66%"),
    createPitchSlot(6, "62%", "50%"),
    createPitchSlot(7, "62%", "18%"),
    createPitchSlot(8, "65%", "38%"),
    createPitchSlot(9, "65%", "62%"),
    createPitchSlot(10, "62%", "82%"),
    createPitchSlot(11, "78%", "50%"),
  ],
  "4-3-1-2": [
    createPitchSlot(1, "23%", "38%"),
    createPitchSlot(2, "23%", "62%"),
    createPitchSlot(3, "36%", "50%"),
    createPitchSlot(4, "52%", "28%"),
    createPitchSlot(5, "54%", "50%"),
    createPitchSlot(6, "52%", "72%"),
    createPitchSlot(7, "62%", "18%"),
    createPitchSlot(8, "65%", "38%"),
    createPitchSlot(9, "65%", "62%"),
    createPitchSlot(10, "62%", "82%"),
    createPitchSlot(11, "78%", "50%"),
  ],
  "4-1-3-2": [
    createPitchSlot(1, "23%", "38%"),
    createPitchSlot(2, "23%", "62%"),
    createPitchSlot(3, "44%", "24%"),
    createPitchSlot(4, "42%", "50%"),
    createPitchSlot(5, "44%", "76%"),
    createPitchSlot(6, "60%", "50%"),
    createPitchSlot(7, "62%", "18%"),
    createPitchSlot(8, "65%", "38%"),
    createPitchSlot(9, "65%", "62%"),
    createPitchSlot(10, "62%", "82%"),
    createPitchSlot(11, "78%", "50%"),
  ],
} satisfies Record<MatchFormation, PitchSlot[]>;

function createEmptyMatchSetupFormState(): MatchSetupFormState {
  return {
    opponent: "",
    date: formatDateForDisplay(new Date()),
    startTime: "",
    location: "home",
    category: "league",
    formation: "4-3-3",
    notes: "",
    playerStatuses: {},
    lineupAssignments: {},
  };
}

function createMatchSetupFormStateFromMatch(match: MatchDayMatch): MatchSetupFormState {
  return {
    opponent: match.opponent,
    date: formatIsoDateForDisplay(match.matchDate),
    startTime: match.startTime,
    location: match.location,
    category: match.category,
    formation: normalizeMatchFormation(match.formation),
    notes: match.notes,
    playerStatuses: match.playerStatuses,
    lineupAssignments: match.lineupAssignments,
  };
}

export default function MatchDayScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [isMatchSetupOpen, setIsMatchSetupOpen] = useState(false);
  const [matches, setMatches] = useState<MatchDayMatch[]>([]);
  const [overviewPlayers, setOverviewPlayers] = useState<Player[]>([]);
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const [matchSetupForm, setMatchSetupForm] = useState<MatchSetupFormState>(
    createEmptyMatchSetupFormState,
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
      const [nextMatches, nextPlayers] = await Promise.all([
        listMatchDayMatchesAsync(),
        listPlayersAsync(),
      ]);
      setMatches(nextMatches);
      setOverviewPlayers(nextPlayers);
    } catch (error) {
      console.warn("Failed to load match day matches", error);
      Alert.alert("Could not load matches", "Please try again.");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([listMatchDayMatchesAsync(), listPlayersAsync()])
      .then(([nextMatches, nextPlayers]) => {
        if (isMounted) {
          setMatches(nextMatches);
          setOverviewPlayers(nextPlayers);
        }
      })
      .catch((error: unknown) => {
        console.warn("Failed to load match day matches", error);
        Alert.alert("Could not load matches", "Please try again.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSaveMatch() {
    if (!validateMatchSetupForm(matchSetupForm)) {
      return;
    }

    try {
      await createMatchDayMatchAsync({
        opponent: matchSetupForm.opponent,
        matchDate: parseDisplayDateToIsoDate(matchSetupForm.date),
        startTime: matchSetupForm.startTime,
        location: matchSetupForm.location,
        category: matchSetupForm.category,
        formation: matchSetupForm.formation,
        notes: matchSetupForm.notes,
        playerStatuses: matchSetupForm.playerStatuses,
        lineupAssignments: matchSetupForm.lineupAssignments,
      });
      await loadMatches();
      setMatchSetupForm(createEmptyMatchSetupFormState());
      setIsMatchSetupOpen(false);
    } catch (error) {
      console.warn("Failed to save match", error);
      Alert.alert("Could not save match", "Please check the match details and try again.");
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
                Match Day
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.description}>
                Prepare the team sheet, build lineups, and capture match
                moments.
              </ThemedText>
            </ThemedView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add match"
              onPress={() => setIsMatchSetupOpen(true)}
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
                Add match
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <ThemedText type="smallBold">Match day overview</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Saved match setups will appear here with lineups and substitutes.
            </ThemedText>
          </ThemedView>

          <MatchDayMatchList
            expandedMatchId={expandedMatchId}
            matches={matches}
            players={overviewPlayers}
            onToggleMatch={(matchId) =>
              setExpandedMatchId((currentMatchId) =>
                currentMatchId === matchId ? null : matchId,
              )
            }
          />
        </ThemedView>
      </ScrollView>

      <MatchSetupModal
        form={matchSetupForm}
        visible={isMatchSetupOpen}
        onChangeForm={setMatchSetupForm}
        onClose={() => setIsMatchSetupOpen(false)}
        onContinue={handleSaveMatch}
      />
    </>
  );
}

function MatchSetupModal({
  form,
  onChangeForm,
  onClose,
  onContinue,
  visible,
}: {
  form: MatchSetupFormState;
  onChangeForm: Dispatch<SetStateAction<MatchSetupFormState>>;
  onClose: () => void;
  onContinue: () => Promise<void> | void;
  visible: boolean;
}) {
  const theme = useTheme();
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerAttendanceStats[]>([]);
  const [wizardStep, setWizardStep] = useState(0);
  const [isDraggingPlayer, setIsDraggingPlayer] = useState(false);
  const availablePlayers = players.filter(
    (player) => form.playerStatuses[player.id] === "available",
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    let isMounted = true;

    async function loadMatchData() {
      try {
        const [loadedPlayers, loadedPlayerStats] = await Promise.all([
          listPlayersAsync(),
          listPlayerAttendanceStatsAsync(),
        ]);

        if (isMounted) {
          setPlayers(loadedPlayers);
          setPlayerStats(loadedPlayerStats);
          onChangeForm((currentForm) => ({
            ...currentForm,
            playerStatuses: initializeMatchPlayerStatuses(
              currentForm.playerStatuses,
              loadedPlayers,
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

  function handleClose() {
    setWizardStep(0);
    setIsDraggingPlayer(false);
    onClose();
  }

  async function handleNext() {
    if (wizardStep === 0) {
      if (!validateMatchSetupForm(form)) {
        return;
      }

      setWizardStep(1);
      return;
    }

    if (wizardStep === 1) {
      if (availablePlayers.length === 0) {
        Alert.alert(
          "Choose available players",
          "Mark at least one player as available before building the lineup.",
        );
        return;
      }

      if (availablePlayers.length < 11) {
        Alert.alert(
          "Less than 11 available players",
          "You have selected less than 11 available players!",
          [
            { text: "Go back", style: "cancel" },
            { text: "Continue anyway", onPress: () => setWizardStep(2) },
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
          "Complete lineup",
          "Add 11 players to the pitch before continuing.",
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
        <ThemedView style={styles.modalSheet}>
          <ThemedView style={styles.modalHeader}>
            <ThemedView style={styles.modalTitleGroup}>
              <ThemedText type="default">Add match</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Step {wizardStep + 1} of 4: {getMatchSetupStepLabel(wizardStep)}
              </ThemedText>
            </ThemedView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close match setup"
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
              <MatchDetailsStep form={form} onChangeForm={onChangeForm} />
            ) : wizardStep === 1 ? (
              <MatchAvailabilityStep
                form={form}
                players={players}
                onChangeForm={onChangeForm}
              />
            ) : wizardStep === 2 ? (
              <MatchFormationStep
                form={form}
                playerStats={playerStats}
                players={availablePlayers}
                onChangeForm={onChangeForm}
                onDragPlayerChange={setIsDraggingPlayer}
              />
            ) : (
              <MatchReviewStep form={form} players={availablePlayers} />
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
                <ThemedText type="smallBold" style={styles.reviewActionText}>
                  Back
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => undefined}
                style={({ pressed }) => [
                  styles.reviewActionButton,
                  styles.reviewShareButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.reviewActionText}>
                  Share
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
                <ThemedText type="smallBold" style={styles.reviewActionText}>
                  Save
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
                  {wizardStep === 0 ? "Cancel" : "Back"}
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
                  {wizardStep === 2 ? "Review" : "Next"}
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MatchDayMatchList({
  expandedMatchId,
  matches,
  onToggleMatch,
  players,
}: {
  expandedMatchId: number | null;
  matches: MatchDayMatch[];
  onToggleMatch: (matchId: number) => void;
  players: Player[];
}) {
  if (matches.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.emptyMatchPanel}>
        <ThemedText type="smallBold">No saved matches yet</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Add a match to save the lineup and substitutes here.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.matchCardList}>
      {matches.map((match) => {
        const isExpanded = expandedMatchId === match.id;
        const matchForm = createMatchSetupFormStateFromMatch(match);

        return (
          <ThemedView key={match.id} type="backgroundElement" style={styles.matchCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
              onPress={() => onToggleMatch(match.id)}
              style={({ pressed }) => [
                styles.matchCardHeader,
                pressed && styles.pressed,
              ]}
            >
              <ThemedView type="backgroundElement" style={styles.matchCardTitleGroup}>
                <ThemedView type="backgroundElement" style={styles.matchTitleRow}>
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.matchTitleText}>
                    {match.opponent}
                  </ThemedText>
                  <MatchCategoryIcon category={match.category} size={16} />
                </ThemedView>
                <ThemedText type="code" themeColor="textSecondary">
                  {formatIsoDateForDisplay(match.matchDate)} at {match.startTime}
                </ThemedText>
              </ThemedView>
              <ThemedView type="backgroundElement" style={styles.matchCardMetaGroup}>
                <ThemedText type="code" themeColor="textSecondary">
                  {getMatchLocationLabel(match.location)}
                </ThemedText>
                <SymbolView
                  name={{
                    ios: isExpanded ? "chevron.up" : "chevron.down",
                    android: isExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down",
                    web: isExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down",
                  }}
                  size={18}
                />
              </ThemedView>
            </Pressable>

            {isExpanded ? (
              <ThemedView type="backgroundElement" style={styles.matchCardDetails}>
                <MatchReviewStep form={matchForm} players={players} />
              </ThemedView>
            ) : null}
          </ThemedView>
        );
      })}
    </ThemedView>
  );
}

function MatchDetailsStep({
  form,
  onChangeForm,
}: {
  form: MatchSetupFormState;
  onChangeForm: (form: MatchSetupFormState) => void;
}) {
  return (
    <>
      <MatchTextInput
        label="Opponent"
        required
        value={form.opponent}
        onChangeText={(opponent) => onChangeForm({ ...form, opponent })}
      />

      {Platform.OS === "web" ? (
        <MatchTextInput
          label="Date"
          placeholder="DD-MM-YYYY"
          required
          value={form.date}
          onChangeText={(date) => onChangeForm({ ...form, date })}
        />
      ) : (
        <MatchDatePickerField
          value={form.date}
          onChange={(date) => onChangeForm({ ...form, date })}
        />
      )}

      {Platform.OS === "web" ? (
        <MatchTextInput
          label="Time"
          placeholder="HH:MM"
          required
          value={form.startTime}
          onChangeText={(startTime) => onChangeForm({ ...form, startTime })}
        />
      ) : (
        <MatchTimePickerField
          value={form.startTime}
          onChange={(startTime) => onChangeForm({ ...form, startTime })}
        />
      )}

      <MatchLocationField
        value={form.location}
        onChange={(location) => onChangeForm({ ...form, location })}
      />

      <MatchCategoryField
        value={form.category}
        onChange={(category) => onChangeForm({ ...form, category })}
      />

      <MatchTextInput
        label="Notes"
        multiline
        value={form.notes}
        onChangeText={(notes) => onChangeForm({ ...form, notes })}
      />
    </>
  );
}

function MatchAvailabilityStep({
  form,
  onChangeForm,
  players,
}: {
  form: MatchSetupFormState;
  onChangeForm: Dispatch<SetStateAction<MatchSetupFormState>>;
  players: Player[];
}) {
  return (
    <ThemedView style={styles.availabilityStep}>
      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">Player availability</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Only players marked available will appear in the formation builder.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.availabilityList}>
        {players.length > 0 ? (
          players.map((player) => {
            const status = form.playerStatuses[player.id] ?? "unavailable";

            return (
              <ThemedView
                key={player.id}
                type="backgroundElement"
                style={styles.availabilityRow}
              >
                <ThemedView style={styles.availabilityPlayerInfo}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {formatPlayerDisplayName(player)}
                  </ThemedText>
                  <ThemedText type="code" themeColor="textSecondary">
                    {formatPlayerMeta(player)}
                  </ThemedText>
                </ThemedView>

                <ThemedView style={styles.availabilityToggle}>
                  <AvailabilityOption
                    isSelected={status === "available"}
                    label="Available"
                    onPress={() =>
                      updateMatchPlayerStatus(
                        onChangeForm,
                        player.id,
                        "available",
                      )
                    }
                  />
                  <AvailabilityOption
                    isSelected={status === "unavailable"}
                    label="Out"
                    onPress={() =>
                      updateMatchPlayerStatus(
                        onChangeForm,
                        player.id,
                        "unavailable",
                      )
                    }
                  />
                </ThemedView>
              </ThemedView>
            );
          })
        ) : (
          <ThemedView type="backgroundElement" style={styles.availabilityRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Add players first to choose match availability.
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    </ThemedView>
  );
}

function AvailabilityOption({
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
        styles.availabilityOption,
        isSelected && styles.availabilityOptionSelected,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={isSelected && styles.availabilityOptionTextSelected}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function MatchFormationStep({
  form,
  onDragPlayerChange,
  onChangeForm,
  playerStats,
  players,
}: {
  form: MatchSetupFormState;
  onDragPlayerChange: (isDragging: boolean) => void;
  onChangeForm: Dispatch<SetStateAction<MatchSetupFormState>>;
  playerStats: PlayerAttendanceStats[];
  players: Player[];
}) {
  const theme = useTheme();
  const selectedFormation = normalizeMatchFormation(form.formation);
  const selectedFormationLabel = getFormationLabel(selectedFormation);
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
  const [isFormationPickerOpen, setIsFormationPickerOpen] = useState(false);
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

  const registerDropTargets = useCallback((targets: DropTarget[]) => {
    setDropTargets((currentTargets) => {
      const nextTargets = { ...currentTargets };

      for (const target of targets) {
        nextTargets[target.id] = target;
      }

      return nextTargets;
    });
  }, [setDropTargets]);

  const registerDropTarget = useCallback((target: DropTarget) => {
    setDropTargets((currentTargets) => ({
      ...currentTargets,
      [target.id]: target,
    }));
  }, [setDropTargets]);

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
      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">Formation</ThemedText>
        <ThemedView style={styles.formationPicker}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select formation"
            accessibilityState={{ expanded: isFormationPickerOpen }}
            onPress={() => setIsFormationPickerOpen((isOpen) => !isOpen)}
            style={({ pressed }) => [
              styles.dropdownButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold">{selectedFormationLabel}</ThemedText>
            <SymbolView
              name={{
                ios: "chevron.down",
                android: "keyboard_arrow_down",
                web: "keyboard_arrow_down",
              }}
              tintColor={theme.text}
              size={20}
            />
          </Pressable>

          {isFormationPickerOpen ? (
            <ThemedView type="backgroundElement" style={styles.dropdownMenu}>
              {matchFormationOptions.map((option) => {
                const isSelected = selectedFormation === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChangeForm({ ...form, formation: option.value });
                      setIsFormationPickerOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.dropdownOption,
                      isSelected && styles.dropdownOptionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={isSelected && styles.dropdownOptionTextSelected}
                    >
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ThemedView>
          ) : null}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.lineupDropSurface}>
        <FootballPitch
          assignments={lineupAssignments}
          dropTargets={dropTargets}
          formation={selectedFormation}
          players={players}
          onDragPlayerChange={onDragPlayerChange}
          onMovePlayer={handleMovePlayer}
          onRegisterDropTargets={registerDropTargets}
          onSelectAssignedSlot={handleSelectAssignedSlot}
          onSelectSlot={handleSelectEmptySlot}
        />

        <SubstituteBench
          assignments={lineupAssignments}
          dropTargets={dropTargets}
          players={players}
          onDragPlayerChange={onDragPlayerChange}
          onMovePlayer={handleMovePlayer}
          onRegisterDropTarget={registerDropTarget}
          onSelectAssignedSlot={handleSelectAssignedSlot}
          onSelectSlot={handleSelectEmptySlot}
        />

        {selectedActionPlayer && selectedActionSlot && selectedActionTarget ? (
          <FloatingPlayerActions
            player={selectedActionPlayer}
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
        players={players}
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
            ? playerStatsById.get(selectedStatsPlayer.id) ?? null
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
  players,
}: {
  form: MatchSetupFormState;
  players: Player[];
}) {
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
          {form.date} at {form.startTime}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {getMatchLocationLabel(form.location)} match
        </ThemedText>
      </ThemedView>

      <ReviewPitch form={form} players={players} />

      <ThemedView style={styles.reviewLists}>
        <ThemedView style={styles.reviewListSection}>
          <ThemedText type="default">Substitutes</ThemedText>
          {substitutes.length > 0 ? (
            <ThemedView style={styles.reviewPlayerGrid}>
              {substitutes.map(({ player, slot }) => (
                <ThemedView key={slot.id} style={styles.reviewPlayerRow}>
                  <ThemedText type="code" themeColor="textSecondary">
                    {slot.label}
                  </ThemedText>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {formatPlayerDisplayName(player)}
                  </ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              No substitutes selected.
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
  const theme = useTheme();

  if (category === "friendly") {
    return (
      <FontAwesome6
        name="handshake"
        solid
        color={theme.text}
        size={size}
      />
    );
  }

  return (
    <SymbolView
      name={getMatchCategoryIcon(category)}
      tintColor={theme.text}
      size={size}
    />
  );
}

function ReviewPitch({
  form,
  players,
}: {
  form: MatchSetupFormState;
  players: Player[];
}) {
  const selectedFormation = normalizeMatchFormation(form.formation);
  const slots = formationSlots[selectedFormation];

  return (
    <ThemedView style={styles.reviewPitch}>
      <ThemedView style={styles.reviewPitchImageClip}>
        <Image
          source={require("@/assets/images/match-day/pitch.png")}
          contentFit="cover"
          style={styles.pitchImage}
        />
      </ThemedView>

      <ThemedView style={styles.pitchPlayersLayer}>
        {slots.map((slot) => {
          const assignedPlayer = getAssignedPlayer(
            form.lineupAssignments[slot.id],
            players,
          );

          if (!assignedPlayer) {
            return null;
          }

          return (
            <ThemedView
              key={`${selectedFormation}-${slot.id}`}
              style={[
                styles.reviewPitchPlayer,
                {
                  left: slot.left,
                  top: slot.isGoalkeeper
                    ? offsetPercentage(slot.top, 6)
                    : slot.top,
                },
              ]}
            >
              <LineupJersey
                compact
                isGoalkeeper={slot.isGoalkeeper}
                player={assignedPlayer}
                showName
              />
            </ThemedView>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

function SubstituteBench({
  assignments,
  dropTargets,
  onDragPlayerChange,
  onMovePlayer,
  onRegisterDropTarget,
  onSelectAssignedSlot,
  onSelectSlot,
  players,
}: {
  assignments: LineupAssignments;
  dropTargets: Record<string, DropTarget>;
  onDragPlayerChange: (isDragging: boolean) => void;
  onMovePlayer: (fromSlotId: string, toSlotId: string) => void;
  onRegisterDropTarget: (target: DropTarget) => void;
  onSelectAssignedSlot: (slotId: string) => void;
  onSelectSlot: (slotId: string) => void;
  players: Player[];
}) {
  const [sectionLayout, setSectionLayout] = useState<LayoutBox | null>(null);
  const [gridLayout, setGridLayout] = useState<LayoutBox | null>(null);
  const [slotLayouts, setSlotLayouts] = useState<Record<string, LayoutBox>>({});

  useEffect(() => {
    if (!sectionLayout || !gridLayout) {
      return;
    }

    for (const [slotId, slotLayout] of Object.entries(slotLayouts)) {
      onRegisterDropTarget({
        id: slotId,
        x: sectionLayout.x + gridLayout.x + slotLayout.x + slotLayout.width / 2,
        y:
          sectionLayout.y +
          gridLayout.y +
          slotLayout.y +
          slotLayout.height / 2,
      });
    }
  }, [gridLayout, onRegisterDropTarget, sectionLayout, slotLayouts]);

  function handleSlotLayout(slotId: string, event: LayoutChangeEvent) {
    const { height, width, x, y } = event.nativeEvent.layout;
    setSlotLayouts((currentLayouts) => ({
      ...currentLayouts,
      [slotId]: { height, width, x, y },
    }));
  }

  return (
    <ThemedView
      style={styles.substituteSection}
      onLayout={(event) => {
        const { height, width, x, y } = event.nativeEvent.layout;
        setSectionLayout({ height, width, x, y });
      }}
    >
      <ThemedText type="smallBold">Substitutes</ThemedText>
      <ThemedView
        style={styles.substituteGrid}
        onLayout={(event) => {
          const { height, width, x, y } = event.nativeEvent.layout;
          setGridLayout({ height, width, x, y });
        }}
      >
        {substituteSlots.map((slot) => {
          const assignedPlayer = getAssignedPlayer(
            assignments[slot.id],
            players,
          );

          if (assignedPlayer) {
            return (
              <DraggableLineupSlot
                key={slot.id}
                compact
                dropTargets={dropTargets}
                player={assignedPlayer}
                slot={slot}
                slotStyle={[
                  styles.substituteSlot,
                  styles.substituteSlotAssigned,
                ]}
                onDragPlayerChange={onDragPlayerChange}
                onLayout={(event) => handleSlotLayout(slot.id, event)}
                onMovePlayer={onMovePlayer}
                onSelectSlot={onSelectAssignedSlot}
                showName
              />
            );
          }

          return (
            <Pressable
              key={slot.id}
              accessibilityRole="button"
              accessibilityLabel={`Add substitute ${slot.label}`}
              onLayout={(event) => handleSlotLayout(slot.id, event)}
              onPress={() => onSelectSlot(slot.id)}
              style={({ pressed }) => [
                styles.substituteSlot,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="subtitle" style={styles.substituteSlotPlus}>
                +
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

function FootballPitch({
  assignments,
  dropTargets,
  formation,
  onDragPlayerChange,
  onMovePlayer,
  onRegisterDropTargets,
  onSelectAssignedSlot,
  onSelectSlot,
  players,
}: {
  assignments: LineupAssignments;
  dropTargets: Record<string, DropTarget>;
  formation: MatchFormation;
  onDragPlayerChange: (isDragging: boolean) => void;
  onMovePlayer: (fromSlotId: string, toSlotId: string) => void;
  onRegisterDropTargets: (targets: DropTarget[]) => void;
  onSelectAssignedSlot: (slotId: string) => void;
  onSelectSlot: (slotId: string) => void;
  players: Player[];
}) {
  const selectedFormation = normalizeMatchFormation(formation);
  const slots = formationSlots[selectedFormation];
  const [pitchLayout, setPitchLayout] = useState<PitchLayout | null>(null);

  function handlePitchLayout(event: LayoutChangeEvent) {
    const { height, width, x, y } = event.nativeEvent.layout;
    setPitchLayout({ height, width, x, y });
  }

  useEffect(() => {
    if (!pitchLayout) {
      return;
    }

    onRegisterDropTargets(
      slots.map((slot) => ({
        id: slot.id,
        ...getPitchSlotCenter(slot, pitchLayout),
      })),
    );
  }, [onRegisterDropTargets, pitchLayout, slots]);

  return (
    <ThemedView style={styles.pitch} onLayout={handlePitchLayout}>
      <ThemedView style={styles.pitchImageClip}>
        <Image
          source={require("@/assets/images/match-day/pitch.png")}
          contentFit="cover"
          style={styles.pitchImage}
        />
      </ThemedView>

      <ThemedView style={styles.pitchPlayersLayer}>
        {slots.map((slot) => {
          const assignedPlayer = getAssignedPlayer(
            assignments[slot.id],
            players,
          );

          if (assignedPlayer) {
            return (
              <DraggableLineupSlot
                key={`${selectedFormation}-${slot.id}`}
                dropTargets={dropTargets}
                isGoalkeeper={slot.isGoalkeeper}
                player={assignedPlayer}
                slot={slot}
                slotStyle={[
                  styles.pitchSlot,
                  styles.pitchSlotAssigned,
                  { left: slot.left, top: slot.top },
                ]}
                onDragPlayerChange={onDragPlayerChange}
                onMovePlayer={onMovePlayer}
                onSelectSlot={onSelectAssignedSlot}
              />
            );
          }

          return (
            <Pressable
              key={`${selectedFormation}-${slot.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Add player to ${slot.id}`}
              onPress={() => onSelectSlot(slot.id)}
              style={({ pressed }) => [
                styles.pitchSlot,
                { left: slot.left, top: slot.top },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="subtitle" style={styles.pitchSlotPlus}>
                +
              </ThemedText>
              {slot.label ? (
                <ThemedText type="code" style={styles.pitchSlotLabel}>
                  {slot.label}
                </ThemedText>
              ) : null}
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

function DraggableLineupSlot({
  compact,
  dropTargets,
  isGoalkeeper,
  onDragPlayerChange,
  onLayout,
  onMovePlayer,
  onSelectSlot,
  player,
  showName,
  slot,
  slotStyle,
}: {
  compact?: boolean;
  dropTargets: Record<string, DropTarget>;
  isGoalkeeper?: boolean;
  onDragPlayerChange: (isDragging: boolean) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  onMovePlayer: (fromSlotId: string, toSlotId: string) => void;
  onSelectSlot: (slotId: string) => void;
  player: Player;
  showName?: boolean;
  slot: AssignmentSlot;
  slotStyle: StyleProp<ViewStyle>;
}) {
  const [drag] = useState(() => new Animated.ValueXY());
  const [isDragging, setIsDragging] = useState(false);

  const translateStyle = useMemo(
    () => ({ transform: drag.getTranslateTransform() }),
    [drag],
  );
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6,
        onPanResponderGrant: () => {
          setIsDragging(true);
          onDragPlayerChange(true);
          drag.setOffset({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: drag.x, dy: drag.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gestureState) => {
          setIsDragging(false);
          onDragPlayerChange(false);

          const sourceCenter = dropTargets[slot.id];

          if (!sourceCenter) {
            resetDragPosition(drag);
            return;
          }

          const dropTarget = findNearestDropTarget(
            Object.values(dropTargets),
            {
              x: sourceCenter.x + gestureState.dx,
              y: sourceCenter.y + gestureState.dy,
            },
            slot.id,
          );

          resetDragPosition(drag);

          if (dropTarget) {
            onMovePlayer(slot.id, dropTarget);
          }
        },
        onPanResponderTerminate: () => {
          setIsDragging(false);
          onDragPlayerChange(false);
          resetDragPosition(drag);
        },
      }),
    [drag, dropTargets, onDragPlayerChange, onMovePlayer, slot],
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      onLayout={onLayout}
      style={[
        slotStyle,
        isDragging && styles.pitchSlotDragging,
        translateStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Change ${formatPlayerName(player)}`}
        onPress={() => onSelectSlot(slot.id)}
        style={styles.assignedPitchSlotButton}
      >
        <LineupJersey
          compact={compact}
          player={player}
          isGoalkeeper={isGoalkeeper}
          showName={showName}
        />
      </Pressable>
    </Animated.View>
  );
}

function FloatingPlayerActions({
  onRemove,
  onShowStats,
  onSwap,
  player,
  target,
}: {
  onRemove: () => void;
  onShowStats: () => void;
  onSwap: () => void;
  player: Player;
  target: DropTarget;
}) {
  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.floatingPlayerActions,
        {
          left: target.x,
          top: target.y,
        },
      ]}
    >
      <PlayerActionButton
        icon={{
          ios: "arrow.left.arrow.right",
          android: "swap_horiz",
          web: "swap_horiz",
        }}
        label={`Swap ${formatPlayerName(player)}`}
        onPress={onSwap}
      />
      <PlayerActionButton
        icon={{
          ios: "chart.bar.xaxis",
          android: "bar_chart",
          web: "bar_chart",
        }}
        label={`Show basic stats for ${formatPlayerName(player)}`}
        onPress={onShowStats}
      />
      <PlayerActionButton
        danger
        icon={{
          ios: "person.crop.circle.badge.minus",
          android: "person_remove",
          web: "person_remove",
        }}
        label={`Remove ${formatPlayerName(player)}`}
        onPress={onRemove}
      />
    </ThemedView>
  );
}

function PlayerActionButton({
  danger,
  icon,
  label,
  onPress,
}: {
  danger?: boolean;
  icon: SymbolViewProps["name"];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.playerActionButton,
        !danger && { backgroundColor: theme.backgroundSelected },
        danger && styles.playerActionButtonDanger,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={icon}
        tintColor={danger ? "#ffffff" : theme.text}
        size={18}
      />
    </Pressable>
  );
}

function MatchdayPlayerStatsModal({
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

  if (!player) {
    return null;
  }

  const recentRatings =
    stats?.recentMatchRatings.map((rating) => rating.rating) ?? [];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <ThemedView style={styles.statsPopupOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <ThemedView type="background" style={styles.statsPopupCard}>
          <ThemedView style={styles.statsPopupHeader}>
            <ThemedView style={styles.statsPopupTitleGroup}>
              <ThemedText style={styles.statsPopupName} numberOfLines={1}>
                {formatPlayerDisplayName(player)}
              </ThemedText>
              <ThemedText style={styles.statsPopupPosition}>
                {getPlayerPositionLabel(player.position, "en")}
              </ThemedText>
            </ThemedView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close player stats"
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

          <ThemedView style={styles.statsPopupGrid}>
            <ThemedView
              style={[styles.statsPopupPanel, styles.statsPopupWidePanel]}
            >
              <ThemedText style={styles.statsPopupPanelTitle}>Form</ThemedText>
              {recentRatings.length > 0 ? (
                <ThemedView style={styles.statsPopupRatingList}>
                  {recentRatings.map((rating, index) => (
                    <ThemedView
                      key={`${rating}-${index}`}
                      style={[
                        styles.statsPopupRatingPill,
                        getMatchdayRatingPillStyle(rating),
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={[
                          styles.statsPopupRatingText,
                          getMatchdayRatingTextStyle(rating),
                        ]}
                      >
                        {rating}
                      </ThemedText>
                    </ThemedView>
                  ))}
                </ThemedView>
              ) : (
                <ThemedText style={styles.statsPopupEmptyText}>
                  No ratings yet
                </ThemedText>
              )}
            </ThemedView>

            <ThemedView
              style={[styles.statsPopupPanel, styles.statsPopupWidePanel]}
            >
              <ThemedText style={styles.statsPopupPanelTitle}>
                Training
              </ThemedText>
              <ThemedText style={styles.statsPopupLargeValue}>
                {formatPercentage(
                  stats?.recentTrainingAttendancePercentage ?? null,
                )}
              </ThemedText>
              <ThemedText style={styles.statsPopupSmallDetail}>
                past 5 weeks
              </ThemedText>
            </ThemedView>

            <MatchdayStatsMetric label="Goals" value="0" />
            <MatchdayStatsMetric label="Assists" value="0" />
            <MatchdayStatsMetric
              label="Avg mins"
              value={formatNullableNumber(stats?.averageMatchMinutes ?? null)}
            />
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

function MatchdayStatsMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <ThemedView style={[styles.statsPopupPanel, styles.statsPopupMetricPanel]}>
      <ThemedText style={styles.statsPopupMetricTitle}>{label}</ThemedText>
      <ThemedText style={styles.statsPopupMetricValue}>{value}</ThemedText>
    </ThemedView>
  );
}

function PlayerPickerSheet({
  assignedPlayerIds,
  onClose,
  onRemove,
  onSelectPlayer,
  players,
  selectedSlot,
  visible,
}: {
  assignedPlayerIds: LineupAssignments;
  onClose: () => void;
  onRemove: () => void;
  onSelectPlayer: (player: Player) => void;
  players: Player[];
  selectedSlot: AssignmentSlot | null;
  visible: boolean;
}) {
  const assignedPlayerId = selectedSlot
    ? assignedPlayerIds[selectedSlot.id]
    : undefined;
  const selectedPlayer = getAssignedPlayer(assignedPlayerId, players);
  const assignedPlayerIdSet = new Set(Object.values(assignedPlayerIds));
  const availablePlayers = players.filter(
    (player) =>
      player.id === assignedPlayerId || !assignedPlayerIdSet.has(player.id),
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <ThemedView style={styles.playerPickerOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <ThemedView type="background" style={styles.playerPickerSheet}>
          <ThemedView style={styles.playerPickerHeader}>
            <ThemedView style={styles.modalTitleGroup}>
              <ThemedText type="default">
                {selectedPlayer ? "Change player" : "Choose player"}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {selectedSlot
                  ? formatAssignmentSlotLabel(selectedSlot)
                  : "Position"}
              </ThemedText>
            </ThemedView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close player picker"
              onPress={onClose}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{ ios: "xmark", android: "close", web: "close" }}
                size={18}
              />
            </Pressable>
          </ThemedView>

          <ScrollView contentContainerStyle={styles.playerPickerList}>
            {availablePlayers.length > 0 ? (
              availablePlayers.map((player) => {
                const isSelected = selectedPlayer?.id === player.id;

                return (
                  <Pressable
                    key={player.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => onSelectPlayer(player)}
                    style={({ pressed }) => [
                      styles.playerPickerItem,
                      isSelected && styles.playerPickerItemSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <LineupJersey player={player} compact />
                    <ThemedView style={styles.playerPickerNameGroup}>
                      <ThemedText type="smallBold">
                        {formatPlayerName(player)}
                      </ThemedText>
                      <ThemedText type="code" themeColor="textSecondary">
                        {formatPlayerMeta(player)}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                );
              })
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Add players first to build a lineup.
              </ThemedText>
            )}
          </ScrollView>

          {selectedPlayer ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove player from position"
              onPress={onRemove}
              style={({ pressed }) => [
                styles.removePlayerButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={styles.removePlayerButtonText}
              >
                Remove from position
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

function LineupJersey({
  compact,
  isGoalkeeper,
  player,
  showName,
}: {
  compact?: boolean;
  isGoalkeeper?: boolean;
  player: Player;
  showName?: boolean;
}) {
  return (
    <ThemedView
      style={[styles.jerseyWrapper, compact && styles.jerseyWrapperCompact]}
    >
      <ThemedView
        style={[
          styles.jerseyShape,
          isGoalkeeper && styles.goalkeeperJerseyShape,
          compact && styles.jerseyShapeCompact,
        ]}
      >
        <ThemedView
          style={[
            styles.jerseySleeveLeft,
            isGoalkeeper && styles.goalkeeperJerseySleeve,
            compact && styles.jerseySleeveLeftCompact,
          ]}
        />
        <ThemedView
          style={[
            styles.jerseySleeveRight,
            isGoalkeeper && styles.goalkeeperJerseySleeve,
            compact && styles.jerseySleeveRightCompact,
          ]}
        />
        <ThemedView
          style={[
            styles.jerseyBody,
            isGoalkeeper && styles.goalkeeperJerseyBody,
            compact && styles.jerseyBodyCompact,
          ]}
        />
        <ThemedText
          type="smallBold"
          style={[
            styles.jerseyNumber,
            isGoalkeeper && styles.goalkeeperJerseyNumber,
            compact && styles.jerseyNumberCompact,
          ]}
        >
          {player.kitNumber ?? "-"}
        </ThemedText>
      </ThemedView>
      {!compact || showName ? (
        <ThemedText
          type="code"
          style={[styles.jerseyName, compact && styles.jerseyNameCompact]}
          numberOfLines={1}
        >
          {formatPlayerName(player)}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

function getAssignedPlayer(playerId: number | undefined, players: Player[]) {
  return playerId
    ? (players.find((player) => player.id === playerId) ?? null)
    : null;
}

function moveAssignment(
  assignments: LineupAssignments,
  fromSlotId: string,
  toSlotId: string,
) {
  const movedPlayerId = assignments[fromSlotId];

  if (!movedPlayerId || fromSlotId === toSlotId) {
    return assignments;
  }

  const replacedPlayerId = assignments[toSlotId];
  const nextAssignments = {
    ...assignments,
    [toSlotId]: movedPlayerId,
  };

  if (replacedPlayerId) {
    nextAssignments[fromSlotId] = replacedPlayerId;
  } else {
    delete nextAssignments[fromSlotId];
  }

  return nextAssignments;
}

function resetDragPosition(drag: Animated.ValueXY) {
  drag.flattenOffset();
  Animated.spring(drag, {
    toValue: { x: 0, y: 0 },
    useNativeDriver: true,
  }).start();
}

function findNearestDropTarget(
  targets: DropTarget[],
  point: PitchPoint,
  sourceSlotId: string,
) {
  const dropRadius = 72;
  let nearestTargetId: string | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const target of targets) {
    if (target.id === sourceSlotId) {
      continue;
    }

    const distance = Math.hypot(point.x - target.x, point.y - target.y);

    if (distance < nearestDistance && distance <= dropRadius) {
      nearestTargetId = target.id;
      nearestDistance = distance;
    }
  }

  return nearestTargetId;
}

function getPitchSlotCenter(slot: PitchSlot, layout: PitchLayout): PitchPoint {
  return {
    x: layout.x + getPercentageValue(slot.left) * layout.width,
    y: layout.y + getPercentageValue(slot.top) * layout.height,
  };
}

function getPercentageValue(value: `${number}%`) {
  return Number(value.replace("%", "")) / 100;
}

function offsetPercentage(value: `${number}%`, offset: number): `${number}%` {
  const nextValue = Math.min(94, Math.max(0, Number(value.replace("%", "")) + offset));
  return `${nextValue}%`;
}

function getAssignmentSlot(
  formation: MatchFormation,
  slotId: string,
): AssignmentSlot | null {
  const formationSlot = formationSlots[formation].find(
    (slot) => slot.id === slotId,
  );

  if (formationSlot) {
    return formationSlot;
  }

  return substituteSlots.find((slot) => slot.id === slotId) ?? null;
}

function formatAssignmentSlotLabel(slot: AssignmentSlot) {
  return slot.label ?? slot.id.toUpperCase();
}

function removePlayerFromAssignments(
  assignments: LineupAssignments,
  playerId: number,
) {
  return Object.fromEntries(
    Object.entries(assignments).filter(
      ([, assignedPlayerId]) => assignedPlayerId !== playerId,
    ),
  );
}

function formatPlayerMeta(player: Player) {
  const kitNumber = player.kitNumber ? `#${player.kitNumber}` : "No kit number";
  return `${kitNumber} · ${player.position}`;
}

function formatPlayerName(player: Player) {
  return player.nickName ? player.nickName : player.firstName;
}

function formatPlayerDisplayName(player: Player) {
  return [player.firstName, player.lastName].filter(Boolean).join(" ");
}

function formatPercentage(value: number | null) {
  return value === null ? "-" : `${value}%`;
}

function formatNullableNumber(value: number | null) {
  return value === null ? "-" : String(value);
}

function getMatchdayRatingPillStyle(rating: number) {
  if (rating >= 8) {
    return styles.statsPopupRatingGood;
  }

  if (rating >= 5) {
    return styles.statsPopupRatingOk;
  }

  return styles.statsPopupRatingPoor;
}

function getMatchdayRatingTextStyle(rating: number) {
  return rating >= 5 && rating < 8
    ? styles.statsPopupRatingTextDark
    : styles.statsPopupRatingTextLight;
}

function getFormationLabel(formation: MatchFormation) {
  return (
    matchFormationOptions.find((option) => option.value === formation)?.label ??
    "4-3-3"
  );
}

function normalizeMatchFormation(value: unknown): MatchFormation {
  return matchFormations.includes(value as MatchFormation)
    ? (value as MatchFormation)
    : "4-3-3";
}

function MatchTextInput({
  label,
  multiline,
  onChangeText,
  placeholder,
  required,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">
        {label}
        {required ? " *" : ""}
      </ThemedText>
      <TextInput
        autoCapitalize="sentences"
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.textInput,
          multiline && styles.multilineTextInput,
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

function MatchDatePickerField({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = parseDisplayDateToDate(value) ?? new Date();

  function handleValueChange(_: unknown, date: Date) {
    if (Platform.OS === "android") {
      setIsOpen(false);
    }

    onChange(formatDateForDisplay(date));
  }

  function handleDismiss() {
    if (Platform.OS === "android") {
      setIsOpen(false);
    }
  }

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">Date *</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open match date picker"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.pickerButton,
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
        <ThemedText type="smallBold">{value || "Choose date"}</ThemedText>
      </Pressable>

      {isOpen ? (
        <>
          <DateTimePicker
            display={Platform.OS === "ios" ? "spinner" : "calendar"}
            mode="date"
            onDismiss={handleDismiss}
            onValueChange={handleValueChange}
            value={selectedDate}
          />
          {Platform.OS === "ios" ? (
            <PickerDoneButton onPress={() => setIsOpen(false)} />
          ) : null}
        </>
      ) : null}
    </ThemedView>
  );
}

function MatchTimePickerField({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const selectedTime = parseDisplayTimeToDate(value) ?? new Date();

  function handleValueChange(_: unknown, date: Date) {
    if (Platform.OS === "android") {
      setIsOpen(false);
    }

    onChange(formatTimeForDisplay(date));
  }

  function handleDismiss() {
    if (Platform.OS === "android") {
      setIsOpen(false);
    }
  }

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">Time *</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open match time picker"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.pickerButton,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{ ios: "clock", android: "schedule", web: "schedule" }}
          tintColor={theme.text}
          size={18}
        />
        <ThemedText type="smallBold">{value || "Choose time"}</ThemedText>
      </Pressable>

      {isOpen ? (
        <>
          <DateTimePicker
            display={Platform.OS === "ios" ? "spinner" : "clock"}
            mode="time"
            onDismiss={handleDismiss}
            onValueChange={handleValueChange}
            value={selectedTime}
          />
          {Platform.OS === "ios" ? (
            <PickerDoneButton onPress={() => setIsOpen(false)} />
          ) : null}
        </>
      ) : null}
    </ThemedView>
  );
}

function MatchLocationField({
  onChange,
  value,
}: {
  onChange: (value: MatchLocation) => void;
  value: MatchLocation;
}) {
  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">Location *</ThemedText>
      <ThemedView style={styles.segmentedControl}>
        {matchLocations.map((location) => {
          const isSelected = value === location;

          return (
            <Pressable
              key={location}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(location)}
              style={({ pressed }) => [
                styles.segmentedOption,
                isSelected && styles.segmentedOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={isSelected && styles.segmentedOptionTextSelected}
              >
                {location === "home" ? "Home" : "Away"}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

function MatchCategoryField({
  onChange,
  value,
}: {
  onChange: (value: MatchCategory) => void;
  value: MatchCategory;
}) {
  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">Match type *</ThemedText>
      <ThemedView style={styles.segmentedControl}>
        {matchCategories.map((category) => {
          const isSelected = value === category;

          return (
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(category)}
              style={({ pressed }) => [
                styles.segmentedOption,
                isSelected && styles.segmentedOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={isSelected && styles.segmentedOptionTextSelected}
              >
                {getMatchCategoryLabel(category)}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

function PickerDoneButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Confirm picker value"
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

function getMatchSetupStepLabel(step: number) {
  switch (step) {
    case 0:
      return "Match details";
    case 1:
      return "Availability";
    case 2:
      return "Formation";
    default:
      return "Review";
  }
}

function initializeMatchPlayerStatuses(
  currentStatuses: Record<number, SignupStatus>,
  players: Player[],
) {
  return Object.fromEntries(
    players.map((player) => [
      player.id,
      currentStatuses[player.id] ?? "unavailable",
    ]),
  );
}

function updateMatchPlayerStatus(
  onChangeForm: Dispatch<SetStateAction<MatchSetupFormState>>,
  playerId: number,
  status: SignupStatus,
) {
  onChangeForm((currentForm) => ({
    ...currentForm,
    playerStatuses: {
      ...currentForm.playerStatuses,
      [playerId]: status,
    },
  }));
}

function getSelectedPitchPlayerCount(
  form: MatchSetupFormState,
  availablePlayers: Player[],
) {
  const selectedFormation = normalizeMatchFormation(form.formation);
  const availablePlayerIds = new Set(availablePlayers.map((player) => player.id));

  return formationSlots[selectedFormation].filter(
    (slot) => availablePlayerIds.has(form.lineupAssignments[slot.id]),
  ).length;
}

function getAssignedSubstitutes(form: MatchSetupFormState, players: Player[]) {
  return substituteSlots.flatMap((slot) => {
    const player = getAssignedPlayer(form.lineupAssignments[slot.id], players);
    return player ? [{ player, slot }] : [];
  });
}

function validateMatchSetupForm(form: MatchSetupFormState) {
  if (!form.opponent.trim()) {
    Alert.alert(
      "Opponent required",
      "Add the opponent name before continuing.",
    );
    return false;
  }

  if (!parseDisplayDateToDate(form.date)) {
    Alert.alert("Invalid date", "Use a valid date in DD-MM-YYYY format.");
    return false;
  }

  if (!parseDisplayTimeToDate(form.startTime)) {
    Alert.alert("Invalid time", "Use a valid time in HH:MM format.");
    return false;
  }

  return true;
}

function parseDisplayDateToIsoDate(value: string) {
  const date = parseDisplayDateToDate(value);

  if (!date) {
    throw new Error(`Invalid match date: ${value}`);
  }

  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatIsoDateForDisplay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return value;
  }

  return [match[3], match[2], match[1]].join("-");
}

function parseDisplayDateToDate(value: string) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());

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
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getMatchLocationLabel(location: MatchLocation) {
  return location === "home" ? "Home" : "Away";
}

function getMatchCategoryLabel(category: MatchCategory) {
  switch (category) {
    case "league":
      return "League";
    case "cup":
      return "Cup";
    case "friendly":
      return "Friendly";
  }
}

function getMatchCategoryIcon(category: MatchCategory): SymbolViewProps["name"] {
  switch (category) {
    case "league":
      return { ios: "medal.fill", android: "military_tech", web: "military_tech" };
    case "cup":
      return { ios: "trophy.fill", android: "emoji_events", web: "emoji_events" };
    case "friendly":
      return { ios: "person.2.fill", android: "groups", web: "groups" };
  }
}

function parseDisplayTimeToDate(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);

  return date;
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
    paddingTop: PageTopPadding,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.three,
    justifyContent: "space-between",
    paddingTop: PageTopPadding,
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
  addMatchButton: {
    alignItems: "center",
    backgroundColor: "#1C7C54",
    borderRadius: Spacing.three,
    flexDirection: "row",
    gap: Spacing.one,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  addMatchButtonText: {
    color: "#ffffff",
  },
  pressed: {
    opacity: 0.7,
  },
  panel: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  emptyMatchPanel: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  matchCardList: {
    gap: Spacing.three,
  },
  matchCard: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  matchCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
    minHeight: 56,
  },
  matchCardTitleGroup: {
    flex: 1,
    gap: Spacing.half,
  },
  matchTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.one,
  },
  matchTitleText: {
    flexShrink: 1,
  },
  matchCardMetaGroup: {
    alignItems: "flex-end",
    gap: Spacing.half,
  },
  matchCardDetails: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
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
    backgroundColor: ModalBackgroundColor,
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
  formContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
  availabilityStep: {
    gap: Spacing.three,
  },
  availabilityList: {
    gap: Spacing.two,
  },
  availabilityRow: {
    alignItems: "center",
    borderRadius: Spacing.two,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 64,
    padding: Spacing.two,
  },
  availabilityPlayerInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  availabilityToggle: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  availabilityOption: {
    alignItems: "center",
    borderRadius: Spacing.two,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 86,
    paddingHorizontal: Spacing.two,
  },
  availabilityOptionSelected: {
    backgroundColor: "#1C7C54",
  },
  availabilityOptionTextSelected: {
    color: "#ffffff",
  },
  formationStep: {
    gap: Spacing.one,
  },
  reviewStep: {
    gap: Spacing.three,
  },
  reviewHeader: {
    gap: Spacing.half,
  },
  reviewOpponentRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  reviewOpponent: {
    flexShrink: 1,
    lineHeight: 38,
  },
  reviewPitch: {
    aspectRatio: 1.35,
    borderRadius: Spacing.three,
    overflow: "visible",
    position: "relative",
    width: "100%",
  },
  reviewPitchImageClip: {
    borderRadius: Spacing.three,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  reviewPitchPlayer: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 68,
    justifyContent: "center",
    marginLeft: -40,
    marginTop: -34,
    position: "absolute",
    width: 80,
  },
  reviewLists: {
    gap: Spacing.three,
  },
  reviewListSection: {
    gap: Spacing.two,
  },
  reviewPlayerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  reviewPlayerRow: {
    flexBasis: "48%",
    flexDirection: "row",
    gap: Spacing.one,
    minWidth: 148,
  },
  lineupDropSurface: {
    gap: Spacing.one,
    overflow: "visible",
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
  multilineTextInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  pickerButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  pickerDoneButton: {
    alignSelf: "flex-start",
    marginTop: Spacing.two,
  },
  segmentedControl: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  segmentedOption: {
    alignItems: "center",
    borderRadius: Spacing.two,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  segmentedOptionSelected: {
    backgroundColor: "#1C7C54",
  },
  segmentedOptionTextSelected: {
    color: "#ffffff",
  },
  formationPicker: {
    gap: Spacing.two,
  },
  dropdownButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dropdownMenu: {
    borderRadius: Spacing.two,
    gap: Spacing.one,
    padding: Spacing.two,
  },
  dropdownOption: {
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  dropdownOptionSelected: {
    backgroundColor: "#1C7C54",
    borderRadius: Spacing.two,
  },
  dropdownOptionTextSelected: {
    color: "#ffffff",
  },
  pitch: {
    aspectRatio: 2 / 3,
    borderRadius: Spacing.three,
    maxHeight: 640,
    overflow: "visible",
    position: "relative",
    width: "100%",
  },
  pitchImageClip: {
    borderRadius: Spacing.three,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  pitchImage: {
    height: "100%",
    transform: [{ scale: 1.08 }],
    width: "100%",
  },
  pitchPlayersLayer: {
    backgroundColor: "transparent",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  pitchSlot: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderColor: "rgba(255, 255, 255, 0.82)",
    borderRadius: Spacing.three,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    marginLeft: -24,
    marginTop: -24,
    position: "absolute",
    width: 48,
  },
  pitchSlotAssigned: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    height: 78,
    marginLeft: -45,
    marginTop: -39,
    width: 90,
  },
  pitchSlotDragging: {
    zIndex: 10,
  },
  assignedPitchSlotButton: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  pitchSlotPlus: {
    color: "#ffffff",
    lineHeight: 28,
  },
  pitchSlotLabel: {
    color: "#ffffff",
    lineHeight: 12,
    marginTop: -Spacing.one,
  },
  substituteSection: {
    gap: Spacing.one,
    marginTop: -Spacing.half,
  },
  substituteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  substituteSlot: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.54)",
    borderRadius: Spacing.three,
    borderWidth: 1,
    height: 82,
    justifyContent: "center",
    width: 74,
  },
  substituteSlotAssigned: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  substituteSlotPlus: {
    color: "#1C7C54",
    lineHeight: 36,
  },
  playerPickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  playerPickerSheet: {
    alignSelf: "center",
    backgroundColor: ModalBackgroundColor,
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    gap: Spacing.three,
    maxHeight: "72%",
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: "100%",
  },
  floatingPlayerActions: {
    alignItems: "center",
    borderRadius: Spacing.three,
    flexDirection: "row",
    gap: Spacing.one,
    marginLeft: -70,
    marginTop: -88,
    padding: Spacing.one,
    position: "absolute",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    zIndex: 20,
  },
  playerPickerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  playerActionButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  playerActionButtonDanger: {
    backgroundColor: "#DC2626",
  },
  statsPopupOverlay: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.three,
  },
  statsPopupCard: {
    backgroundColor: ModalBackgroundColor,
    borderRadius: Spacing.three,
    gap: Spacing.three,
    maxWidth: 580,
    padding: Spacing.three,
    width: "100%",
  },
  statsPopupHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
  },
  statsPopupTitleGroup: {
    flex: 1,
  },
  statsPopupName: {
    fontSize: 48,
    fontWeight: "500",
    lineHeight: 54,
  },
  statsPopupPosition: {
    fontSize: 20,
    lineHeight: 28,
  },
  statsPopupGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  statsPopupPanel: {
    backgroundColor: "#4752A0",
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  statsPopupWidePanel: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "48%",
    minHeight: 112,
  },
  statsPopupMetricPanel: {
    alignItems: "center",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "31%",
    minHeight: 108,
  },
  statsPopupPanelTitle: {
    color: "#ffffff",
    fontSize: 24,
    lineHeight: 30,
  },
  statsPopupRatingList: {
    backgroundColor: "transparent",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  statsPopupRatingPill: {
    alignItems: "center",
    borderRadius: Spacing.two,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  statsPopupRatingGood: {
    backgroundColor: "#5ED94F",
  },
  statsPopupRatingOk: {
    backgroundColor: "#FFE05C",
  },
  statsPopupRatingPoor: {
    backgroundColor: "#DC2626",
  },
  statsPopupRatingText: {
    fontSize: 20,
    lineHeight: 24,
  },
  statsPopupRatingTextLight: {
    color: "#ffffff",
  },
  statsPopupRatingTextDark: {
    color: "#111827",
  },
  statsPopupEmptyText: {
    color: "#ffffff",
    marginTop: Spacing.two,
  },
  statsPopupLargeValue: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 42,
    marginTop: Spacing.one,
  },
  statsPopupSmallDetail: {
    color: "rgba(255, 255, 255, 0.78)",
    fontSize: 12,
    lineHeight: 16,
  },
  statsPopupMetricTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    textAlign: "center",
  },
  statsPopupMetricValue: {
    color: "#ffffff",
    fontSize: 48,
    fontWeight: "400",
    lineHeight: 56,
    textAlign: "center",
  },
  playerPickerList: {
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  playerPickerItem: {
    alignItems: "center",
    borderRadius: Spacing.two,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  playerPickerItemSelected: {
    backgroundColor: "#D8F3DC",
  },
  playerPickerNameGroup: {
    flex: 1,
    gap: Spacing.half,
  },
  jerseyWrapper: {
    alignItems: "center",
    backgroundColor: "transparent",
    gap: Spacing.half,
    width: 92,
  },
  jerseyWrapperCompact: {
    width: 68,
  },
  jerseyShape: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 50,
    justifyContent: "center",
    position: "relative",
    width: 64,
  },
  jerseyShapeCompact: {
    height: 40,
    width: 48,
  },
  goalkeeperJerseyShape: {
    backgroundColor: "transparent",
  },
  jerseyBody: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderBottomColor: "#111827",
    borderBottomWidth: 4,
    borderLeftColor: "#111827",
    borderLeftWidth: 4,
    borderRightColor: "#111827",
    borderRightWidth: 4,
    bottom: 0,
    height: 36,
    position: "absolute",
    width: 32,
  },
  jerseyBodyCompact: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    height: 27,
    width: 24,
  },
  goalkeeperJerseyBody: {
    backgroundColor: "#111827",
    borderBottomColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#ffffff",
  },
  jerseySleeveLeft: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderBottomColor: "#111827",
    borderBottomWidth: 4,
    borderLeftColor: "#111827",
    borderLeftWidth: 4,
    borderRadius: 2,
    borderTopColor: "#111827",
    borderTopWidth: 4,
    height: 24,
    left: 3,
    position: "absolute",
    top: 4,
    transform: [{ rotate: "16deg" }],
    width: 28,
  },
  jerseySleeveRight: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderBottomColor: "#111827",
    borderBottomWidth: 4,
    borderRadius: 2,
    borderRightColor: "#111827",
    borderRightWidth: 4,
    borderTopColor: "#111827",
    borderTopWidth: 4,
    height: 24,
    position: "absolute",
    right: 3,
    top: 4,
    transform: [{ rotate: "-16deg" }],
    width: 28,
  },
  jerseySleeveLeftCompact: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    height: 18,
    left: 2,
    top: 4,
    width: 21,
  },
  jerseySleeveRightCompact: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 3,
    height: 18,
    right: 2,
    top: 4,
    width: 21,
  },
  goalkeeperJerseySleeve: {
    backgroundColor: "#111827",
    borderBottomColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#ffffff",
    borderTopColor: "#ffffff",
  },
  jerseyNumber: {
    color: "#111827",
    fontSize: 22,
    lineHeight: 26,
    marginTop: 14,
    zIndex: 3,
  },
  goalkeeperJerseyNumber: {
    color: "#ffffff",
  },
  jerseyNumberCompact: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 10,
  },
  jerseyName: {
    backgroundColor: "rgba(15, 23, 42, 0.62)",
    borderRadius: Spacing.one,
    color: "#ffffff",
    maxWidth: 92,
    paddingHorizontal: Spacing.one,
    textAlign: "center",
  },
  jerseyNameCompact: {
    maxWidth: 68,
  },
  removePlayerButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#DC2626",
    borderRadius: Spacing.two,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  removePlayerButtonText: {
    color: "#ffffff",
  },
  formActions: {
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "flex-end",
  },
  reviewActions: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  reviewActionButton: {
    alignItems: "center",
    borderRadius: Spacing.three,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: Spacing.two,
  },
  reviewBackButton: {
    backgroundColor: "#7A7A7A",
  },
  reviewShareButton: {
    backgroundColor: "#FF7A1A",
  },
  reviewSaveButton: {
    backgroundColor: "#536DFE",
  },
  reviewActionText: {
    color: "#ffffff",
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1C7C54",
    borderRadius: Spacing.two,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  primaryButtonText: {
    color: "#ffffff",
  },
});
