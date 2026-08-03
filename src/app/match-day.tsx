import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
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
  type StyleProp,
  StyleSheet,
  TextInput,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Image as SvgImage,
  Text as SvgText,
} from "react-native-svg";

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
  deleteMatchDayMatchAsync,
  listMatchDayMatchesAsync,
  updateMatchDayMatchAsync,
  updateMatchDayMatchResultAsync,
} from "@/features/match-day/match-day-repository";
import type {
  MatchDayCategory,
  MatchDayLocation,
  MatchDayMatch,
  MatchPlayerResultAttendance,
  MatchPlayerResultCard,
  MatchPlayerResultStat,
  MatchPlayerResultStats,
  UpdateMatchDayMatchResultInput,
} from "@/features/match-day/match-day-types";
import { listPlayerAttendanceStatsAsync } from "@/features/player-stats/player-stats-repository";
import type { PlayerAttendanceStats } from "@/features/player-stats/player-stats-types";
import { getPlayerPositionLabel } from "@/features/players/player-position-labels";
import { listPlayersAsync } from "@/features/players/player-repository";
import type { Player } from "@/features/players/player-types";
import { getTeamSettingsAsync } from "@/features/settings/team-settings-repository";
import type { TeamSettings } from "@/features/settings/team-settings-types";
import {
  type ShareBackgroundTemplateId,
  shareBackgroundTemplates,
} from "@/features/share/share-background-templates";
import { shareLineupFormationSlots } from "@/features/share/share-lineup-formations";
import {
  defaultSharePosterPositionsByOverlayStyle,
  type SharePosterOverlayStyle,
  sharePosterOverlayStyleOptions,
  type SharePosterTextPieceId,
  sharePosterTextPieces,
} from "@/features/share/share-poster-overlays";
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
  venue: string;
  category: MatchCategory;
  formation: MatchFormation;
  notes: string;
  captainPlayerId: number | null;
  matchDutyPlayerIds: number[];
  playerStatuses: Record<number, SignupStatus>;
  lineupAssignments: LineupAssignments;
};
type MatchResultFormState = Omit<
  UpdateMatchDayMatchResultInput,
  "id" | "matchDurationMinutes"
>;
type MatchResultSquadEntry = {
  player: Player;
  role: "starter" | "substitute";
};
type JerseyResultBadges = {
  assists: number;
  card: MatchPlayerResultCard;
  goals: number;
  subDirection: "on" | "off" | null;
};
type SharePreviewState = {
  form: MatchSetupFormState;
  opponentScore?: number;
  ownScore?: number;
  playerResultStats?: MatchPlayerResultStats;
  playerRoleById?: Map<number, MatchResultSquadEntry["role"]>;
  players: Player[];
};
type LineupKitSettings = Pick<
  TeamSettings,
  | "kitDesign"
  | "outfieldKitColor"
  | "secondaryKitColor"
  | "sashAccentKitColor"
  | "kitNumberColor"
  | "goalkeeperKitColor"
>;
type PosterColorSettings = {
  titlePanelColor: string;
  valuePanelColor: string;
  infoPanelColor: string;
  titleTextColor: string;
  valueTextColor: string;
  infoTextColor: string;
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
const defaultLineupKitSettings: LineupKitSettings = {
  kitDesign: "solid",
  outfieldKitColor: "#FFFFFF",
  secondaryKitColor: "#536DFE",
  sashAccentKitColor: "#EF4444",
  kitNumberColor: "#111827",
  goalkeeperKitColor: "#111827",
};
const defaultTeamName = "Your team";
const defaultMatchDurationMinutes = 90;
const assistantCoachLogo = require("@/assets/images/match-day/assistant-coach-logo.png");
const sharePosterColorOptions = [
  "#FFFFFF",
  "#111827",
  "#1C7C54",
  "#536DFE",
  "#9333EA",
  "#38BDF8",
  "#FF7A1A",
  "#EF4444",
  "#7F1D1D",
  "#FACC15",
] as const;
const kitShirtPath =
  "M34 7 C38 11 62 11 66 7 L76 7 L95 25 Q98 27 96 31 L87 47 Q85 51 81 49 L73 44 L73 83 Q73 87 69 87 L31 87 Q27 87 27 83 L27 44 L19 49 Q15 51 13 47 L4 31 Q2 27 5 25 L24 7 Z";

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
    createPitchSlot(1, "18%", "24%"),
    createPitchSlot(2, "16%", "50%"),
    createPitchSlot(3, "18%", "76%"),
    createPitchSlot(4, "44%", "30%"),
    createPitchSlot(5, "42%", "50%"),
    createPitchSlot(6, "44%", "70%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "4-3-3 attacking": [
    createPitchSlot(1, "18%", "24%"),
    createPitchSlot(2, "14%", "50%"),
    createPitchSlot(3, "18%", "76%"),
    createPitchSlot(4, "46%", "32%"),
    createPitchSlot(5, "34%", "50%"),
    createPitchSlot(6, "46%", "68%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "4-3-3 defensive": [
    createPitchSlot(1, "18%", "24%"),
    createPitchSlot(2, "16%", "50%"),
    createPitchSlot(3, "18%", "76%"),
    createPitchSlot(4, "42%", "30%"),
    createPitchSlot(5, "56%", "50%"),
    createPitchSlot(6, "42%", "70%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "4-4-2": [
    createPitchSlot(1, "18%", "38%"),
    createPitchSlot(2, "18%", "62%"),
    createPitchSlot(3, "46%", "18%"),
    createPitchSlot(4, "46%", "38%"),
    createPitchSlot(5, "46%", "62%"),
    createPitchSlot(6, "46%", "82%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "3-5-2": [
    createPitchSlot(1, "18%", "38%"),
    createPitchSlot(2, "18%", "62%"),
    createPitchSlot(3, "45%", "14%"),
    createPitchSlot(4, "45%", "32%"),
    createPitchSlot(5, "43%", "50%"),
    createPitchSlot(6, "45%", "68%"),
    createPitchSlot(7, "45%", "86%"),
    createPitchSlot(8, "71%", "28%"),
    createPitchSlot(9, "72%", "50%"),
    createPitchSlot(10, "71%", "72%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "5-3-2": [
    createPitchSlot(1, "18%", "38%"),
    createPitchSlot(2, "18%", "62%"),
    createPitchSlot(3, "44%", "30%"),
    createPitchSlot(4, "42%", "50%"),
    createPitchSlot(5, "44%", "70%"),
    createPitchSlot(6, "69%", "10%"),
    createPitchSlot(7, "71%", "30%"),
    createPitchSlot(8, "72%", "50%"),
    createPitchSlot(9, "71%", "70%"),
    createPitchSlot(10, "69%", "90%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "4-2-3-1": [
    createPitchSlot(1, "14%", "50%"),
    createPitchSlot(2, "35%", "24%"),
    createPitchSlot(3, "33%", "50%"),
    createPitchSlot(4, "35%", "76%"),
    createPitchSlot(5, "54%", "38%"),
    createPitchSlot(6, "54%", "62%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "4-1-2-1-2": [
    createPitchSlot(1, "15%", "38%"),
    createPitchSlot(2, "15%", "62%"),
    createPitchSlot(3, "33%", "50%"),
    createPitchSlot(4, "48%", "34%"),
    createPitchSlot(5, "48%", "66%"),
    createPitchSlot(6, "60%", "50%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "4-3-1-2": [
    createPitchSlot(1, "15%", "38%"),
    createPitchSlot(2, "15%", "62%"),
    createPitchSlot(3, "35%", "50%"),
    createPitchSlot(4, "50%", "28%"),
    createPitchSlot(5, "52%", "50%"),
    createPitchSlot(6, "50%", "72%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "4-1-3-2": [
    createPitchSlot(1, "18%", "38%"),
    createPitchSlot(2, "18%", "62%"),
    createPitchSlot(3, "44%", "24%"),
    createPitchSlot(4, "43%", "50%"),
    createPitchSlot(5, "44%", "76%"),
    createPitchSlot(6, "60%", "50%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
} satisfies Record<MatchFormation, PitchSlot[]>;

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
  const [kitSettings, setKitSettings] = useState<LineupKitSettings>(
    defaultLineupKitSettings,
  );
  const [teamName, setTeamName] = useState(defaultTeamName);
  const [clubLocation, setClubLocation] = useState("");
  const [preferNicknames, setPreferNicknames] = useState(true);
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
  });
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
      const [nextMatches, nextPlayers, nextSettings] = await Promise.all([
        listMatchDayMatchesAsync(),
        listPlayersAsync(),
        getTeamSettingsAsync(),
      ]);
      setMatches(nextMatches);
      setOverviewPlayers(nextPlayers);
      setKitSettings(nextSettings ?? defaultLineupKitSettings);
      setTeamName(nextSettings?.teamName.trim() || defaultTeamName);
      setClubLocation(nextSettings?.clubLocation ?? "");
      setPreferNicknames(nextSettings?.preferNicknames ?? true);
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
      getTeamSettingsAsync(),
    ])
      .then(([nextMatches, nextPlayers, nextSettings]) => {
        if (isMounted) {
          setMatches(nextMatches);
          setOverviewPlayers(nextPlayers);
          setKitSettings(nextSettings ?? defaultLineupKitSettings);
          setTeamName(nextSettings?.teamName.trim() || defaultTeamName);
          setClubLocation(nextSettings?.clubLocation ?? "");
          setPreferNicknames(nextSettings?.preferNicknames ?? true);
          setMatchDurationMinutes(
            nextSettings?.matchDurationMinutes ?? defaultMatchDurationMinutes,
          );
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

  useFocusEffect(
    useCallback(() => {
      let isFocused = true;

      getTeamSettingsAsync()
        .then((nextSettings) => {
          if (isFocused) {
            setKitSettings(nextSettings ?? defaultLineupKitSettings);
            setTeamName(nextSettings?.teamName.trim() || defaultTeamName);
            setClubLocation(nextSettings?.clubLocation ?? "");
            setPreferNicknames(nextSettings?.preferNicknames ?? true);
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
    const squadEntries = getMatchResultSquadEntries(match, overviewPlayers);

    setResultMatchId(match.id);
    setMatchResultForm({
      ownScore: match.ownScore ?? 0,
      opponentScore: match.opponentScore ?? 0,
      resultNotes: match.resultNotes,
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
    const squadEntries = getMatchResultSquadEntries(match, overviewPlayers);
    const playerRoleById = new Map(
      squadEntries.map((entry) => [entry.player.id, entry.role]),
    );

    setSharePreview({
      form: createMatchSetupFormStateFromMatch(match),
      opponentScore: match.opponentScore ?? undefined,
      ownScore: match.ownScore ?? undefined,
      playerResultStats: hasMatchResult(match)
        ? match.playerResultStats
        : undefined,
      playerRoleById,
      players: overviewPlayers,
    });
  }

  async function handleSaveResult() {
    if (!resultMatchId) {
      return;
    }

    const resultMatch =
      matches.find((match) => match.id === resultMatchId) ?? null;
    const squadEntries = getMatchResultSquadEntries(
      resultMatch,
      overviewPlayers,
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
      setExpandedMatchId(resultMatchId);
      setResultMatchId(null);
      await loadMatches();
    } catch (error) {
      console.warn("Failed to save match result", error);
      Alert.alert("Could not save result", "Please try again.");
    }
  }

  async function handleSaveMatch() {
    if (!validateMatchSetupForm(matchSetupForm)) {
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
        matchDutyPlayerIds: matchSetupForm.matchDutyPlayerIds,
        playerStatuses: matchSetupForm.playerStatuses,
        lineupAssignments: matchSetupForm.lineupAssignments,
      };

      if (editingMatchId) {
        await updateMatchDayMatchAsync({
          ...matchInput,
          id: editingMatchId,
        });
        setExpandedMatchId(editingMatchId);
      } else {
        await createMatchDayMatchAsync(matchInput);
      }

      await loadMatches();
      setMatchSetupForm(createEmptyMatchSetupFormState(clubLocation));
      setEditingMatchId(null);
      setIsMatchSetupOpen(false);
    } catch (error) {
      console.warn("Failed to save match", error);
      Alert.alert(
        "Could not save match",
        "Please check the match details and try again.",
      );
    }
  }

  function confirmDeleteMatch(match: MatchDayMatch) {
    Alert.alert(
      "Delete match?",
      `This will permanently delete the saved match against ${match.opponent}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
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
                Add match
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
        mode={editingMatchId ? "edit" : "create"}
        preferNicknames={preferNicknames}
        visible={isMatchSetupOpen}
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
                overviewPlayers,
              )
            : []
        }
        visible={resultMatchId !== null}
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
        onClose={() => setSharePreview(null)}
      />
    </>
  );
}

function MatchResultModal({
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
  onSave: () => Promise<void> | void;
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
  const theme = useTheme();
  const [wizardStep, setWizardStep] = useState(0);
  const resultLabel = getResultLabel(form.ownScore, form.opponentScore);

  function handleClose() {
    setWizardStep(0);
    onClose();
  }

  async function handleSave() {
    setWizardStep(0);
    await onSave();
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
              <ThemedText type="default">Match result</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Step {wizardStep + 1} of 3:{" "}
                {getMatchResultStepLabel(wizardStep)}
              </ThemedText>
            </ThemedView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close match result"
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
                opponent={match?.opponent ?? "Opponent"}
                resultLabel={resultLabel}
                teamName={teamName}
                onChangeForm={onChangeForm}
              />
            ) : wizardStep === 1 ? (
              <MatchResultPlayerStep
                form={form}
                matchDurationMinutes={matchDurationMinutes}
                preferNicknames={preferNicknames}
                squadEntries={squadEntries}
                teamName={teamName}
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
                <ThemedText type="smallBold" style={styles.reviewActionText}>
                  Back
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (match) {
                    onShare(match, form, squadEntries);
                  }
                }}
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
                onPress={handleSave}
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
                onPress={() => setWizardStep((currentStep) => currentStep + 1)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  Next
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MatchResultScoreStep({
  form,
  onChangeForm,
  opponent,
  resultLabel,
  teamName,
}: {
  form: MatchResultFormState;
  onChangeForm: Dispatch<SetStateAction<MatchResultFormState>>;
  opponent: string;
  resultLabel: string;
  teamName: string;
}) {
  return (
    <ThemedView style={styles.resultStep}>
      <ThemedView style={styles.scoreboard}>
        <ThemedView style={styles.scoreTeam}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {teamName}
          </ThemedText>
          <ScoreStepper
            accessibilityLabel={`${teamName} score`}
            value={form.ownScore}
            onChange={(ownScore) =>
              onChangeForm((currentForm) => ({
                ...currentForm,
                ownScore,
              }))
            }
          />
        </ThemedView>

        <ThemedText type="subtitle" style={styles.scoreDivider}>
          -
        </ThemedText>

        <ThemedView style={styles.scoreTeam}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {opponent}
          </ThemedText>
          <ScoreStepper
            accessibilityLabel="Opponent score"
            value={form.opponentScore}
            onChange={(opponentScore) =>
              onChangeForm((currentForm) => ({
                ...currentForm,
                opponentScore,
              }))
            }
          />
        </ThemedView>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.resultSummary}>
        <ThemedText type="code" themeColor="textSecondary">
          Result
        </ThemedText>
        <ThemedText type="smallBold">{resultLabel}</ThemedText>
      </ThemedView>

      <MatchTextInput
        label="Result notes"
        multiline
        value={form.resultNotes}
        onChangeText={(resultNotes) =>
          onChangeForm((currentForm) => ({
            ...currentForm,
            resultNotes,
          }))
        }
      />
    </ThemedView>
  );
}

function MatchResultPlayerStep({
  form,
  matchDurationMinutes,
  onChangeForm,
  preferNicknames,
  squadEntries,
  teamName,
}: {
  form: MatchResultFormState;
  matchDurationMinutes: number;
  onChangeForm: Dispatch<SetStateAction<MatchResultFormState>>;
  preferNicknames: boolean;
  squadEntries: MatchResultSquadEntry[];
  teamName: string;
}) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(
    squadEntries[0]?.player.id ?? null,
  );
  const availablePlayerIds = new Set(
    squadEntries.map((entry) => entry.player.id),
  );
  const effectiveExpandedPlayerId =
    expandedPlayerId !== null && availablePlayerIds.has(expandedPlayerId)
      ? expandedPlayerId
      : (squadEntries[0]?.player.id ?? null);

  function updatePlayerStat(
    playerId: number,
    role: MatchResultSquadEntry["role"],
    update: (currentStat: MatchPlayerResultStat) => MatchPlayerResultStat,
  ) {
    onChangeForm((currentForm) => {
      const currentStat =
        currentForm.playerResultStats[playerId] ??
        createDefaultMatchPlayerResultStat(role, matchDurationMinutes);
      const nextStat = normalizeMatchPlayerResultStat(
        update(currentStat),
        role,
        matchDurationMinutes,
      );

      return {
        ...currentForm,
        playerResultStats: {
          ...currentForm.playerResultStats,
          [playerId]: nextStat,
        },
      };
    });
  }

  return (
    <ThemedView style={styles.playerPerformanceStep}>
      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">Player performance</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Starters default to {matchDurationMinutes} minutes and substitutes
          default to 0. Player goals cannot exceed the {teamName} score.
        </ThemedText>
      </ThemedView>

      {squadEntries.length > 0 ? (
        <ThemedView style={styles.playerPerformanceList}>
          {squadEntries.map((entry) => {
            const stat =
              form.playerResultStats[entry.player.id] ??
              createDefaultMatchPlayerResultStat(
                entry.role,
                matchDurationMinutes,
              );
            const isExpanded = effectiveExpandedPlayerId === entry.player.id;
            const maxGoalsForPlayer = getMaxGoalsForPlayer(
              entry.player.id,
              stat.goals,
              form.playerResultStats,
              squadEntries,
              form.ownScore,
            );
            const maxAssistsForPlayer = getMaxAssistsForPlayer(
              entry.player.id,
              stat.assists,
              form.playerResultStats,
              squadEntries,
              form.ownScore,
            );

            return (
              <PlayerPerformanceCard
                key={entry.player.id}
                isExpanded={isExpanded}
                maxAssists={maxAssistsForPlayer}
                maxGoals={maxGoalsForPlayer}
                player={entry.player}
                preferNicknames={preferNicknames}
                role={entry.role}
                stat={stat}
                teamScore={form.ownScore}
                matchDurationMinutes={matchDurationMinutes}
                onChange={(update) =>
                  updatePlayerStat(entry.player.id, entry.role, update)
                }
                onToggle={() =>
                  setExpandedPlayerId((currentPlayerId) =>
                    currentPlayerId === entry.player.id
                      ? null
                      : entry.player.id,
                  )
                }
              />
            );
          })}
        </ThemedView>
      ) : (
        <ThemedView type="backgroundElement" style={styles.resultSummary}>
          <ThemedText type="small" themeColor="textSecondary">
            Add players to the lineup before logging player performance.
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

function MatchResultReviewStep({
  form,
  kitSettings,
  matchDurationMinutes,
  match,
  preferNicknames,
  squadEntries,
  teamName,
}: {
  form: MatchResultFormState;
  kitSettings: LineupKitSettings;
  matchDurationMinutes: number;
  match: MatchDayMatch | null;
  preferNicknames: boolean;
  squadEntries: MatchResultSquadEntry[];
  teamName: string;
}) {
  if (!match) {
    return (
      <ThemedView type="backgroundElement" style={styles.resultSummary}>
        <ThemedText type="small" themeColor="textSecondary">
          Select a match before reviewing the result.
        </ThemedText>
      </ThemedView>
    );
  }

  const matchForm = createMatchSetupFormStateFromMatch(match);
  const players = squadEntries.map((entry) => entry.player);
  const substitutes = getAssignedSubstitutes(matchForm, players);
  const playerRoleById = new Map(
    squadEntries.map((entry) => [entry.player.id, entry.role]),
  );

  return (
    <ThemedView style={styles.resultReviewStep}>
      <ThemedView style={styles.reviewHeader}>
        <ThemedView style={styles.reviewOpponentRow}>
          <ThemedText type="subtitle" style={styles.reviewOpponent}>
            {match.opponent}
          </ThemedText>
          <MatchCategoryIcon category={match.category} size={26} />
        </ThemedView>
        <ThemedText type="default">
          {teamName} {form.ownScore} - {form.opponentScore} {match.opponent}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatIsoDateForDisplay(match.matchDate)} at {match.startTime}
        </ThemedText>
      </ThemedView>

      <ReviewPitch
        form={matchForm}
        kitSettings={kitSettings}
        matchDurationMinutes={matchDurationMinutes}
        playerResultStats={form.playerResultStats}
        playerRoleById={playerRoleById}
        players={players}
        preferNicknames={preferNicknames}
      />

      {substitutes.length > 0 ? (
        <ThemedView style={styles.reviewListSection}>
          <ThemedText type="default">Substitutes</ThemedText>
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
                  isCaptain={player.id === match.captainPlayerId}
                  kitSettings={kitSettings}
                  player={player}
                  preferNicknames={preferNicknames}
                  resultBadges={getJerseyResultBadges(
                    form.playerResultStats[player.id],
                    "substitute",
                    matchDurationMinutes,
                  )}
                  showName
                />
              </ThemedView>
            ))}
          </ThemedView>
        </ThemedView>
      ) : null}

      {form.resultNotes.trim() ? (
        <ThemedView type="backgroundElement" style={styles.resultSummary}>
          <ThemedText type="code" themeColor="textSecondary">
            Notes
          </ThemedText>
          <ThemedText type="small">{form.resultNotes.trim()}</ThemedText>
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

function PlayerPerformanceCard({
  isExpanded,
  matchDurationMinutes,
  maxAssists,
  maxGoals,
  onChange,
  onToggle,
  player,
  preferNicknames,
  role,
  stat,
  teamScore,
}: {
  isExpanded: boolean;
  matchDurationMinutes: number;
  maxAssists: number;
  maxGoals: number;
  onChange: (
    update: (currentStat: MatchPlayerResultStat) => MatchPlayerResultStat,
  ) => void;
  onToggle: () => void;
  player: Player;
  preferNicknames: boolean;
  role: MatchResultSquadEntry["role"];
  stat: MatchPlayerResultStat;
  teamScore: number;
}) {
  const isStarter = role === "starter";

  return (
    <ThemedView type="backgroundElement" style={styles.playerPerformanceCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.playerPerformanceHeader,
          pressed && styles.pressed,
        ]}
      >
        <ThemedView style={styles.playerPerformanceTitleGroup}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {formatPlayerName(player, preferNicknames)}
          </ThemedText>
          <ThemedText type="code" themeColor="textSecondary">
            {isStarter ? "Starter" : "Substitute"}
          </ThemedText>
        </ThemedView>
        <ThemedText type="code" themeColor="textSecondary">
          {stat.minutesPlayed} min · {stat.goals}G · {stat.assists}A ·{" "}
          {stat.rating} · {getAttendanceLabel(stat.attendance)}
          {stat.card === "none" ? "" : ` · ${getCardLabel(stat.card)}`}
        </ThemedText>
      </Pressable>

      {isExpanded ? (
        <ThemedView style={styles.playerPerformanceControls}>
          <ThemedView style={styles.performanceControlRow}>
            <StatStepper
              label="Goals"
              max={maxGoals}
              maxWarning={`You've already added ${teamScore} goals scored!`}
              value={stat.goals}
              onChange={(goals) =>
                onChange((currentStat) => ({ ...currentStat, goals }))
              }
            />
            <StatStepper
              label="Assists"
              max={maxAssists}
              maxWarning={`You've already added ${teamScore} goals scored!`}
              value={stat.assists}
              onChange={(assists) =>
                onChange((currentStat) => ({ ...currentStat, assists }))
              }
            />
            <StatStepper
              label="Rating"
              max={10}
              min={1}
              value={stat.rating}
              onChange={(rating) =>
                onChange((currentStat) => ({ ...currentStat, rating }))
              }
            />
          </ThemedView>

          <NumericStepperInput
            label="Minutes played"
            max={matchDurationMinutes}
            value={stat.minutesPlayed}
            onChange={(minutesPlayed) =>
              onChange((currentStat) => ({
                ...clearSubstitutionMinutes(currentStat),
                minutesPlayed,
              }))
            }
          />

          <ResultSegmentedField
            label="Attendance"
            options={[
              { label: "Present", value: "present" },
              { label: "Late", value: "late" },
              { label: "No-show", value: "no-show" },
            ]}
            value={stat.attendance}
            onChange={(attendance) =>
              onChange((currentStat) => ({
                ...currentStat,
                attendance,
                minutesPlayed:
                  attendance === "no-show"
                    ? 0
                    : currentStat.attendance === "no-show"
                      ? getRestoredAttendanceMinutes(role, matchDurationMinutes)
                      : currentStat.minutesPlayed,
              }))
            }
          />

          <ResultSegmentedField
            label="Card"
            options={[
              { label: "None", value: "none" },
              { label: "Yellow", value: "yellow" },
              { label: "Red", value: "red" },
            ]}
            value={stat.card}
            onChange={(card) =>
              onChange((currentStat) => ({ ...currentStat, card }))
            }
          />
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

function NumericStepperInput({
  label,
  max,
  min = 0,
  onChange,
  value,
}: {
  label: string;
  max: number;
  min?: number;
  onChange: (value: number) => void;
  value: number;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.numericStepperGroup}>
      <ThemedText type="code" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedView style={styles.numericStepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => onChange(clampNumber(value - 1, min, max))}
          style={({ pressed }) => [
            styles.statStepperButton,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ ios: "minus", android: "remove", web: "remove" }}
            tintColor="#ffffff"
            size={14}
          />
        </Pressable>

        <TextInput
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={3}
          onChangeText={(nextValue) =>
            onChange(parseNumericInputValue(nextValue, min, max))
          }
          selectTextOnFocus
          style={[
            styles.numericStepperInput,
            {
              color: theme.text,
            },
          ]}
          value={String(value)}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => onChange(clampNumber(value + 1, min, max))}
          style={({ pressed }) => [
            styles.statStepperButton,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ ios: "plus", android: "add", web: "add" }}
            tintColor="#ffffff"
            size={14}
          />
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

function StatStepper({
  label,
  max,
  maxWarning,
  min = 0,
  onChange,
  value,
}: {
  label: string;
  max?: number;
  maxWarning?: string;
  min?: number;
  onChange: (value: number) => void;
  value: number;
}) {
  function handleIncrease() {
    if (max !== undefined && value >= max) {
      if (maxWarning) {
        Alert.alert("Limit reached", maxWarning);
      }
      return;
    }

    onChange(max === undefined ? value + 1 : Math.min(max, value + 1));
  }

  return (
    <ThemedView style={styles.statStepperGroup}>
      <ThemedText type="code" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedView style={styles.statStepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => onChange(Math.max(min, value - 1))}
          style={({ pressed }) => [
            styles.statStepperButton,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ ios: "minus", android: "remove", web: "remove" }}
            tintColor="#ffffff"
            size={14}
          />
        </Pressable>
        <ThemedText type="smallBold" style={styles.statStepperValue}>
          {value}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={handleIncrease}
          style={({ pressed }) => [
            styles.statStepperButton,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ ios: "plus", android: "add", web: "add" }}
            tintColor="#ffffff"
            size={14}
          />
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

function ResultSegmentedField<TValue extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: TValue) => void;
  options: { label: string; value: TValue }[];
  value: TValue;
}) {
  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="code" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedView style={styles.resultSegmentedControl}>
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.resultSegmentedOption,
                isSelected && styles.resultSegmentedOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={isSelected && styles.resultSegmentedOptionTextSelected}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

function ScoreStepper({
  accessibilityLabel,
  onChange,
  value,
}: {
  accessibilityLabel: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <ThemedView style={styles.scoreStepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${accessibilityLabel}`}
        onPress={() => onChange(Math.max(0, value - 1))}
        style={({ pressed }) => [
          styles.scoreStepperButton,
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{ ios: "minus", android: "remove", web: "remove" }}
          tintColor="#ffffff"
          size={18}
        />
      </Pressable>

      <ThemedText type="title" style={styles.scoreValue}>
        {value}
      </ThemedText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${accessibilityLabel}`}
        onPress={() => onChange(value + 1)}
        style={({ pressed }) => [
          styles.scoreStepperButton,
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{ ios: "plus", android: "add", web: "add" }}
          tintColor="#ffffff"
          size={18}
        />
      </Pressable>
    </ThemedView>
  );
}

function MatchSetupModal({
  clubLocation,
  form,
  kitSettings,
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
  kitSettings: LineupKitSettings;
  mode: "create" | "edit";
  onChangeForm: Dispatch<SetStateAction<MatchSetupFormState>>;
  onClose: () => void;
  onContinue: () => Promise<void> | void;
  onShare: (form: MatchSetupFormState, players: Player[]) => void;
  preferNicknames: boolean;
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
              <ThemedText type="default">
                {mode === "edit" ? "Edit match" : "Add match"}
              </ThemedText>
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
              <MatchDetailsStep
                clubLocation={clubLocation}
                form={form}
                onChangeForm={onChangeForm}
              />
            ) : wizardStep === 1 ? (
              <MatchAvailabilityStep
                form={form}
                players={players}
                onChangeForm={onChangeForm}
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
                <ThemedText type="smallBold" style={styles.reviewActionText}>
                  Back
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
                  {mode === "edit" ? "Update" : "Save"}
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
  const [isUnfinishedSectionOpen, setIsUnfinishedSectionOpen] = useState(true);

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

  const unfinishedMatches = matches.filter((match) => !hasMatchResult(match));
  const completedMatches = matches.filter(hasMatchResult);

  function renderMatchCard(match: MatchDayMatch) {
    const isExpanded = expandedMatchId === match.id;
    const isResultActionDue = isMatchResultActionDue(match);
    const matchForm = createMatchSetupFormStateFromMatch(match);
    const resultSquadEntries = getMatchResultSquadEntries(match, players);
    const playerRoleById = new Map(
      resultSquadEntries.map((entry) => [entry.player.id, entry.role]),
    );

    return (
      <ThemedView
        key={match.id}
        type="backgroundElement"
        style={styles.matchCard}
      >
        {isResultActionDue ? (
          <ThemedView style={styles.matchActionDueDot} />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          onPress={() => onToggleMatch(match.id)}
          style={({ pressed }) => [
            styles.matchCardHeader,
            pressed && styles.pressed,
          ]}
        >
          <ThemedView
            type="backgroundElement"
            style={styles.matchCardTitleGroup}
          >
            <ThemedView type="backgroundElement" style={styles.matchTitleRow}>
              <ThemedText
                type="smallBold"
                numberOfLines={1}
                style={styles.matchTitleText}
              >
                {match.opponent}
              </ThemedText>
              <MatchCategoryIcon category={match.category} size={16} />
            </ThemedView>
            <ThemedText type="code" themeColor="textSecondary">
              {formatIsoDateForDisplay(match.matchDate)} at {match.startTime}
            </ThemedText>
            {hasMatchResult(match) ? (
              <ThemedText type="smallBold">
                {teamName} {match.ownScore} - {match.opponentScore}{" "}
                {match.opponent}
              </ThemedText>
            ) : null}
          </ThemedView>
          <ThemedView
            type="backgroundElement"
            style={styles.matchCardMetaGroup}
          >
            <ThemedText type="code" themeColor="textSecondary">
              {getMatchLocationLabel(match.location)}
            </ThemedText>
            <SymbolView
              name={{
                ios: isExpanded ? "chevron.up" : "chevron.down",
                android: isExpanded
                  ? "keyboard_arrow_up"
                  : "keyboard_arrow_down",
                web: isExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down",
              }}
              size={18}
            />
          </ThemedView>
        </Pressable>

        {isExpanded ? (
          <ThemedView type="backgroundElement" style={styles.matchCardDetails}>
            <MatchReviewStep
              form={matchForm}
              kitSettings={kitSettings}
              matchDurationMinutes={matchDurationMinutes}
              playerResultStats={
                hasMatchResult(match) ? match.playerResultStats : undefined
              }
              playerRoleById={playerRoleById}
              players={players}
              preferNicknames={preferNicknames}
            />
            {hasMatchResult(match) ? (
              <ThemedView
                type="backgroundElement"
                style={styles.matchResultPanel}
              >
                <ThemedText type="default">Result</ThemedText>
                <ThemedText type="subtitle" style={styles.matchResultScore}>
                  {teamName} {match.ownScore} - {match.opponentScore}{" "}
                  {match.opponent}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {Object.keys(match.playerResultStats).length} player stats
                  logged
                </ThemedText>
                {match.resultNotes.trim() ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {match.resultNotes.trim()}
                  </ThemedText>
                ) : null}
              </ThemedView>
            ) : null}
            <ThemedView
              type="backgroundElement"
              style={styles.matchCardActions}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Share match against ${match.opponent}`}
                onPress={() => onShareMatch(match)}
                style={({ pressed }) => [
                  styles.shareMatchButton,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{
                    ios: "square.and.arrow.up",
                    android: "share",
                    web: "share",
                  }}
                  tintColor="#ffffff"
                  size={16}
                />
                <ThemedText
                  type="smallBold"
                  style={styles.shareMatchButtonText}
                >
                  Share
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${hasMatchResult(match) ? "Edit" : "Add"} result for ${match.opponent}`}
                onPress={() => onEditResult(match)}
                style={({ pressed }) => [
                  styles.resultMatchButton,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{
                    ios: "number",
                    android: "scoreboard",
                    web: "scoreboard",
                  }}
                  tintColor="#ffffff"
                  size={16}
                />
                <ThemedText
                  type="smallBold"
                  style={styles.resultMatchButtonText}
                >
                  {hasMatchResult(match) ? "Edit result" : "Add result"}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit match against ${match.opponent}`}
                onPress={() => onEditMatch(match)}
                style={({ pressed }) => [
                  styles.editMatchButton,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: "pencil", android: "edit", web: "edit" }}
                  tintColor="#ffffff"
                  size={16}
                />
                <ThemedText type="smallBold" style={styles.editMatchButtonText}>
                  Edit match
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete match against ${match.opponent}`}
                onPress={() => onDeleteMatch(match)}
                style={({ pressed }) => [
                  styles.deleteMatchButton,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: "trash", android: "delete", web: "delete" }}
                  tintColor="#ffffff"
                  size={16}
                />
                <ThemedText
                  type="smallBold"
                  style={styles.deleteMatchButtonText}
                >
                  Delete match
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        ) : null}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.matchCardList}>
      {unfinishedMatches.length > 0 ? (
        <ThemedView style={styles.matchSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isUnfinishedSectionOpen }}
            onPress={() =>
              setIsUnfinishedSectionOpen((isSectionOpen) => !isSectionOpen)
            }
            style={({ pressed }) => [
              styles.matchSectionHeader,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold" themeColor="textSecondary">
              Unfinished matches
            </ThemedText>
            <SymbolView
              name={{
                ios: isUnfinishedSectionOpen ? "chevron.up" : "chevron.down",
                android: isUnfinishedSectionOpen
                  ? "keyboard_arrow_up"
                  : "keyboard_arrow_down",
                web: isUnfinishedSectionOpen
                  ? "keyboard_arrow_up"
                  : "keyboard_arrow_down",
              }}
              size={18}
            />
          </Pressable>

          {isUnfinishedSectionOpen ? (
            <ThemedView style={styles.matchSectionList}>
              {unfinishedMatches.map(renderMatchCard)}
            </ThemedView>
          ) : null}
        </ThemedView>
      ) : null}

      {completedMatches.length > 0 ? (
        <ThemedView style={styles.matchSectionList}>
          {unfinishedMatches.length > 0 ? (
            <ThemedText type="smallBold" themeColor="textSecondary">
              Completed matches
            </ThemedText>
          ) : null}
          {completedMatches.map(renderMatchCard)}
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

function MatchDetailsStep({
  clubLocation,
  form,
  onChangeForm,
}: {
  clubLocation: string;
  form: MatchSetupFormState;
  onChangeForm: (form: MatchSetupFormState) => void;
}) {
  function handleLocationChange(location: MatchLocation) {
    onChangeForm({
      ...form,
      location,
      venue: location === "home" ? clubLocation : "",
    });
  }

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
        onChange={handleLocationChange}
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
  const availablePlayers = players.filter(
    (player) => form.playerStatuses[player.id] === "available",
  );

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
            const status = form.playerStatuses[player.id] ?? "available";

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

      <ThemedView type="backgroundElement" style={styles.responsibilityPanel}>
        <ThemedView style={styles.fieldGroup}>
          <ThemedText type="smallBold">Match roles</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Choose one captain and up to two players for match duty.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.responsibilityGroup}>
          <ThemedText type="smallBold">Captain</ThemedText>
          <ThemedView style={styles.responsibilityOptions}>
            {availablePlayers.length > 0 ? (
              availablePlayers.map((player) => (
                <PlayerRoleOption
                  key={player.id}
                  isSelected={form.captainPlayerId === player.id}
                  label={formatPlayerDisplayName(player)}
                  onPress={() =>
                    updateCaptainPlayer(
                      onChangeForm,
                      form.captainPlayerId === player.id ? null : player.id,
                    )
                  }
                />
              ))
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Mark players available first.
              </ThemedText>
            )}
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.responsibilityGroup}>
          <ThemedText type="smallBold">Match duty</ThemedText>
          <ThemedView style={styles.responsibilityOptions}>
            {availablePlayers.length > 0 ? (
              availablePlayers.map((player) => {
                const isSelected = form.matchDutyPlayerIds.includes(player.id);

                return (
                  <PlayerRoleOption
                    key={player.id}
                    isSelected={isSelected}
                    label={formatPlayerDisplayName(player)}
                    onPress={() =>
                      toggleMatchDutyPlayer(
                        onChangeForm,
                        form.matchDutyPlayerIds,
                        player.id,
                      )
                    }
                  />
                );
              })
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Mark players available first.
              </ThemedText>
            )}
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

function PlayerRoleOption({
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
        styles.playerRoleOption,
        isSelected && styles.playerRoleOptionSelected,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        numberOfLines={1}
        style={isSelected && styles.playerRoleOptionTextSelected}
      >
        {label}
      </ThemedText>
    </Pressable>
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
  matchDurationMinutes = defaultMatchDurationMinutes,
  playerResultStats,
  playerRoleById,
  players,
  preferNicknames,
}: {
  form: MatchSetupFormState;
  kitSettings: LineupKitSettings;
  matchDurationMinutes?: number;
  playerResultStats?: MatchPlayerResultStats;
  playerRoleById?: Map<number, MatchResultSquadEntry["role"]>;
  players: Player[];
  preferNicknames: boolean;
}) {
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
          {form.date} at {form.startTime}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {getMatchLocationLabel(form.location)} match
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
          <ThemedText type="default">Match roles</ThemedText>
          <ThemedView style={styles.reviewRoleGrid}>
            <ThemedView type="backgroundElement" style={styles.reviewRoleCard}>
              <ThemedText type="code" themeColor="textSecondary">
                Captain
              </ThemedText>
              <ThemedText type="smallBold" numberOfLines={1}>
                {captain ? formatPlayerName(captain, preferNicknames) : "-"}
              </ThemedText>
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.reviewRoleCard}>
              <ThemedText type="code" themeColor="textSecondary">
                Match duty
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
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.reviewListSection}>
          <ThemedText type="default">Substitutes</ThemedText>
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
                      type="code"
                      themeColor="textSecondary"
                      style={styles.reviewPlayerSlotLabel}
                    >
                      SUB
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
              No substitutes selected.
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

function ShareMatchPreviewModal({
  kitSettings,
  matchDurationMinutes,
  onClose,
  preferNicknames,
  preview,
  teamName,
  visible,
}: {
  kitSettings: LineupKitSettings;
  matchDurationMinutes: number;
  onClose: () => void;
  preferNicknames: boolean;
  preview: SharePreviewState | null;
  teamName: string;
  visible: boolean;
}) {
  const theme = useTheme();
  const [background, setBackground] =
    useState<ShareBackgroundTemplateId>("stadium-day");
  const [overlayStyle, setOverlayStyle] =
    useState<SharePosterOverlayStyle>("broadcast");
  const basePosterColors = useMemo(
    () => createSharePosterColorsFromKitSettings(kitSettings),
    [kitSettings],
  );
  const [posterColorOverrides, setPosterColorOverrides] = useState<
    Partial<PosterColorSettings>
  >({});
  const [areColorControlsOpen, setAreColorControlsOpen] = useState(false);
  const posterColors = {
    ...basePosterColors,
    ...posterColorOverrides,
  };
  const selectedBackground =
    shareBackgroundTemplates.find((option) => option.id === background) ??
    shareBackgroundTemplates[0];

  function updatePosterColor(key: keyof PosterColorSettings, value: string) {
    setPosterColorOverrides((currentColors) => ({
      ...currentColors,
      [key]: value,
    }));
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <ThemedView style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <ThemedView style={styles.shareModalSheet}>
          <ThemedView style={styles.modalHeader}>
            <ThemedView style={styles.modalTitleGroup}>
              <ThemedText type="default">Share match image</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Preview the lineup graphic before exporting.
              </ThemedText>
            </ThemedView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close share preview"
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

          <ScrollView contentContainerStyle={styles.shareModalContent}>
            <ThemedView style={styles.shareOptionGroup}>
              <ThemedText type="code" themeColor="textSecondary">
                Background
              </ThemedText>
              <ThemedView style={styles.shareOptionRow}>
                {shareBackgroundTemplates.map((option) => {
                  const isSelected = option.id === background;

                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => setBackground(option.id)}
                      style={({ pressed }) => [
                        styles.shareOptionButton,
                        isSelected && styles.shareOptionButtonSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={
                          isSelected && styles.shareOptionButtonTextSelected
                        }
                      >
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.shareOptionGroup}>
              <ThemedText type="code" themeColor="textSecondary">
                Overlay
              </ThemedText>
              <ThemedView style={styles.shareOptionRow}>
                {sharePosterOverlayStyleOptions.map((option) => {
                  const isSelected = option.value === overlayStyle;

                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => setOverlayStyle(option.value)}
                      style={({ pressed }) => [
                        styles.shareOptionButton,
                        isSelected && styles.shareOptionButtonSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={
                          isSelected && styles.shareOptionButtonTextSelected
                        }
                      >
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ThemedView>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.shareColorPanel}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: areColorControlsOpen }}
                onPress={() =>
                  setAreColorControlsOpen((isCurrentlyOpen) => !isCurrentlyOpen)
                }
                style={({ pressed }) => [
                  styles.shareColorHeader,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedView>
                  <ThemedText type="default">Colors</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Tweak panel and text colors for this image.
                  </ThemedText>
                </ThemedView>
                <SymbolView
                  name={{
                    ios: areColorControlsOpen ? "chevron.up" : "chevron.down",
                    android: areColorControlsOpen
                      ? "keyboard_arrow_up"
                      : "keyboard_arrow_down",
                    web: areColorControlsOpen
                      ? "keyboard_arrow_up"
                      : "keyboard_arrow_down",
                  }}
                  tintColor={theme.text}
                  size={18}
                />
              </Pressable>

              {areColorControlsOpen ? (
                <ThemedView style={styles.shareColorSectionList}>
                  <SharePosterColorSection
                    panelLabel="Panel"
                    panelValue={posterColors.titlePanelColor}
                    textLabel="Text"
                    textValue={posterColors.titleTextColor}
                    title="Team, home score & subs title"
                    onPanelChange={(color) =>
                      updatePosterColor("titlePanelColor", color)
                    }
                    onTextChange={(color) =>
                      updatePosterColor("titleTextColor", color)
                    }
                  />
                  <SharePosterColorSection
                    panelLabel="Panel"
                    panelValue={posterColors.valuePanelColor}
                    textLabel="Text"
                    textValue={posterColors.valueTextColor}
                    title="Opponent, away score & subs"
                    onPanelChange={(color) =>
                      updatePosterColor("valuePanelColor", color)
                    }
                    onTextChange={(color) =>
                      updatePosterColor("valueTextColor", color)
                    }
                  />
                  <SharePosterColorSection
                    panelLabel="Panel"
                    panelValue={posterColors.infoPanelColor}
                    textLabel="Text & icons"
                    textValue={posterColors.infoTextColor}
                    title="Location, date & accents"
                    onPanelChange={(color) =>
                      updatePosterColor("infoPanelColor", color)
                    }
                    onTextChange={(color) =>
                      updatePosterColor("infoTextColor", color)
                    }
                  />
                </ThemedView>
              ) : null}
            </ThemedView>

            {preview ? (
              <ShareMatchPosterPreview
                background={selectedBackground}
                kitSettings={kitSettings}
                matchDurationMinutes={matchDurationMinutes}
                overlayStyle={overlayStyle}
                posterColors={posterColors}
                preferNicknames={preferNicknames}
                preview={preview}
                teamName={teamName}
              />
            ) : null}
          </ScrollView>

          <ThemedView style={styles.formActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold">Close</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Alert.alert(
                  "Export coming next",
                  "The share preview is ready. Next we can add image export and the native share sheet.",
                )
              }
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                Export soon
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

function ShareMatchPosterPreview({
  background,
  kitSettings,
  matchDurationMinutes,
  overlayStyle,
  posterColors,
  preferNicknames,
  preview,
  teamName,
}: {
  background: (typeof shareBackgroundTemplates)[number];
  kitSettings: LineupKitSettings;
  matchDurationMinutes: number;
  overlayStyle: SharePosterOverlayStyle;
  posterColors: PosterColorSettings;
  preferNicknames: boolean;
  preview: SharePreviewState;
  teamName: string;
}) {
  const positions = defaultSharePosterPositionsByOverlayStyle[overlayStyle];
  const lineupFrame = background.lineupFrame;
  const selectedFormation = normalizeMatchFormation(preview.form.formation);
  const shareSlots = shareLineupFormationSlots[selectedFormation];
  const substitutes = getAssignedSubstitutes(preview.form, preview.players);
  const hasResult =
    typeof preview.ownScore === "number" &&
    typeof preview.opponentScore === "number";

  return (
    <ThemedView style={styles.sharePosterFrame}>
      <Image
        source={background.source}
        contentFit="cover"
        style={styles.sharePosterBackground}
      />
      <SharePosterOverlay
        location={preview.form.location}
        hasResult={hasResult}
        overlayStyle={overlayStyle}
        posterColors={posterColors}
      />
      <SharePosterTextLayer
        form={preview.form}
        hasResult={hasResult}
        opponentScore={preview.opponentScore}
        overlayStyle={overlayStyle}
        ownScore={preview.ownScore}
        playerResultStats={preview.playerResultStats}
        posterColors={posterColors}
        positions={positions}
        preferNicknames={preferNicknames}
        substitutes={substitutes.map(({ player }) => player)}
        teamName={teamName}
      />

      <ThemedView
        style={[
          styles.sharePosterLineupLayer,
          {
            left: `${lineupFrame.left}%`,
            top: `${lineupFrame.top}%`,
            transform: [{ scale: lineupFrame.scale }],
          },
        ]}
      >
        {shareSlots.map((slot) => {
          const player = getAssignedPlayer(
            preview.form.lineupAssignments[slot.id],
            preview.players,
          );

          if (!player) {
            return null;
          }

          return (
            <ThemedView
              key={slot.id}
              style={[
                styles.sharePosterPlayer,
                {
                  left: `${slot.left}%`,
                  top: `${slot.top}%`,
                },
              ]}
            >
              <LineupJersey
                compact
                isCaptain={player.id === preview.form.captainPlayerId}
                isGoalkeeper={slot.isGoalkeeper}
                kitSettings={kitSettings}
                player={player}
                preferNicknames={preferNicknames}
                resultBadges={
                  preview.playerResultStats
                    ? getJerseyResultBadges(
                        preview.playerResultStats[player.id],
                        preview.playerRoleById?.get(player.id) ?? "starter",
                        matchDurationMinutes,
                      )
                    : undefined
                }
                showName
              />
            </ThemedView>
          );
        })}
      </ThemedView>

      <ThemedView
        style={[
          styles.sharePosterLogoFrame,
          {
            left: `${(positions.logo.x / 1080) * 100}%`,
            top: `${(positions.logo.y / 1350) * 100}%`,
          },
        ]}
      >
        <Image
          source={assistantCoachLogo}
          contentFit="contain"
          style={styles.sharePosterLogo}
        />
      </ThemedView>
    </ThemedView>
  );
}

function SharePosterColorSection({
  onPanelChange,
  onTextChange,
  panelLabel,
  panelValue,
  textLabel,
  textValue,
  title,
}: {
  onPanelChange: (color: string) => void;
  onTextChange: (color: string) => void;
  panelLabel: string;
  panelValue: string;
  textLabel: string;
  textValue: string;
  title: string;
}) {
  return (
    <ThemedView style={styles.shareColorSection}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedView style={styles.shareColorFields}>
        <SharePosterColorField
          label={panelLabel}
          value={panelValue}
          onChange={onPanelChange}
        />
        <SharePosterColorField
          label={textLabel}
          value={textValue}
          onChange={onTextChange}
        />
      </ThemedView>
    </ThemedView>
  );
}

function SharePosterColorField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (color: string) => void;
  value: string;
}) {
  return (
    <ThemedView style={styles.shareColorField}>
      <ThemedView style={styles.shareColorFieldHeader}>
        <ThemedText type="code" themeColor="textSecondary">
          {label}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.shareColorSwatchRow}>
        {sharePosterColorOptions.map((color) => (
          <Pressable
            key={`${label}-${color}`}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${color}`}
            accessibilityState={{ selected: value === color }}
            onPress={() => onChange(color)}
            style={({ pressed }) => [
              styles.shareColorSwatch,
              { backgroundColor: color },
              value === color && styles.shareColorSwatchSelected,
              pressed && styles.pressed,
            ]}
          />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

function SharePosterTextLayer({
  form,
  hasResult,
  opponentScore,
  overlayStyle,
  ownScore,
  playerResultStats,
  posterColors,
  positions,
  preferNicknames,
  substitutes,
  teamName,
}: {
  form: MatchSetupFormState;
  hasResult: boolean;
  opponentScore?: number;
  overlayStyle: SharePosterOverlayStyle;
  ownScore?: number;
  playerResultStats?: MatchPlayerResultStats;
  posterColors: PosterColorSettings;
  positions: (typeof defaultSharePosterPositionsByOverlayStyle)[SharePosterOverlayStyle];
  preferNicknames: boolean;
  substitutes: Player[];
  teamName: string;
}) {
  return (
    <Svg
      pointerEvents="none"
      viewBox="0 0 1080 1350"
      style={styles.posterOverlay}
    >
      {sharePosterTextPieces.map((textPiece) => {
        if (
          !hasResult &&
          (textPiece.id === "homeScore" || textPiece.id === "awayScore")
        ) {
          return null;
        }

        const position = positions[textPiece.id];
        const textColor = getSharePosterTextColor(
          textPiece.id,
          posterColors,
          overlayStyle,
          form.location,
        );

        if (textPiece.id === "locationLabel") {
          return (
            <LocationPinIcon
              key={textPiece.id}
              color={posterColors.titlePanelColor}
              x={position.x}
              y={position.y}
            />
          );
        }

        if (textPiece.id === "dateLabel") {
          return (
            <CalendarIcon
              key={textPiece.id}
              color={posterColors.titlePanelColor}
              x={position.x}
              y={position.y}
            />
          );
        }

        const textShadowColor = getPosterTextShadowColor(textColor);
        const textConfig = getSharePosterTextConfig(
          textPiece.id,
          form,
          overlayStyle,
          hasResult ? { opponentScore, ownScore } : null,
          preferNicknames,
          substitutes,
          teamName,
        );
        const showSubstituteIcon =
          getSharePosterSubstituteMinutesPlayed(
            textPiece.id,
            substitutes,
            playerResultStats,
          ) > 0;

        return (
          <G key={textPiece.id}>
            {showSubstituteIcon ? (
              <SvgImage
                href={require("@/assets/images/match-day/sub-on.png")}
                width={24}
                height={24}
                x={position.x - 10}
                y={position.y - textConfig.fontSize - 8}
                preserveAspectRatio="xMidYMid meet"
              />
            ) : null}
            <SvgText
              fill={textShadowColor}
              fontSize={textConfig.fontSize}
              fontStyle={textConfig.fontStyle}
              fontWeight={textConfig.fontWeight}
              stroke={textShadowColor}
              strokeWidth={2}
              x={position.x + 2}
              y={position.y + 2}
            >
              {textConfig.value}
            </SvgText>
            <SvgText
              fill={textColor}
              fontSize={textConfig.fontSize}
              fontStyle={textConfig.fontStyle}
              fontWeight={textConfig.fontWeight}
              x={position.x}
              y={position.y}
            >
              {textConfig.value}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function getSharePosterSubstituteMinutesPlayed(
  pieceId: SharePosterTextPieceId,
  substitutes: Player[],
  playerResultStats?: MatchPlayerResultStats,
) {
  const substituteIndex = getSharePosterSubstituteIndex(pieceId);
  const substitute =
    typeof substituteIndex === "number" ? substitutes[substituteIndex] : null;

  if (!substitute) {
    return 0;
  }

  return playerResultStats?.[substitute.id]?.minutesPlayed ?? 0;
}

function SharePosterOverlay({
  hasResult,
  location,
  overlayStyle,
  posterColors,
}: {
  hasResult: boolean;
  location: MatchLocation;
  overlayStyle: SharePosterOverlayStyle;
  posterColors: PosterColorSettings;
}) {
  if (overlayStyle === "broadcast") {
    return (
      <BroadcastPosterOverlay
        hasResult={hasResult}
        location={location}
        posterColors={posterColors}
      />
    );
  }

  return (
    <Svg
      pointerEvents="none"
      viewBox="0 0 1080 1350"
      style={styles.posterOverlay}
    >
      <Defs>
        <LinearGradient id="primaryPanel" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={posterColors.titlePanelColor} />
          <Stop
            offset="1"
            stopColor={darkenHexColor(posterColors.titlePanelColor, 0.2)}
          />
        </LinearGradient>
        <LinearGradient id="secondaryPanel" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={posterColors.valuePanelColor} />
          <Stop
            offset="1"
            stopColor={darkenHexColor(posterColors.valuePanelColor, 0.25)}
          />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width="1080" height="1350" fill="rgba(0,0,0,0.18)" />
      <Path
        d="M0 36 H780 L700 222 H0 Z"
        fill="url(#primaryPanel)"
        stroke="#FFFFFF"
        strokeWidth="3"
      />
      {hasResult ? (
        <>
          <Path
            d="M812 36 H1080 V222 H700 Z"
            fill="url(#secondaryPanel)"
            stroke="#FFFFFF"
            strokeWidth="3"
          />
          <Path d="M780 36 H812 L700 222 H668 Z" fill="#FFFFFF" />
          <Line
            x1="1000"
            y1="78"
            x2="1000"
            y2="178"
            stroke={posterColors.valueTextColor}
            strokeWidth="4"
          />
        </>
      ) : null}
      <Path
        d="M0 232 H880 Q902 232 892 254 L870 296 H0 Z"
        fill={posterColors.infoPanelColor}
      />
      <Line x1="424" y1="244" x2="424" y2="284" stroke="#D1D5DB" />
      <Path
        d="M0 1138 H354 Q364 1138 359 1152 L334 1218 H0 Z"
        fill="url(#primaryPanel)"
        stroke="#FFFFFF"
        strokeWidth="3"
      />
      <Path
        d="M364 1138 H1038 Q1062 1138 1052 1162 L1018 1296 H0 V1218 H334 Z"
        fill="url(#secondaryPanel)"
        stroke="#FFFFFF"
        strokeWidth="3"
      />
    </Svg>
  );
}

function BroadcastPosterOverlay({
  hasResult,
  location,
  posterColors,
}: {
  hasResult: boolean;
  location: MatchLocation;
  posterColors: PosterColorSettings;
}) {
  const homeScorePanelFill =
    location === "home" ? "url(#broadcastTitle)" : "url(#broadcastValue)";
  const awayScorePanelFill =
    location === "home" ? "url(#broadcastValue)" : "url(#broadcastTitle)";

  return (
    <Svg
      pointerEvents="none"
      viewBox="0 0 1080 1350"
      style={styles.posterOverlay}
    >
      <Defs>
        <LinearGradient id="broadcastTitle" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={posterColors.titlePanelColor} />
          <Stop
            offset="1"
            stopColor={darkenHexColor(posterColors.titlePanelColor, 0.25)}
          />
        </LinearGradient>
        <LinearGradient id="broadcastValue" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={posterColors.valuePanelColor} />
          <Stop
            offset="1"
            stopColor={darkenHexColor(posterColors.valuePanelColor, 0.28)}
          />
        </LinearGradient>
        <LinearGradient id="broadcastAccent" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={posterColors.infoPanelColor} />
          <Stop
            offset="1"
            stopColor={darkenHexColor(posterColors.infoPanelColor, 0.2)}
          />
        </LinearGradient>
        <LinearGradient id="broadcastDark" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#080808" />
          <Stop offset="1" stopColor="#252525" />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width="1080" height="1350" fill="rgba(0,0,0,0.18)" />
      <Path
        d="M66 62 H682 L648 218 H66 Q58 218 58 210 V70 Q58 62 66 62 Z"
        fill="url(#broadcastTitle)"
        stroke="#FFFFFF"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <Path
        d="M66 62 H682 L674 82 H130 L102 218 H66 Q58 218 58 210 V70 Q58 62 66 62 Z"
        fill="url(#broadcastDark)"
        opacity="0.82"
      />
      <Path
        d="M84 218 H620 L596 294 H66 Q58 294 58 286 V234 Z"
        fill="url(#broadcastValue)"
        stroke="#FFFFFF"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <Path
        d="M58 236 H486 L464 292 H58 Z"
        fill="url(#broadcastValue)"
        opacity="0.92"
      />
      <Path d="M505 246 H521 L493 286 H477 Z" fill="url(#broadcastAccent)" />
      <Path d="M527 246 H543 L515 286 H499 Z" fill="url(#broadcastAccent)" />
      <Path d="M549 246 H565 L537 286 H521 Z" fill="url(#broadcastAccent)" />
      <Path d="M571 246 H587 L559 286 H543 Z" fill="url(#broadcastAccent)" />
      <Path d="M593 246 H609 L581 286 H565 Z" fill="url(#broadcastAccent)" />
      {hasResult ? (
        <>
          <Rect
            x="690"
            y="74"
            width="158"
            height="186"
            rx="8"
            fill={homeScorePanelFill}
          />
          <Rect
            x="866"
            y="74"
            width="158"
            height="186"
            rx="8"
            fill={awayScorePanelFill}
          />
          <Path d="M866 74 H926 L900 260 H866 Z" fill="url(#broadcastDark)" />
        </>
      ) : null}
      <Rect
        x="58"
        y="302"
        width="966"
        height="76"
        rx="16"
        fill="url(#broadcastAccent)"
      />
      <Line
        x1="532"
        y1="320"
        x2="532"
        y2="360"
        stroke={posterColors.infoTextColor}
      />
      <Rect
        x="46"
        y="1150"
        width="988"
        height="142"
        rx="16"
        fill="url(#broadcastDark)"
        stroke="#FFFFFF"
        strokeWidth="3"
      />
      <Path
        d="M58 1178 H204 L230 1224 L204 1264 H58 Z"
        fill="url(#broadcastTitle)"
        stroke="#FFFFFF"
        strokeWidth="3"
      />
      {[402, 532, 662, 792, 922].map((x) => (
        <Line
          key={x}
          x1={x}
          y1="1174"
          x2={x}
          y2="1268"
          stroke="#FFFFFF"
          strokeOpacity="0.55"
        />
      ))}
    </Svg>
  );
}

function LocationPinIcon({
  color,
  x,
  y,
}: {
  color: string;
  x: number;
  y: number;
}) {
  return (
    <G transform={`translate(${x} ${y - 30})`}>
      <Path
        d="M18 2 C9.2 2 2 9.1 2 17.8 C2 29.4 18 44 18 44 C18 44 34 29.4 34 17.8 C34 9.1 26.8 2 18 2 Z"
        fill={color}
      />
      <Path
        d="M18 23.5 C21.4 23.5 24.2 20.7 24.2 17.3 C24.2 13.9 21.4 11.1 18 11.1 C14.6 11.1 11.8 13.9 11.8 17.3 C11.8 20.7 14.6 23.5 18 23.5 Z"
        fill="#FFFFFF"
      />
    </G>
  );
}

function CalendarIcon({
  color,
  x,
  y,
}: {
  color: string;
  x: number;
  y: number;
}) {
  return (
    <G transform={`translate(${x} ${y - 29})`}>
      <Rect x="2" y="6" width="40" height="36" rx="5" fill={color} />
      <Rect x="7" y="16" width="30" height="21" rx="2" fill="#FFFFFF" />
      <Line x1="11" y1="2" x2="11" y2="11" stroke={color} strokeWidth="5" />
      <Line x1="33" y1="2" x2="33" y2="11" stroke={color} strokeWidth="5" />
      <Line x1="13" y1="23" x2="31" y2="23" stroke={color} strokeWidth="3" />
      <Line x1="13" y1="30" x2="27" y2="30" stroke={color} strokeWidth="3" />
    </G>
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
      <FontAwesome6 name="handshake" solid color={theme.text} size={size} />
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
  kitSettings,
  matchDurationMinutes = defaultMatchDurationMinutes,
  playerResultStats,
  playerRoleById,
  players,
  preferNicknames,
}: {
  form: MatchSetupFormState;
  kitSettings: LineupKitSettings;
  matchDurationMinutes?: number;
  playerResultStats?: MatchPlayerResultStats;
  playerRoleById?: Map<number, MatchResultSquadEntry["role"]>;
  players: Player[];
  preferNicknames: boolean;
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
                  top: slot.top,
                },
              ]}
            >
              <LineupJersey
                compact
                isCaptain={assignedPlayer.id === form.captainPlayerId}
                isGoalkeeper={slot.isGoalkeeper}
                kitSettings={kitSettings}
                player={assignedPlayer}
                preferNicknames={preferNicknames}
                resultBadges={
                  playerResultStats
                    ? getJerseyResultBadges(
                        playerResultStats[assignedPlayer.id],
                        playerRoleById?.get(assignedPlayer.id) ?? "starter",
                        matchDurationMinutes,
                      )
                    : undefined
                }
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
  captainPlayerId,
  dropTargets,
  kitSettings,
  onDragPlayerChange,
  onMovePlayer,
  onRegisterDropTarget,
  onSelectAssignedSlot,
  onSelectSlot,
  players,
  preferNicknames,
}: {
  assignments: LineupAssignments;
  captainPlayerId: number | null;
  dropTargets: Record<string, DropTarget>;
  kitSettings: LineupKitSettings;
  onDragPlayerChange: (isDragging: boolean) => void;
  onMovePlayer: (fromSlotId: string, toSlotId: string) => void;
  onRegisterDropTarget: (target: DropTarget) => void;
  onSelectAssignedSlot: (slotId: string) => void;
  onSelectSlot: (slotId: string) => void;
  players: Player[];
  preferNicknames: boolean;
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
          sectionLayout.y + gridLayout.y + slotLayout.y + slotLayout.height / 2,
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
                isCaptain={assignedPlayer.id === captainPlayerId}
                kitSettings={kitSettings}
                dropTargets={dropTargets}
                player={assignedPlayer}
                preferNicknames={preferNicknames}
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
  captainPlayerId,
  dropTargets,
  formation,
  kitSettings,
  onDragPlayerChange,
  onMovePlayer,
  onRegisterDropTargets,
  onSelectAssignedSlot,
  onSelectSlot,
  players,
  preferNicknames,
}: {
  assignments: LineupAssignments;
  captainPlayerId: number | null;
  dropTargets: Record<string, DropTarget>;
  formation: MatchFormation;
  kitSettings: LineupKitSettings;
  onDragPlayerChange: (isDragging: boolean) => void;
  onMovePlayer: (fromSlotId: string, toSlotId: string) => void;
  onRegisterDropTargets: (targets: DropTarget[]) => void;
  onSelectAssignedSlot: (slotId: string) => void;
  onSelectSlot: (slotId: string) => void;
  players: Player[];
  preferNicknames: boolean;
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
                isCaptain={assignedPlayer.id === captainPlayerId}
                isGoalkeeper={slot.isGoalkeeper}
                kitSettings={kitSettings}
                player={assignedPlayer}
                preferNicknames={preferNicknames}
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
  isCaptain,
  isGoalkeeper,
  kitSettings,
  onDragPlayerChange,
  onLayout,
  onMovePlayer,
  onSelectSlot,
  player,
  preferNicknames,
  showName,
  slot,
  slotStyle,
}: {
  compact?: boolean;
  dropTargets: Record<string, DropTarget>;
  isCaptain?: boolean;
  isGoalkeeper?: boolean;
  kitSettings: LineupKitSettings;
  onDragPlayerChange: (isDragging: boolean) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  onMovePlayer: (fromSlotId: string, toSlotId: string) => void;
  onSelectSlot: (slotId: string) => void;
  player: Player;
  preferNicknames: boolean;
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
        accessibilityLabel={`Change ${formatPlayerName(player, preferNicknames)}`}
        onPress={() => onSelectSlot(slot.id)}
        style={styles.assignedPitchSlotButton}
      >
        <LineupJersey
          compact={compact}
          isCaptain={isCaptain}
          kitSettings={kitSettings}
          player={player}
          isGoalkeeper={isGoalkeeper}
          showName={showName}
          preferNicknames={preferNicknames}
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
  preferNicknames,
  target,
}: {
  onRemove: () => void;
  onShowStats: () => void;
  onSwap: () => void;
  player: Player;
  preferNicknames: boolean;
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
        label={`Swap ${formatPlayerName(player, preferNicknames)}`}
        onPress={onSwap}
      />
      <PlayerActionButton
        icon={{
          ios: "chart.bar.xaxis",
          android: "bar_chart",
          web: "bar_chart",
        }}
        label={`Show basic stats for ${formatPlayerName(player, preferNicknames)}`}
        onPress={onShowStats}
      />
      <PlayerActionButton
        danger
        icon={{
          ios: "person.crop.circle.badge.minus",
          android: "person_remove",
          web: "person_remove",
        }}
        label={`Remove ${formatPlayerName(player, preferNicknames)}`}
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
  kitSettings,
  onClose,
  onRemove,
  onSelectPlayer,
  players,
  preferNicknames,
  selectedSlot,
  visible,
}: {
  assignedPlayerIds: LineupAssignments;
  kitSettings: LineupKitSettings;
  onClose: () => void;
  onRemove: () => void;
  onSelectPlayer: (player: Player) => void;
  players: Player[];
  preferNicknames: boolean;
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
  const sortedAvailablePlayers = sortPlayersForAssignmentSlot(
    availablePlayers,
    selectedSlot,
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
            {sortedAvailablePlayers.length > 0 ? (
              sortedAvailablePlayers.map((player) => {
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
                    <LineupJersey
                      compact
                      kitSettings={kitSettings}
                      player={player}
                      preferNicknames={preferNicknames}
                    />
                    <ThemedView style={styles.playerPickerNameGroup}>
                      <ThemedText type="smallBold">
                        {formatPlayerName(player, preferNicknames)}
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
  dense,
  isCaptain,
  isGoalkeeper,
  kitSettings,
  player,
  preferNicknames,
  resultBadges,
  showName,
}: {
  compact?: boolean;
  dense?: boolean;
  isCaptain?: boolean;
  isGoalkeeper?: boolean;
  kitSettings: LineupKitSettings;
  player: Player;
  preferNicknames?: boolean;
  resultBadges?: JerseyResultBadges | null;
  showName?: boolean;
}) {
  const kitNumberColor = isGoalkeeper ? "#ffffff" : kitSettings.kitNumberColor;

  return (
    <ThemedView
      style={[
        styles.jerseyWrapper,
        compact && styles.jerseyWrapperCompact,
        dense && styles.jerseyWrapperDense,
      ]}
    >
      <ThemedView
        style={[
          styles.jerseyShape,
          isGoalkeeper && styles.goalkeeperJerseyShape,
          compact && styles.jerseyShapeCompact,
          dense && styles.jerseyShapeDense,
        ]}
      >
        <LineupJerseyShape
          compact={compact}
          isGoalkeeper={isGoalkeeper}
          kitSettings={kitSettings}
        />
        {isCaptain ? (
          <ThemedView
            style={[
              styles.captainBadge,
              compact && styles.captainBadgeCompact,
              dense && styles.captainBadgeDense,
            ]}
          >
            <ThemedText
              type="code"
              style={[
                styles.captainBadgeText,
                compact && styles.captainBadgeTextCompact,
                dense && styles.captainBadgeTextDense,
              ]}
            >
              C
            </ThemedText>
          </ThemedView>
        ) : null}
        <ThemedText
          type="smallBold"
          style={[
            styles.jerseyNumber,
            compact && styles.jerseyNumberCompact,
            dense && styles.jerseyNumberDense,
            {
              color: kitNumberColor,
              textShadowColor: getKitNumberOutlineColor(kitNumberColor),
            },
          ]}
        >
          {player.kitNumber ?? "-"}
        </ThemedText>
        {resultBadges ? (
          <JerseyResultBadgeOverlay badges={resultBadges} compact={compact} />
        ) : null}
      </ThemedView>
      {!compact || showName ? (
        <ThemedView
          style={[
            styles.jerseyNameRow,
            compact && styles.jerseyNameRowCompact,
            dense && styles.jerseyNameRowDense,
          ]}
        >
          <ThemedText
            type="default"
            style={[
              styles.jerseyName,
              compact && styles.jerseyNameCompact,
              dense && styles.jerseyNameDense,
            ]}
            numberOfLines={compact ? 2 : 1}
          >
            {formatPlayerName(player, preferNicknames ?? true)}
          </ThemedText>
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

function LineupJerseyShape({
  compact,
  isGoalkeeper,
  kitSettings,
}: {
  compact?: boolean;
  isGoalkeeper?: boolean;
  kitSettings: LineupKitSettings;
}) {
  const fillColor = isGoalkeeper
    ? kitSettings.goalkeeperKitColor
    : kitSettings.outfieldKitColor;
  const strokeColor = isGoalkeeper ? "#ffffff" : "#111827";

  return (
    <Svg
      viewBox="0 0 100 90"
      style={[styles.jerseySvg, compact && styles.jerseySvgCompact]}
    >
      <Defs>
        <ClipPath id="lineupJerseyClip">
          <Path d={kitShirtPath} />
        </ClipPath>
      </Defs>
      <Path d={kitShirtPath} fill={fillColor} />
      {!isGoalkeeper ? (
        <G clipPath="url(#lineupJerseyClip)">
          {kitSettings.kitDesign === "stripes" ? (
            <>
              <Rect
                x="18"
                y="0"
                width="11"
                height="90"
                fill={kitSettings.secondaryKitColor}
              />
              <Rect
                x="45"
                y="0"
                width="11"
                height="90"
                fill={kitSettings.secondaryKitColor}
              />
              <Rect
                x="72"
                y="0"
                width="11"
                height="90"
                fill={kitSettings.secondaryKitColor}
              />
            </>
          ) : null}
          {kitSettings.kitDesign === "hoops" ? (
            <>
              <Rect
                x="0"
                y="21"
                width="100"
                height="10"
                fill={kitSettings.secondaryKitColor}
              />
              <Rect
                x="0"
                y="44"
                width="100"
                height="10"
                fill={kitSettings.secondaryKitColor}
              />
              <Rect
                x="0"
                y="67"
                width="100"
                height="10"
                fill={kitSettings.secondaryKitColor}
              />
            </>
          ) : null}
          {kitSettings.kitDesign === "halves" ? (
            <Rect
              x="50"
              y="0"
              width="50"
              height="90"
              fill={kitSettings.secondaryKitColor}
            />
          ) : null}
          {kitSettings.kitDesign === "sides" ? (
            <>
              <Path
                d="M18 0 L32 0 L32 90 L18 90 Z"
                fill={kitSettings.secondaryKitColor}
              />
              <Path
                d="M68 0 L82 0 L82 90 L68 90 Z"
                fill={kitSettings.secondaryKitColor}
              />
            </>
          ) : null}
          {kitSettings.kitDesign === "sash" ? (
            <>
              <Path
                d="M4 90 L86 -16 L96 -16 L14 90 Z"
                fill={kitSettings.secondaryKitColor}
              />
              <Path
                d="M14 90 L96 -16 L106 -16 L24 90 Z"
                fill={kitSettings.sashAccentKitColor}
              />
            </>
          ) : null}
        </G>
      ) : null}
      <Path
        d={kitShirtPath}
        fill="none"
        stroke={strokeColor}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth={5}
      />
      <Path
        d="M37 7 Q50 15 63 7"
        fill="none"
        stroke={strokeColor}
        strokeLinecap="round"
        strokeWidth={5}
      />
    </Svg>
  );
}

function JerseyResultBadgeOverlay({
  badges,
  compact,
}: {
  badges: JerseyResultBadges;
  compact?: boolean;
}) {
  const hasCard = badges.card !== "none";
  const visibleGoalCount = badges.goals > 3 ? 1 : badges.goals;
  const visibleAssistCount = badges.assists > 3 ? 1 : badges.assists;
  const eventBadgeStep = compact ? 10 : 13;

  return (
    <ThemedView
      pointerEvents="none"
      style={[
        styles.jerseyResultOverlay,
        compact && styles.jerseyResultOverlayCompact,
      ]}
    >
      {badges.subDirection ? (
        <ThemedView
          style={[
            styles.jerseyResultIconBadge,
            styles.jerseyResultSubBadge,
            compact && styles.jerseyResultIconBadgeCompact,
          ]}
        >
          <Image
            source={
              badges.subDirection === "on"
                ? require("@/assets/images/match-day/sub-on.png")
                : require("@/assets/images/match-day/sub-off.png")
            }
            style={[
              styles.jerseyResultImageBadge,
              compact && styles.jerseyResultImageBadgeCompact,
            ]}
            contentFit="contain"
          />
        </ThemedView>
      ) : null}

      {hasCard ? (
        <ThemedView
          style={[
            styles.jerseyResultCardShell,
            compact && styles.jerseyResultCardShellCompact,
          ]}
        >
          <Image
            source={
              badges.card === "yellow"
                ? require("@/assets/images/match-day/yellow-card.png")
                : require("@/assets/images/match-day/red-card.png")
            }
            style={[
              styles.jerseyResultImageBadge,
              compact && styles.jerseyResultImageBadgeCompact,
            ]}
            contentFit="cover"
          />
        </ThemedView>
      ) : null}

      {badges.goals > 0 ? (
        <ThemedView
          style={[
            styles.jerseyResultGoalStack,
            compact && styles.jerseyResultGoalStackCompact,
          ]}
        >
          {Array.from({ length: visibleGoalCount }, (_, index) => (
            <ThemedView
              key={`goal-${index}`}
              style={[
                styles.jerseyResultEventBadge,
                styles.jerseyResultGoalBadge,
                {
                  left: -index * eventBadgeStep,
                  zIndex: visibleGoalCount - index,
                },
                compact && styles.jerseyResultEventBadgeCompact,
              ]}
            >
              <Image
                source={require("@/assets/images/match-day/goal.png")}
                style={[
                  styles.jerseyResultImageBadge,
                  compact && styles.jerseyResultImageBadgeCompact,
                ]}
                contentFit="contain"
              />
            </ThemedView>
          ))}
          {badges.goals > 3 ? (
            <ThemedText type="code" style={styles.jerseyResultEventCount}>
              {badges.goals}
            </ThemedText>
          ) : null}
        </ThemedView>
      ) : null}

      {badges.assists > 0 ? (
        <ThemedView
          style={[
            styles.jerseyResultAssistStack,
            compact && styles.jerseyResultAssistStackCompact,
          ]}
        >
          {Array.from({ length: visibleAssistCount }, (_, index) => (
            <ThemedView
              key={`assist-${index}`}
              style={[
                styles.jerseyResultEventBadge,
                styles.jerseyResultAssistBadge,
                {
                  right: -index * eventBadgeStep,
                  zIndex: visibleAssistCount - index,
                },
                compact && styles.jerseyResultEventBadgeCompact,
              ]}
            >
              <Image
                source={require("@/assets/images/match-day/assist-boot.png")}
                style={[
                  styles.jerseyResultAssistImage,
                  compact && styles.jerseyResultAssistImageCompact,
                ]}
                contentFit="cover"
              />
            </ThemedView>
          ))}
          {badges.assists > 3 ? (
            <ThemedText type="code" style={styles.jerseyResultEventCount}>
              {badges.assists}
            </ThemedText>
          ) : null}
        </ThemedView>
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

function sortPlayersForAssignmentSlot(
  players: Player[],
  selectedSlot: AssignmentSlot | null,
) {
  const preferredPosition = getPreferredPositionForAssignmentSlot(selectedSlot);

  return [...players].sort((firstPlayer, secondPlayer) => {
    const firstRank = getPlayerPositionSortRank(
      firstPlayer.position,
      preferredPosition,
    );
    const secondRank = getPlayerPositionSortRank(
      secondPlayer.position,
      preferredPosition,
    );

    if (firstRank !== secondRank) {
      return firstRank - secondRank;
    }

    return formatPlayerDisplayName(firstPlayer).localeCompare(
      formatPlayerDisplayName(secondPlayer),
    );
  });
}

function getPreferredPositionForAssignmentSlot(
  selectedSlot: AssignmentSlot | null,
): Player["position"] | null {
  if (!isPitchSlot(selectedSlot)) {
    return null;
  }

  if (selectedSlot.isGoalkeeper) {
    return "goalkeeper";
  }

  const topPercentage = Number(selectedSlot.top.replace("%", ""));

  if (topPercentage <= 25) {
    return "forward";
  }

  if (topPercentage <= 62) {
    return "midfielder";
  }

  return "defender";
}

function isPitchSlot(slot: AssignmentSlot | null): slot is PitchSlot {
  return Boolean(slot && "top" in slot && "left" in slot);
}

function getPlayerPositionSortRank(
  position: Player["position"],
  preferredPosition: Player["position"] | null,
) {
  if (preferredPosition && position === preferredPosition) {
    return 0;
  }

  const defaultPositionOrder: Player["position"][] = [
    "goalkeeper",
    "defender",
    "midfielder",
    "forward",
  ];

  return defaultPositionOrder.indexOf(position) + 1;
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

function formatPlayerName(player: Player, preferNicknames = true) {
  return preferNicknames && player.nickName
    ? player.nickName
    : player.firstName;
}

function formatPlayerDisplayName(player: Player) {
  return [player.firstName, player.lastName].filter(Boolean).join(" ");
}

function createSharePosterColorsFromKitSettings(
  kitSettings: LineupKitSettings,
): PosterColorSettings {
  const titlePanelColor =
    kitSettings.kitDesign === "sash"
      ? kitSettings.sashAccentKitColor
      : kitSettings.outfieldKitColor;
  const valuePanelColor = kitSettings.secondaryKitColor;
  const infoPanelColor =
    kitSettings.kitDesign === "sash"
      ? kitSettings.outfieldKitColor
      : kitSettings.secondaryKitColor;

  return {
    titlePanelColor,
    valuePanelColor,
    infoPanelColor,
    titleTextColor: getReadableSharePosterTextColor(titlePanelColor),
    valueTextColor: getReadableSharePosterTextColor(valuePanelColor),
    infoTextColor: getReadableSharePosterTextColor(infoPanelColor),
  };
}

function getReadableSharePosterTextColor(backgroundColor: string) {
  const normalizedColor = backgroundColor.trim().toUpperCase();

  return normalizedColor === "#FFFFFF" || normalizedColor === "#FACC15"
    ? "#111827"
    : "#FFFFFF";
}

function getSharePosterTextConfig(
  pieceId: SharePosterTextPieceId,
  form: MatchSetupFormState,
  overlayStyle: SharePosterOverlayStyle,
  resultScore: { opponentScore?: number; ownScore?: number } | null,
  preferNicknames: boolean,
  substitutes: Player[],
  teamName: string,
) {
  switch (pieceId) {
    case "teamName":
      return createSharePosterTextConfig(teamName.toUpperCase(), 58, "900");
    case "opponentName":
      return createSharePosterTextConfig(
        form.opponent.trim().toUpperCase() || "OPPONENT",
        34,
        "900",
      );
    case "homeScore":
      return createSharePosterTextConfig(
        typeof resultScore?.ownScore === "number"
          ? String(resultScore.ownScore)
          : "-",
        78,
        "900",
        "normal",
      );
    case "awayScore":
      return createSharePosterTextConfig(
        typeof resultScore?.opponentScore === "number"
          ? String(resultScore.opponentScore)
          : "-",
        78,
        "900",
        "normal",
      );
    case "locationLabel":
    case "dateLabel":
      return createSharePosterTextConfig("", 20, "900", "normal");
    case "locationValue":
      return createSharePosterTextConfig(
        form.venue.trim() ||
          (form.location === "home" ? "Home match" : "Away match"),
        20,
        "500",
        "normal",
      );
    case "dateValue":
      return createSharePosterTextConfig(
        `${form.date} · ${form.startTime}`,
        20,
        "500",
        "normal",
      );
    case "subsTitle":
      return createSharePosterTextConfig(
        overlayStyle === "broadcast" ? "SUBS" : "SUBSTITUTES:",
        34,
        "900",
      );
    case "subOne":
    case "subTwo":
    case "subThree":
    case "subFour":
    case "subFive":
    case "subSix":
      return createSharePosterTextConfig(
        getShareSubstituteLabel(pieceId, substitutes, preferNicknames),
        24,
        "700",
        "normal",
      );
  }
}

function createSharePosterTextConfig(
  value: string,
  fontSize: number,
  fontWeight: "500" | "700" | "900",
  fontStyle: "italic" | "normal" = "italic",
) {
  return {
    fontSize,
    fontStyle,
    fontWeight,
    value,
  };
}

function getShareSubstituteLabel(
  pieceId: SharePosterTextPieceId,
  substitutes: Player[],
  preferNicknames: boolean,
) {
  const substituteIndex = getSharePosterSubstituteIndex(pieceId);
  const substitute =
    typeof substituteIndex === "number" ? substitutes[substituteIndex] : null;

  if (!substitute) {
    return "";
  }

  return `${substitute.kitNumber ?? "-"} ${formatPlayerName(
    substitute,
    preferNicknames,
  )}`;
}

function getSharePosterSubstituteIndex(pieceId: SharePosterTextPieceId) {
  const substituteIndexByPieceId: Partial<
    Record<SharePosterTextPieceId, number>
  > = {
    subOne: 0,
    subTwo: 1,
    subThree: 2,
    subFour: 3,
    subFive: 4,
    subSix: 5,
  };

  return substituteIndexByPieceId[pieceId];
}

function getSharePosterTextColor(
  pieceId: SharePosterTextPieceId,
  posterColors: PosterColorSettings,
  overlayStyle: SharePosterOverlayStyle,
  location: MatchLocation,
) {
  if (overlayStyle === "classic") {
    switch (pieceId) {
      case "teamName":
      case "opponentName":
      case "subsTitle":
        return posterColors.titleTextColor;
      case "homeScore":
      case "awayScore":
      case "subOne":
      case "subTwo":
      case "subThree":
      case "subFour":
      case "subFive":
      case "subSix":
        return posterColors.valueTextColor;
      case "locationLabel":
      case "locationValue":
      case "dateLabel":
      case "dateValue":
        return posterColors.infoTextColor;
    }
  }

  switch (pieceId) {
    case "teamName":
    case "subsTitle":
      return posterColors.titleTextColor;
    case "homeScore":
      return location === "home"
        ? posterColors.titleTextColor
        : posterColors.valueTextColor;
    case "opponentName":
    case "subOne":
    case "subTwo":
    case "subThree":
    case "subFour":
    case "subFive":
    case "subSix":
      return posterColors.valueTextColor;
    case "awayScore":
      return location === "home"
        ? posterColors.valueTextColor
        : posterColors.titleTextColor;
    case "locationLabel":
    case "locationValue":
    case "dateLabel":
    case "dateValue":
      return posterColors.infoTextColor;
  }
}

function getPosterTextShadowColor(textColor: string) {
  if (textColor.toLowerCase() === "#ffffff") {
    return "rgba(17, 24, 39, 0.75)";
  }

  return "rgba(255, 255, 255, 0.65)";
}

function darkenHexColor(hexColor: string, amount: number) {
  const normalizedColor = hexColor.replace("#", "");
  const red = Number.parseInt(normalizedColor.slice(0, 2), 16);
  const green = Number.parseInt(normalizedColor.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedColor.slice(4, 6), 16);
  const nextColor = [red, green, blue]
    .map((value) => Math.max(0, Math.round(value * (1 - amount))))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  return `#${nextColor}`;
}

function getKitNumberOutlineColor(color: string) {
  const normalizedColor = color.trim().toUpperCase();
  return normalizedColor === "#000000" || normalizedColor === "#111827"
    ? "#FFFFFF"
    : "#111827";
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

function getMatchResultStepLabel(step: number) {
  switch (step) {
    case 0:
      return "Score";
    case 1:
      return "Player performance";
    default:
      return "Review";
  }
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
      currentStatuses[player.id] ?? "available",
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
    captainPlayerId:
      status === "available" || currentForm.captainPlayerId !== playerId
        ? currentForm.captainPlayerId
        : null,
    matchDutyPlayerIds:
      status === "available"
        ? currentForm.matchDutyPlayerIds
        : currentForm.matchDutyPlayerIds.filter(
            (dutyPlayerId) => dutyPlayerId !== playerId,
          ),
    lineupAssignments:
      status === "available"
        ? currentForm.lineupAssignments
        : removePlayerFromAssignments(currentForm.lineupAssignments, playerId),
    playerStatuses: {
      ...currentForm.playerStatuses,
      [playerId]: status,
    },
  }));
}

function updateCaptainPlayer(
  onChangeForm: Dispatch<SetStateAction<MatchSetupFormState>>,
  playerId: number | null,
) {
  onChangeForm((currentForm) => ({
    ...currentForm,
    captainPlayerId: playerId,
  }));
}

function toggleMatchDutyPlayer(
  onChangeForm: Dispatch<SetStateAction<MatchSetupFormState>>,
  currentMatchDutyPlayerIds: number[],
  playerId: number,
) {
  if (currentMatchDutyPlayerIds.includes(playerId)) {
    onChangeForm((currentForm) => ({
      ...currentForm,
      matchDutyPlayerIds: currentForm.matchDutyPlayerIds.filter(
        (dutyPlayerId) => dutyPlayerId !== playerId,
      ),
    }));
    return;
  }

  if (currentMatchDutyPlayerIds.length >= 2) {
    Alert.alert(
      "Match duty full",
      "You can select up to two match duty players.",
    );
    return;
  }

  onChangeForm((currentForm) => ({
    ...currentForm,
    matchDutyPlayerIds: [...currentForm.matchDutyPlayerIds, playerId],
  }));
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

function initializeMatchResultPlayerStats(
  currentStats: MatchPlayerResultStats,
  squadEntries: MatchResultSquadEntry[],
  matchDurationMinutes: number,
): MatchPlayerResultStats {
  return Object.fromEntries(
    squadEntries.map(({ player, role }) => [
      player.id,
      deriveMatchPlayerMinutes(
        currentStats[player.id] ??
          createDefaultMatchPlayerResultStat(role, matchDurationMinutes),
        role,
        matchDurationMinutes,
      ),
    ]),
  );
}

function createDefaultMatchPlayerResultStat(
  role: MatchResultSquadEntry["role"],
  matchDurationMinutes: number,
): MatchPlayerResultStat {
  return {
    goals: 0,
    assists: 0,
    attendance: "present",
    card: "none",
    rating: 6,
    subbedOnMinute: null,
    subbedOffMinute: null,
    minutesPlayed: role === "starter" ? matchDurationMinutes : 0,
  };
}

function deriveMatchPlayerMinutes(
  stat: MatchPlayerResultStat,
  role: MatchResultSquadEntry["role"],
  matchDurationMinutes: number,
): MatchPlayerResultStat {
  if (stat.attendance === "no-show") {
    return {
      ...stat,
      subbedOnMinute: null,
      subbedOffMinute: null,
      minutesPlayed: 0,
    };
  }

  return {
    ...stat,
    minutesPlayed: clampNumber(stat.minutesPlayed, 0, matchDurationMinutes),
    subbedOnMinute: role === "starter" ? null : stat.subbedOnMinute,
    subbedOffMinute: role === "substitute" ? null : stat.subbedOffMinute,
  };
}

function capPlayerScoringToTeamScore(
  currentStats: MatchPlayerResultStats,
  squadEntries: MatchResultSquadEntry[],
  ownScore: number,
  matchDurationMinutes: number,
): MatchPlayerResultStats {
  let remainingGoals = Math.max(0, ownScore);
  let remainingAssists = Math.max(0, ownScore);

  return Object.fromEntries(
    squadEntries.map(({ player, role }) => {
      const stat =
        currentStats[player.id] ??
        createDefaultMatchPlayerResultStat(role, matchDurationMinutes);
      const goals = Math.min(stat.goals, remainingGoals);
      const assists = Math.min(stat.assists, remainingAssists);
      remainingGoals -= goals;
      remainingAssists -= assists;

      return [
        player.id,
        {
          ...stat,
          goals,
          assists,
        },
      ];
    }),
  );
}

function getMaxGoalsForPlayer(
  playerId: number,
  currentGoals: number,
  playerResultStats: MatchPlayerResultStats,
  squadEntries: MatchResultSquadEntry[],
  ownScore: number,
) {
  const otherPlayerGoals = squadEntries.reduce((totalGoals, entry) => {
    if (entry.player.id === playerId) {
      return totalGoals;
    }

    const stat =
      playerResultStats[entry.player.id] ??
      createDefaultMatchPlayerResultStat(
        entry.role,
        defaultMatchDurationMinutes,
      );

    return totalGoals + stat.goals;
  }, 0);

  return currentGoals + Math.max(0, ownScore - otherPlayerGoals - currentGoals);
}

function getMaxAssistsForPlayer(
  playerId: number,
  currentAssists: number,
  playerResultStats: MatchPlayerResultStats,
  squadEntries: MatchResultSquadEntry[],
  ownScore: number,
) {
  const otherPlayerAssists = squadEntries.reduce((totalAssists, entry) => {
    if (entry.player.id === playerId) {
      return totalAssists;
    }

    const stat =
      playerResultStats[entry.player.id] ??
      createDefaultMatchPlayerResultStat(
        entry.role,
        defaultMatchDurationMinutes,
      );

    return totalAssists + stat.assists;
  }, 0);

  return (
    currentAssists + Math.max(0, ownScore - otherPlayerAssists - currentAssists)
  );
}

function normalizeMatchPlayerResultStat(
  stat: MatchPlayerResultStat,
  role: MatchResultSquadEntry["role"],
  matchDurationMinutes: number,
) {
  return deriveMatchPlayerMinutes(
    {
      ...stat,
      goals: Math.max(0, stat.goals),
      assists: Math.max(0, stat.assists),
      rating: Math.min(10, Math.max(1, stat.rating)),
      minutesPlayed: clampNumber(stat.minutesPlayed, 0, matchDurationMinutes),
    },
    role,
    matchDurationMinutes,
  );
}

function getRestoredAttendanceMinutes(
  role: MatchResultSquadEntry["role"],
  matchDurationMinutes: number,
) {
  return role === "starter" ? matchDurationMinutes : 0;
}

function parseNumericInputValue(value: string, min: number, max: number) {
  const numericValue = Number(value.replace(/\D/g, ""));

  if (!Number.isFinite(numericValue)) {
    return min;
  }

  return clampNumber(numericValue, min, max);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function clearSubstitutionMinutes(stat: MatchPlayerResultStat) {
  return {
    ...stat,
    subbedOffMinute: null,
    subbedOnMinute: null,
  };
}

function getAttendanceLabel(attendance: MatchPlayerResultAttendance) {
  switch (attendance) {
    case "late":
      return "Late";
    case "no-show":
      return "No-show";
    default:
      return "Present";
  }
}

function getCardLabel(card: MatchPlayerResultCard) {
  switch (card) {
    case "yellow":
      return "Yellow";
    case "red":
      return "Red";
    default:
      return "None";
  }
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

function getMatchCategoryIcon(
  category: MatchCategory,
): SymbolViewProps["name"] {
  switch (category) {
    case "league":
      return {
        ios: "medal.fill",
        android: "military_tech",
        web: "military_tech",
      };
    case "cup":
      return {
        ios: "trophy.fill",
        android: "emoji_events",
        web: "emoji_events",
      };
    case "friendly":
      return { ios: "person.2.fill", android: "groups", web: "groups" };
  }
}

function hasMatchResult(match: MatchDayMatch) {
  return match.ownScore !== null && match.opponentScore !== null;
}

function isMatchResultActionDue(match: MatchDayMatch) {
  if (hasMatchResult(match)) {
    return false;
  }

  const matchStartDate = parseIsoDateAndDisplayTimeToDate(
    match.matchDate,
    match.startTime,
  );

  if (!matchStartDate) {
    return false;
  }

  const resultDueDate = new Date(matchStartDate);
  resultDueDate.setHours(resultDueDate.getHours() + 3);

  return Date.now() >= resultDueDate.getTime();
}

function parseIsoDateAndDisplayTimeToDate(
  dateValue: string,
  timeValue: string,
) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeValue.trim());

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hours ||
    date.getMinutes() !== minutes
  ) {
    return null;
  }

  return date;
}

function getResultLabel(ownScore: number, opponentScore: number) {
  if (ownScore > opponentScore) {
    return "Win";
  }

  if (ownScore < opponentScore) {
    return "Loss";
  }

  return "Draw";
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
  matchSection: {
    gap: Spacing.two,
  },
  matchSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
    minHeight: 24,
  },
  matchSectionList: {
    gap: Spacing.three,
  },
  matchCard: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
    position: "relative",
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
  matchActionDueDot: {
    backgroundColor: "#FF7A1A",
    borderColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    position: "absolute",
    right: -5,
    top: -5,
    width: 20,
    zIndex: 3,
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
  matchCardActions: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    justifyContent: "center",
    maxWidth: 520,
    width: "100%",
  },
  matchResultPanel: {
    borderRadius: Spacing.two,
    gap: Spacing.one,
    padding: Spacing.two,
  },
  matchResultScore: {
    lineHeight: 34,
  },
  shareMatchButton: {
    alignItems: "center",
    backgroundColor: "#FF7A1A",
    borderRadius: Spacing.two,
    flex: 1,
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 116,
    paddingHorizontal: Spacing.two,
  },
  shareMatchButtonText: {
    color: "#ffffff",
  },
  resultMatchButton: {
    alignItems: "center",
    backgroundColor: "#1C7C54",
    borderRadius: Spacing.two,
    flex: 1,
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 116,
    paddingHorizontal: Spacing.two,
  },
  resultMatchButtonText: {
    color: "#ffffff",
  },
  editMatchButton: {
    alignItems: "center",
    backgroundColor: "#536DFE",
    borderRadius: Spacing.two,
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 116,
    paddingHorizontal: Spacing.three,
    flex: 1,
  },
  editMatchButtonText: {
    color: "#ffffff",
  },
  deleteMatchButton: {
    alignItems: "center",
    backgroundColor: "#DC2626",
    borderRadius: Spacing.two,
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 116,
    paddingHorizontal: Spacing.three,
    flex: 1,
  },
  deleteMatchButtonText: {
    color: "#ffffff",
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
  shareModalSheet: {
    alignSelf: "center",
    backgroundColor: ModalBackgroundColor,
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    gap: Spacing.three,
    maxHeight: "94%",
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: "100%",
  },
  shareModalContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  shareOptionGroup: {
    gap: Spacing.one,
  },
  shareOptionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  shareOptionButton: {
    borderColor: "#111827",
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  shareOptionButtonSelected: {
    backgroundColor: "#111827",
  },
  shareOptionButtonTextSelected: {
    color: "#FFFFFF",
  },
  shareColorPanel: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  shareColorHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  shareColorSectionList: {
    gap: Spacing.three,
  },
  shareColorSection: {
    gap: Spacing.two,
  },
  shareColorFields: {
    gap: Spacing.two,
  },
  shareColorField: {
    gap: Spacing.one,
  },
  shareColorFieldHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shareColorSwatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  shareColorSwatch: {
    borderColor: "#D1D5DB",
    borderRadius: Spacing.one,
    borderWidth: 1,
    height: 28,
    width: 28,
  },
  shareColorSwatchSelected: {
    borderColor: "#111827",
    borderWidth: 3,
  },
  sharePosterFrame: {
    aspectRatio: 1080 / 1350,
    backgroundColor: "#111827",
    borderRadius: Spacing.three,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  sharePosterBackground: {
    height: "100%",
    width: "100%",
  },
  posterOverlay: {
    ...StyleSheet.absoluteFill,
  },
  sharePosterLineupLayer: {
    ...StyleSheet.absoluteFill,
    position: "absolute",
  },
  sharePosterPlayer: {
    alignItems: "center",
    position: "absolute",
    transform: [{ translateX: -40 }, { translateY: -43 }],
    width: 79,
  },
  sharePosterLogoFrame: {
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.1)",
    borderRadius: Spacing.two,
    height: 74,
    justifyContent: "center",
    position: "absolute",
    width: 74,
  },
  sharePosterLogo: {
    height: 58,
    opacity: 0.86,
    width: 58,
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
  resultStep: {
    gap: Spacing.three,
  },
  scoreboard: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  scoreTeam: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.two,
  },
  scoreDivider: {
    lineHeight: 38,
    marginTop: 26,
  },
  scoreStepper: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  scoreStepperButton: {
    alignItems: "center",
    backgroundColor: "#536DFE",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  scoreValue: {
    minWidth: 44,
    textAlign: "center",
  },
  resultSummary: {
    borderRadius: Spacing.two,
    gap: Spacing.half,
    padding: Spacing.two,
  },
  resultReviewStep: {
    gap: Spacing.three,
  },
  resultSubstituteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  resultSubstituteRow: {
    alignItems: "center",
    borderRadius: Spacing.two,
    flexBasis: "31%",
    flexGrow: 1,
    minWidth: 78,
    padding: Spacing.one,
  },
  playerPerformanceStep: {
    gap: Spacing.three,
  },
  playerPerformanceList: {
    gap: Spacing.two,
  },
  playerPerformanceCard: {
    borderRadius: Spacing.two,
    gap: Spacing.two,
    padding: Spacing.two,
  },
  playerPerformanceHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
    minHeight: 48,
  },
  playerPerformanceTitleGroup: {
    flex: 1,
    gap: Spacing.half,
  },
  playerPerformanceControls: {
    gap: Spacing.three,
  },
  performanceControlRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  statStepperGroup: {
    gap: Spacing.one,
    minWidth: 104,
  },
  statStepper: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.one,
  },
  statStepperButton: {
    alignItems: "center",
    backgroundColor: "#536DFE",
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  statStepperValue: {
    minWidth: 28,
    textAlign: "center",
  },
  numericStepperGroup: {
    gap: Spacing.one,
  },
  numericStepper: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: Spacing.one,
  },
  numericStepperInput: {
    backgroundColor: "#ffffff",
    borderColor: "#D1D5DB",
    borderWidth: 1,
    borderRadius: Spacing.two,
    fontSize: 16,
    fontWeight: "700",
    height: 40,
    paddingHorizontal: Spacing.two,
    textAlign: "center",
    width: 64,
  },
  resultSegmentedControl: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  resultSegmentedOption: {
    alignItems: "center",
    borderRadius: Spacing.two,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 92,
    paddingHorizontal: Spacing.two,
  },
  resultSegmentedOptionSelected: {
    backgroundColor: "#536DFE",
  },
  resultSegmentedOptionTextSelected: {
    color: "#ffffff",
  },
  subControlGroup: {
    gap: Spacing.two,
  },
  minutesSummary: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: Spacing.two,
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
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
  responsibilityPanel: {
    borderRadius: Spacing.three,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  responsibilityGroup: {
    gap: Spacing.two,
  },
  responsibilityOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  playerRoleOption: {
    alignItems: "center",
    borderRadius: Spacing.two,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 112,
    paddingHorizontal: Spacing.two,
  },
  playerRoleOptionSelected: {
    backgroundColor: "#536DFE",
  },
  playerRoleOptionTextSelected: {
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
    aspectRatio: 981 / 1604,
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
    height: 84,
    justifyContent: "center",
    marginLeft: -48,
    marginTop: -42,
    position: "absolute",
    width: 96,
  },
  reviewLists: {
    gap: Spacing.three,
  },
  reviewListSection: {
    gap: Spacing.two,
  },
  reviewRoleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  reviewRoleCard: {
    borderRadius: Spacing.two,
    flex: 1,
    gap: Spacing.half,
    minWidth: 148,
    padding: Spacing.two,
  },
  reviewPlayerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  reviewPlayerRow: {
    alignItems: "flex-start",
    flexBasis: "48%",
    flexDirection: "row",
    gap: Spacing.one,
    minWidth: 148,
  },
  reviewPlayerSlotLabel: {
    width: 32,
  },
  reviewPlayerName: {
    flexShrink: 1,
    lineHeight: 18,
    maxWidth: 190,
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
    aspectRatio: 981 / 1604,
    borderRadius: Spacing.three,
    maxHeight: 720,
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
    height: 98,
    marginLeft: -55,
    marginTop: -49,
    width: 110,
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
    height: 98,
    justifyContent: "center",
    width: 88,
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
    position: "relative",
    width: 108,
  },
  jerseyWrapperCompact: {
    width: 96,
  },
  jerseyWrapperDense: {
    width: 78,
  },
  jerseyShape: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 72,
    justifyContent: "center",
    position: "relative",
    width: 84,
  },
  jerseyShapeCompact: {
    height: 54,
    width: 64,
  },
  jerseyShapeDense: {
    height: 45,
    width: 53,
  },
  goalkeeperJerseyShape: {
    backgroundColor: "transparent",
  },
  jerseySvg: {
    height: "100%",
    position: "absolute",
    width: "100%",
  },
  jerseySvgCompact: {
    height: "100%",
    width: "100%",
  },
  jerseyNumber: {
    color: "#111827",
    fontSize: 24,
    lineHeight: 28,
    marginTop: 10,
    textShadowColor: "#ffffff",
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 2,
    zIndex: 3,
  },
  goalkeeperJerseyNumber: {
    color: "#ffffff",
    textShadowColor: "#111827",
  },
  jerseyNumberCompact: {
    fontSize: 16,
    lineHeight: 19,
    marginTop: 8,
  },
  jerseyNumberDense: {
    fontSize: 13,
    lineHeight: 16,
    marginTop: 6,
  },
  jerseyNameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.half,
    justifyContent: "center",
    maxWidth: 100,
  },
  jerseyNameRowCompact: {
    maxWidth: 88,
  },
  jerseyNameRowDense: {
    maxWidth: 74,
  },
  captainBadge: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#111827",
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: -3,
    width: 22,
    zIndex: 12,
  },
  captainBadgeCompact: {
    height: 17,
    right: 5,
    top: -4,
    width: 17,
  },
  captainBadgeDense: {
    height: 16,
    right: -1,
    top: -2,
    width: 16,
  },
  captainBadgeText: {
    color: "#111827",
    fontSize: 14,
    lineHeight: 16,
  },
  captainBadgeTextCompact: {
    fontSize: 10,
    lineHeight: 12,
  },
  captainBadgeTextDense: {
    fontSize: 9,
    lineHeight: 11,
  },
  jerseyName: {
    // backgroundColor: "rgba(15, 23, 42, 0.62)",
    borderRadius: Spacing.one,
    color: "#ffffff",
    flexShrink: 1,
    lineHeight: 16,
    maxWidth: 100,
    paddingHorizontal: Spacing.one,
    textAlign: "center",
    textShadowColor: "#000000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  jerseyNameCompact: {
    maxWidth: 84,
  },
  jerseyNameDense: {
    lineHeight: 16,
    maxWidth: 72,
  },
  jerseyResultOverlay: {
    backgroundColor: "transparent",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 8,
  },
  jerseyResultOverlayCompact: {
    bottom: -1,
    left: -4,
    right: -4,
    top: -1,
  },
  jerseyResultIconBadge: {
    alignItems: "center",
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    overflow: "hidden",
    position: "absolute",
    width: 24,
  },
  jerseyResultIconBadgeCompact: {
    height: 20,
    width: 20,
  },
  jerseyResultSubBadge: {
    left: 5,
    top: -4,
  },
  jerseyResultCardShell: {
    alignItems: "center",
    borderRadius: 999,
    height: 26,
    justifyContent: "center",
    left: -2,
    overflow: "hidden",
    position: "absolute",
    top: 29,
    width: 26,
  },
  jerseyResultCardShellCompact: {
    height: 20,
    left: 5,
    top: 17,
    width: 20,
  },
  jerseyResultEventBadge: {
    alignItems: "center",
    borderRadius: 999,
    height: 26,
    justifyContent: "center",
    overflow: "hidden",
    width: 26,
    zIndex: 1,
  },
  jerseyResultEventBadgeCompact: {
    height: 20,
    width: 20,
  },
  jerseyResultGoalStack: {
    alignItems: "center",
    bottom: -2,
    height: 26,
    left: 5,
    position: "absolute",
    width: 26,
  },
  jerseyResultGoalStackCompact: {
    height: 20,
    width: 20,
  },
  jerseyResultGoalBadge: {
    position: "absolute",
  },
  jerseyResultAssistStack: {
    alignItems: "center",
    bottom: -2,
    height: 26,
    position: "absolute",
    right: 5,
    width: 26,
  },
  jerseyResultAssistStackCompact: {
    height: 20,
    width: 20,
  },
  jerseyResultAssistBadge: {
    backgroundColor: "#111827",
    overflow: "hidden",
    padding: 0,
    position: "absolute",
  },
  jerseyResultAssistImage: {
    height: 26,
    width: 26,
  },
  jerseyResultAssistImageCompact: {
    height: 20,
    width: 20,
  },
  jerseyResultImageBadge: {
    height: "100%",
    width: "100%",
  },
  jerseyResultImageBadgeCompact: {
    height: "100%",
    width: "100%",
  },
  jerseyResultEventCount: {
    backgroundColor: "#111827",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 8,
    lineHeight: 10,
    minWidth: 11,
    overflow: "hidden",
    position: "absolute",
    right: -4,
    textAlign: "center",
    top: -4,
    zIndex: 20,
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
