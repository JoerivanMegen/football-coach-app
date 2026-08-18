import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { ClipPath, Defs, G, Path, Rect } from "react-native-svg";

import { OutlinedText } from "@/components/outlined-text";
import { StepperArrowButton } from "@/components/stepper-arrow-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  ActionColors,
  AppHeaderHeight,
  BottomTabInset,
  CompactScreenTopMargin,
  MaxContentWidth,
  PageTopPadding,
  Spacing,
} from "@/constants/theme";
import { listEventsAsync } from "@/features/events/event-repository";
import { listMatchDayMatchesAsync } from "@/features/match-day/match-day-repository";
import type { MatchDayMatch } from "@/features/match-day/match-day-types";
import { isTrainingAttendanceOverdue } from "@/features/notifications/match-result-notifications";
import { listPlayersAsync } from "@/features/players/player-repository";
import {
  getTeamSettingsAsync,
  saveTeamSettingsAsync,
} from "@/features/settings/team-settings-repository";
import type {
  KitDesign,
  SaveTeamSettingsInput,
} from "@/features/settings/team-settings-types";
import { useTheme } from "@/hooks/use-theme";
import type { TranslationKey } from "@/i18n/generated/translations";
import { useI18n } from "@/i18n/i18n-provider";

type HomeAction = {
  title: string;
  description: string;
  iconName: SymbolViewProps["name"];
  href: Href;
  showNotification?: boolean;
  priority?: number;
};

type UpcomingMatchHighlight = {
  isWithinFinalTwoDays: boolean;
  match: MatchDayMatch;
};

const defaultTeamSettingsForm: SaveTeamSettingsInput = {
  teamName: "",
  clubLocation: "",
  kitDesign: "solid",
  outfieldKitColor: "#FFFFFF",
  secondaryKitColor: "#536DFE",
  thirdKitColor: "#EF4444",
  kitNumberColor: "#111827",
  goalkeeperKitColor: "#111827",
  matchDurationMinutes: 90,
  trainingDays: [],
  trainingStartTime: "",
  preferNicknames: false,
  fineJarEnabled: false,
  fineJarCurrency: "GBP",
  matchDutyEnabled: true,
  includeFriendlyMatchesInStats: true,
};

const kitShirtPath =
  "M34 7 C38 11 62 11 66 7 L76 7 L95 25 Q98 27 96 31 L87 47 Q85 51 81 49 L73 44 L73 83 Q73 87 69 87 L31 87 Q27 87 27 83 L27 44 L19 49 Q15 51 13 47 L4 31 Q2 27 5 25 L24 7 Z";

const kitDesignOptions = [
  { value: "solid", labelKey: "settings.kit.patterns.regular" },
  { value: "stripes", labelKey: "settings.kit.patterns.stripes" },
  {
    value: "twoColorStripes",
    labelKey: "settings.kit.patterns.three_color_stripes",
  },
  { value: "hoops", labelKey: "settings.kit.patterns.hoops" },
  { value: "sash", labelKey: "settings.kit.patterns.two_color_sash" },
  { value: "halves", labelKey: "settings.kit.patterns.halves" },
  { value: "sides", labelKey: "settings.kit.patterns.sides" },
] satisfies { value: KitDesign; labelKey: TranslationKey }[];

const colorOptions = [
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

export default function HomeScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const { locale, t } = useI18n();
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SaveTeamSettingsInput>(
    defaultTeamSettingsForm,
  );
  const [settingsStep, setSettingsStep] = useState<0 | 1>(0);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [injuredPlayerCount, setInjuredPlayerCount] = useState(0);
  const [overdueMatchResultCount, setOverdueMatchResultCount] = useState(0);
  const [hasTraining, setHasTraining] = useState(false);
  const [hasMatch, setHasMatch] = useState(false);
  const [overdueTrainingAttendanceCount, setOverdueTrainingAttendanceCount] =
    useState(0);
  const [upcomingMatchHighlight, setUpcomingMatchHighlight] =
    useState<UpcomingMatchHighlight | null>(null);
  const [recentWin, setRecentWin] = useState<MatchDayMatch | null>(null);
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  useFocusEffect(
    useCallback(() => {
      let isFocused = true;

      async function loadHomeData() {
        try {
          const [settings, players, matches, events] = await Promise.all([
            getTeamSettingsAsync(),
            listPlayersAsync(),
            listMatchDayMatchesAsync(),
            listEventsAsync(),
          ]);

          if (!isFocused) {
            return;
          }

          setPlayerCount(players.length);
          setInjuredPlayerCount(
            players.filter((player) => player.activeInjuryStartDate !== null)
              .length,
          );
          setOverdueMatchResultCount(
            matches.filter((match) => isMatchResultOverdue(match, new Date()))
              .length,
          );
          setUpcomingMatchHighlight(
            getUpcomingMatchHighlight(matches, new Date()),
          );
          setRecentWin(getRecentWin(matches, new Date()));
          setHasTraining(events.some((event) => event.type === "training"));
          setHasMatch(matches.length > 0);
          setOverdueTrainingAttendanceCount(
            events.filter(
              (event) =>
                event.type === "training" &&
                isTrainingAttendanceOverdue(
                  event.eventDate,
                  event.startTime,
                  event.attendanceStatus,
                ),
            ).length,
          );

          if (!settings) {
            setSettingsForm({
              ...defaultTeamSettingsForm,
              fineJarCurrency: locale === "nl" ? "EUR" : "GBP",
            });
            setSettingsStep(0);
            setIsSettingsModalVisible(true);
            return;
          }

          setIsSettingsModalVisible(false);

          setSettingsForm({
            teamName: settings.teamName,
            clubLocation: settings.clubLocation,
            kitDesign: settings.kitDesign,
            outfieldKitColor: settings.outfieldKitColor,
            secondaryKitColor: settings.secondaryKitColor,
            thirdKitColor: settings.thirdKitColor,
            kitNumberColor: settings.kitNumberColor,
            goalkeeperKitColor: settings.goalkeeperKitColor,
            matchDurationMinutes: settings.matchDurationMinutes,
            trainingDays: settings.trainingDays,
            trainingStartTime: settings.trainingStartTime,
            preferNicknames: settings.preferNicknames,
            fineJarEnabled: settings.fineJarEnabled,
            fineJarCurrency: settings.fineJarCurrency,
            matchDutyEnabled: settings.matchDutyEnabled,
            includeFriendlyMatchesInStats:
              settings.includeFriendlyMatchesInStats,
          });
        } catch (error) {
          console.warn("Failed to load home data", error);
        }
      }

      void loadHomeData();

      return () => {
        isFocused = false;
      };
    }, [locale]),
  );

  async function handleSaveSettings() {
    setSettingsError(null);

    if (!settingsForm.teamName.trim()) {
      setSettingsError(t("dashboard.setup.errors.team_name_required"));
      setSettingsStep(0);
      return;
    }

    if (
      !Number.isFinite(settingsForm.matchDurationMinutes) ||
      settingsForm.matchDurationMinutes < 1 ||
      settingsForm.matchDurationMinutes > 120
    ) {
      setSettingsError(t("dashboard.setup.errors.invalid_match_minutes"));
      setSettingsStep(1);
      return;
    }

    setIsSavingSettings(true);

    try {
      await saveTeamSettingsAsync(settingsForm);
      setIsSettingsModalVisible(false);
    } catch (error) {
      console.warn("Failed to save team settings", error);
      setSettingsError(t("dashboard.setup.errors.invalid_values"));
    } finally {
      setIsSavingSettings(false);
    }
  }

  function handleContinueSettings() {
    setSettingsError(null);

    if (!settingsForm.teamName.trim()) {
      setSettingsError(t("dashboard.setup.errors.team_name_required"));
      return;
    }

    setSettingsStep(1);
  }

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
  const hasNoPlayers = playerCount === 0;
  const homeActions = (
    [
      ...(playerCount !== null && playerCount < 11
        ? [
            {
              title: hasNoPlayers
                ? t("dashboard.actions.add_first_players.title")
                : t("dashboard.actions.players.title"),
              description: hasNoPlayers
                ? t("dashboard.actions.add_first_players.description")
                : t("dashboard.actions.players.description"),
              iconName: {
                ios: "person.3.fill" as const,
                android: "groups" as const,
                web: "groups" as const,
              },
              href: "/players" as const,
              showNotification: hasNoPlayers,
            },
          ]
        : []),
      ...(!hasTraining
        ? [
            {
              title: t("dashboard.actions.add_training.title"),
              description: t("dashboard.actions.add_training.description"),
              iconName: {
                ios: "calendar.badge.plus" as const,
                android: "event" as const,
                web: "event" as const,
              },
              href: "/events" as const,
            },
          ]
        : []),
      ...(!hasMatch
        ? [
            {
              title: t("dashboard.actions.add_match.title"),
              description: t("dashboard.actions.add_match.description"),
              iconName: {
                ios: "sportscourt.fill" as const,
                android: "sports_soccer" as const,
                web: "sports_soccer" as const,
              },
              href: "/match-day" as const,
            },
          ]
        : []),
      ...(overdueTrainingAttendanceCount > 0
        ? [
            {
              title:
                overdueTrainingAttendanceCount === 1
                  ? t("dashboard.actions.add_training_attendance.title")
                  : t("dashboard.actions.add_training_attendance.title_plural"),
              description:
                overdueTrainingAttendanceCount === 1
                  ? t("dashboard.actions.add_training_attendance.description")
                  : t(
                      "dashboard.actions.add_training_attendance.description_plural",
                      {
                        count: overdueTrainingAttendanceCount,
                      },
                    ),
              iconName: {
                ios: "exclamationmark.circle.fill" as const,
                android: "notification_important" as const,
                web: "notification_important" as const,
              },
              href: "/events" as const,
              showNotification: true,
              priority: 2,
            },
          ]
        : []),
      ...(overdueMatchResultCount > 0
        ? [
            {
              title:
                overdueMatchResultCount === 1
                  ? t("dashboard.actions.add_match_result.title")
                  : t("dashboard.actions.add_match_result.title_plural"),
              description:
                overdueMatchResultCount === 1
                  ? t("dashboard.actions.add_match_result.waiting_description")
                  : t(
                      "dashboard.actions.add_match_result.waiting_description_plural",
                      { count: overdueMatchResultCount },
                    ),
              iconName: {
                ios: "exclamationmark.circle.fill" as const,
                android: "notification_important" as const,
                web: "notification_important" as const,
              },
              href: "/match-day" as const,
              showNotification: true,
              priority: 3,
            },
          ]
        : []),
    ] satisfies HomeAction[]
  ).sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));

  return (
    <>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentInset={insets}
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
      >
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              {t("dashboard.header.title")}
            </ThemedText>
            {injuredPlayerCount > 0 ? (
              <ThemedView type="backgroundElement" style={styles.injurySummary}>
                <SymbolView
                  name={{
                    ios: "cross.case.fill",
                    android: "healing",
                    web: "healing",
                  }}
                  tintColor={ActionColors.danger}
                  size={18}
                />
                <ThemedText type="smallBold">
                  {t(
                    injuredPlayerCount === 1
                      ? "dashboard.header.injuries"
                      : "dashboard.header.injuries_plural",
                    { count: injuredPlayerCount },
                  )}
                </ThemedText>
              </ThemedView>
            ) : null}
          </ThemedView>

          {upcomingMatchHighlight ? (
            upcomingMatchHighlight.isWithinFinalTwoDays ? (
              <ThemedView type="backgroundElement" style={styles.nextMatchCard}>
                <ThemedView
                  type="backgroundSelected"
                  style={styles.nextMatchIcon}
                >
                  <SymbolView
                    name={{
                      ios: "sportscourt.fill",
                      android: "sports_soccer",
                      web: "sports_soccer",
                    }}
                    tintColor={ActionColors.primary}
                    size={26}
                  />
                </ThemedView>
                <ThemedText type="smallBold" style={styles.nextMatchText}>
                  {t("dashboard.next_match.good_luck", {
                    opponent: upcomingMatchHighlight.match.opponent,
                  })}
                </ThemedText>
              </ThemedView>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("dashboard.next_match.open_training")}
                onPress={() => router.push("/events")}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <ThemedView
                  type="backgroundElement"
                  style={styles.nextMatchCard}
                >
                  <ThemedView
                    type="backgroundSelected"
                    style={styles.nextMatchIcon}
                  >
                    <MaterialCommunityIcons
                      name="traffic-cone"
                      color={ActionColors.primary}
                      size={28}
                    />
                  </ThemedView>
                  <ThemedText type="smallBold" style={styles.nextMatchText}>
                    {t("dashboard.next_match.preparation", {
                      opponent: upcomingMatchHighlight.match.opponent,
                    })}
                  </ThemedText>
                  <SymbolView
                    name={{
                      ios: "chevron.right",
                      android: "chevron_right",
                      web: "chevron_right",
                    }}
                    tintColor={ActionColors.primary}
                    size={20}
                  />
                </ThemedView>
              </Pressable>
            )
          ) : null}

          {recentWin ? (
            <ThemedView type="backgroundElement" style={styles.recentWinCard}>
              <ThemedView style={styles.recentWinContent}>
                <ThemedText type="default">
                  {t("dashboard.recent_win.message")}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t("dashboard.recent_win.result", {
                    score: `${recentWin.ownScore}-${recentWin.opponentScore}`,
                    opponent: recentWin.opponent,
                  })}
                </ThemedText>
              </ThemedView>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  "dashboard.recent_win.share_accessibility",
                  { opponent: recentWin.opponent },
                )}
                onPress={() =>
                  router.push({
                    pathname: "/match-day",
                    params: { shareMatchId: String(recentWin.id) },
                  })
                }
                style={({ pressed }) => [
                  styles.recentWinShareButton,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{
                    ios: "square.and.arrow.up",
                    android: "share",
                    web: "share",
                  }}
                  tintColor={ActionColors.onAccent}
                  size={18}
                />
                <ThemedText type="smallBold" style={styles.recentWinShareText}>
                  {t("dashboard.recent_win.share")}
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : null}

          <ThemedView style={styles.actionsSection}>
            <ThemedText type="default">
              {t("dashboard.actions.title")}
            </ThemedText>
            <ThemedView style={styles.actionsGrid}>
              {homeActions.map((action) => (
                <Pressable
                  key={action.title}
                  accessibilityRole="button"
                  accessibilityLabel={action.title}
                  onPress={() => router.push(action.href)}
                  style={({ pressed }) => [
                    styles.actionPressable,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedView
                    type="backgroundElement"
                    style={styles.actionCard}
                  >
                    {action.showNotification ? (
                      <ThemedView style={styles.actionNotificationDot} />
                    ) : null}
                    <ThemedView
                      type="backgroundSelected"
                      style={styles.iconContainer}
                    >
                      <SymbolView
                        name={action.iconName}
                        tintColor={theme.dashboardIcon}
                        size={24}
                      />
                    </ThemedView>
                    <ThemedView
                      type="backgroundElement"
                      style={styles.actionContent}
                    >
                      <ThemedText type="default">{action.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {action.description}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                </Pressable>
              ))}
            </ThemedView>
            <ThemedView style={styles.shortcutRow}>
              <DashboardShortcut
                label={t("dashboard.actions.shortcuts.training")}
                iconType="training"
                onPress={() => router.push("/events")}
              />
              <DashboardShortcut
                label={t("dashboard.actions.shortcuts.match_day")}
                iconName={{
                  ios: "sportscourt.fill",
                  android: "sports_soccer",
                  web: "sports_soccer",
                }}
                onPress={() => router.push("/match-day")}
              />
            </ThemedView>
            <DashboardWideShortcut
              label={t("dashboard.actions.shortcuts.team_stats")}
              iconName={{
                ios: "chart.bar.xaxis",
                android: "bar_chart",
                web: "bar_chart",
              }}
              onPress={() =>
                router.push({
                  pathname: "/players",
                  params: { openTeamStats: "true" },
                })
              }
            />
          </ThemedView>
        </ThemedView>
      </ScrollView>

      <TeamSettingsSetupModal
        error={settingsError}
        form={settingsForm}
        isSaving={isSavingSettings}
        onChange={setSettingsForm}
        onBack={() => setSettingsStep(0)}
        onContinue={handleContinueSettings}
        onSave={handleSaveSettings}
        step={settingsStep}
        visible={isSettingsModalVisible}
      />
    </>
  );
}

function DashboardShortcut({
  iconName,
  iconType,
  label,
  onPress,
}: {
  iconName?: SymbolViewProps["name"];
  iconType?: "training";
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortcutPressable,
        pressed && styles.pressed,
      ]}
    >
      <ThemedView type="backgroundElement" style={styles.shortcutCard}>
        <ThemedView type="backgroundSelected" style={styles.shortcutIcon}>
          {iconType === "training" ? (
            <MaterialCommunityIcons
              name="traffic-cone"
              color={theme.dashboardIcon}
              size={30}
            />
          ) : iconName ? (
            <SymbolView
              name={iconName}
              tintColor={theme.dashboardIcon}
              size={28}
            />
          ) : null}
        </ThemedView>
        <ThemedText type="smallBold" style={styles.shortcutLabel}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function DashboardWideShortcut({
  iconName,
  label,
  onPress,
}: {
  iconName: SymbolViewProps["name"];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.wideShortcutPressable,
        pressed && styles.pressed,
      ]}
    >
      <ThemedView type="backgroundElement" style={styles.wideShortcutCard}>
        <ThemedView type="backgroundSelected" style={styles.wideShortcutIcon}>
          <SymbolView
            name={iconName}
            tintColor={theme.dashboardIcon}
            size={24}
          />
        </ThemedView>
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function getUpcomingMatchHighlight(
  matches: MatchDayMatch[],
  now: Date,
): UpcomingMatchHighlight | null {
  const sevenDaysInMilliseconds = 7 * 24 * 60 * 60 * 1000;
  const finalTwoDaysInMilliseconds = 2 * 24 * 60 * 60 * 1000;
  const upcomingMatches = matches
    .map((match) => ({ match, kickoff: getMatchKickoff(match) }))
    .filter(
      (entry): entry is { match: MatchDayMatch; kickoff: Date } =>
        entry.kickoff !== null &&
        entry.kickoff.getTime() >= now.getTime() &&
        entry.kickoff.getTime() - now.getTime() <= sevenDaysInMilliseconds,
    )
    .sort(
      (firstMatch, secondMatch) =>
        firstMatch.kickoff.getTime() - secondMatch.kickoff.getTime(),
    );

  const nextMatch = upcomingMatches[0];
  if (!nextMatch) {
    return null;
  }

  return {
    match: nextMatch.match,
    isWithinFinalTwoDays:
      nextMatch.kickoff.getTime() - now.getTime() <= finalTwoDaysInMilliseconds,
  };
}

function getMatchKickoff(match: MatchDayMatch) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(match.matchDate);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(match.startTime);
  if (!dateMatch || !timeMatch) {
    return null;
  }

  return new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );
}

function getRecentWin(matches: MatchDayMatch[], now: Date) {
  const fourDaysInMilliseconds = 4 * 24 * 60 * 60 * 1000;

  return (
    matches
      .filter(
        (match) =>
          match.ownScore !== null &&
          match.opponentScore !== null &&
          match.ownScore > match.opponentScore,
      )
      .map((match) => ({ match, kickoff: getMatchKickoff(match) }))
      .filter(
        (entry): entry is { match: MatchDayMatch; kickoff: Date } =>
          entry.kickoff !== null &&
          entry.kickoff.getTime() <= now.getTime() &&
          now.getTime() - entry.kickoff.getTime() <= fourDaysInMilliseconds,
      )
      .sort(
        (firstMatch, secondMatch) =>
          secondMatch.kickoff.getTime() - firstMatch.kickoff.getTime(),
      )[0]?.match ?? null
  );
}

function isMatchResultOverdue(match: MatchDayMatch, now: Date) {
  if (match.ownScore !== null && match.opponentScore !== null) return false;

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(match.matchDate);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(match.startTime);
  if (!dateMatch || !timeMatch) return false;

  const startTime = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );
  return now.getTime() - startTime.getTime() >= 3 * 60 * 60 * 1000;
}

function TeamSettingsSetupModal({
  error,
  form,
  isSaving,
  onChange,
  onBack,
  onContinue,
  onSave,
  step,
  visible,
}: {
  error: string | null;
  form: SaveTeamSettingsInput;
  isSaving: boolean;
  onChange: (form: SaveTeamSettingsInput) => void;
  onBack: () => void;
  onContinue: () => void;
  onSave: () => void;
  step: 0 | 1;
  visible: boolean;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  function updateFormValue<Key extends keyof SaveTeamSettingsInput>(
    key: Key,
    value: SaveTeamSettingsInput[Key],
  ) {
    onChange({ ...form, [key]: value });
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => undefined}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.settingsModalOverlay}
      >
        <ThemedView type="modalBackground" style={styles.settingsModalCard}>
          <ThemedView style={styles.settingsModalHeader}>
            <ThemedText type="subtitle" style={styles.settingsModalTitle}>
              {t("dashboard.actions.setup_team.title")}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {t("dashboard.actions.setup_team.description")}
            </ThemedText>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t("dashboard.setup.header.step_progress", {
                step: step + 1,
                total: 2,
              })}
            </ThemedText>
          </ThemedView>

          <ScrollView
            style={styles.settingsModalScroll}
            contentContainerStyle={styles.settingsModalForm}
          >
            {step === 0 ? (
              <>
                <ThemedView style={styles.settingsFieldGroup}>
                  <ThemedText type="smallBold">
                    {t("dashboard.setup.team_details.team_name")}
                  </ThemedText>
                  <TextInput
                    autoCapitalize="words"
                    autoCorrect={false}
                    placeholder={t(
                      "dashboard.setup.team_details.team_name_placeholder",
                    )}
                    placeholderTextColor={theme.textSecondary}
                    value={form.teamName}
                    onChangeText={(value) => updateFormValue("teamName", value)}
                    style={[
                      styles.settingsTextInput,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                      },
                    ]}
                  />
                </ThemedView>

                <ThemedView style={styles.settingsFieldGroup}>
                  <ThemedText type="smallBold">
                    {t("dashboard.setup.team_details.club_location")}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t("dashboard.setup.team_details.club_location_help")}
                  </ThemedText>
                  <TextInput
                    autoCapitalize="words"
                    autoCorrect={false}
                    placeholder={t(
                      "dashboard.setup.team_details.club_location_placeholder",
                    )}
                    placeholderTextColor={theme.textSecondary}
                    value={form.clubLocation}
                    onChangeText={(value) =>
                      updateFormValue("clubLocation", value)
                    }
                    style={[
                      styles.settingsTextInput,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                      },
                    ]}
                  />
                </ThemedView>

                <SettingsKitDesignField
                  form={form}
                  onChange={(kitDesign) =>
                    updateFormValue("kitDesign", kitDesign)
                  }
                />

                <SettingsColorField
                  label={t("settings.kit.player_primary")}
                  value={form.outfieldKitColor}
                  onChange={(value) =>
                    updateFormValue("outfieldKitColor", value)
                  }
                />
                <SettingsColorField
                  label={t("settings.kit.player_secondary")}
                  value={form.secondaryKitColor}
                  onChange={(value) =>
                    updateFormValue("secondaryKitColor", value)
                  }
                />
                {form.kitDesign === "sash" ||
                form.kitDesign === "twoColorStripes" ? (
                  <SettingsColorField
                    label={t("dashboard.setup.kit.third_colour")}
                    value={form.thirdKitColor}
                    onChange={(value) =>
                      updateFormValue("thirdKitColor", value)
                    }
                  />
                ) : null}
                <SettingsColorField
                  label={t("dashboard.setup.kit.number_colour")}
                  value={form.kitNumberColor}
                  onChange={(value) => updateFormValue("kitNumberColor", value)}
                />
                <SettingsColorField
                  label={t("settings.kit.goalkeeper_primary")}
                  value={form.goalkeeperKitColor}
                  onChange={(value) =>
                    updateFormValue("goalkeeperKitColor", value)
                  }
                />
              </>
            ) : (
              <SettingsPreferencesStep form={form} onChange={updateFormValue} />
            )}

            {error ? (
              <ThemedText type="smallBold" style={styles.settingsError}>
                {error}
              </ThemedText>
            ) : null}

            {step === 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  "dashboard.setup.actions.continue_team_settings",
                )}
                onPress={onContinue}
                style={({ pressed }) => [
                  styles.settingsSaveButton,
                  styles.settingsNextButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={styles.settingsSaveButtonText}
                >
                  {t("common.next")}
                </ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>

          {step === 1 ? (
            <ThemedView style={styles.settingsFooter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("dashboard.setup.actions.back_to_kit")}
                disabled={isSaving}
                onPress={onBack}
                style={({ pressed }) => [
                  styles.settingsBackButton,
                  pressed && styles.pressed,
                  isSaving && styles.disabledButton,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={styles.settingsBackButtonText}
                >
                  {t("common.back")}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("dashboard.setup.actions.save")}
                disabled={isSaving}
                onPress={onSave}
                style={({ pressed }) => [
                  styles.settingsSaveButton,
                  styles.settingsFooterButton,
                  pressed && styles.pressed,
                  isSaving && styles.disabledButton,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={styles.settingsSaveButtonText}
                >
                  {isSaving
                    ? t("dashboard.setup.actions.saving")
                    : t("dashboard.setup.actions.save")}
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : null}
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SettingsKitDesignField({
  form,
  onChange,
}: {
  form: SaveTeamSettingsInput;
  onChange: (value: KitDesign) => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <ThemedView style={styles.settingsFieldGroup}>
      <ThemedText type="smallBold">{t("dashboard.setup.kit.title")}</ThemedText>
      <ThemedView style={styles.kitDesignLayout}>
        <ThemedView style={styles.kitDesignOptions}>
          {kitDesignOptions.map((option) => {
            const isSelected = form.kitDesign === option.value;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={t(option.labelKey)}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onChange(option.value)}
                style={({ pressed }) => [
                  styles.kitDesignOption,
                  {
                    borderColor: isSelected
                      ? "#1C7C54"
                      : theme.backgroundSelected,
                  },
                  isSelected && styles.kitDesignOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={isSelected && styles.kitDesignOptionTextSelected}
                >
                  {t(option.labelKey)}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>
        <KitDesignPreview form={form} />
      </ThemedView>
    </ThemedView>
  );
}

function SettingsPreferencesStep({
  form,
  onChange,
}: {
  form: SaveTeamSettingsInput;
  onChange: <Key extends keyof SaveTeamSettingsInput>(
    key: Key,
    value: SaveTeamSettingsInput[Key],
  ) => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  function updateMatchMinutes(value: number) {
    onChange("matchDurationMinutes", Math.min(Math.max(value, 1), 120));
  }

  function updateMatchMinutesText(value: string) {
    const numericValue = Number(value.replace(/\D/g, ""));
    onChange(
      "matchDurationMinutes",
      Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0,
    );
  }

  return (
    <>
      <ThemedView style={styles.settingsFieldGroup}>
        <ThemedText type="smallBold">
          {t("settings.match_preferences.match_minutes")}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("settings.match_preferences.match_minutes_help")}
        </ThemedText>
        <ThemedView style={styles.settingsNumberRow}>
          <StepperArrowButton
            accessibilityLabel={t(
              "settings.match_preferences.decrease_match_minutes",
            )}
            direction="left"
            onPress={() => updateMatchMinutes(form.matchDurationMinutes - 5)}
          />
          <TextInput
            keyboardType="number-pad"
            maxLength={3}
            value={
              form.matchDurationMinutes > 0
                ? String(form.matchDurationMinutes)
                : ""
            }
            onChangeText={updateMatchMinutesText}
            style={[
              styles.settingsNumberInput,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
                color: theme.text,
              },
            ]}
          />
          <StepperArrowButton
            accessibilityLabel={t(
              "settings.match_preferences.increase_match_minutes",
            )}
            direction="right"
            onPress={() => updateMatchMinutes(form.matchDurationMinutes + 5)}
          />
        </ThemedView>
      </ThemedView>

      <SettingsSegmentedField
        label={t("settings.match_preferences.player_names.title")}
        options={[
          {
            label: t("settings.match_preferences.player_names.nicknames"),
            value: true,
          },
          {
            label: t("settings.match_preferences.player_names.first_names"),
            value: false,
          },
        ]}
        value={form.preferNicknames}
        onChange={(value) => onChange("preferNicknames", value)}
      />

      <SettingsSegmentedField
        label={t("settings.match_preferences.fine_jar.title")}
        helperText={t("settings.match_preferences.fine_jar.description")}
        options={[
          {
            label: t("settings.match_preferences.fine_jar.enabled"),
            value: true,
          },
          {
            label: t("settings.match_preferences.fine_jar.disabled"),
            value: false,
          },
        ]}
        value={form.fineJarEnabled}
        onChange={(value) => onChange("fineJarEnabled", value)}
      />

      <SettingsSegmentedField
        label={t("settings.match_preferences.match_duties.title")}
        helperText={t("settings.match_preferences.match_duties.description")}
        options={[
          {
            label: t("settings.match_preferences.match_duties.enabled"),
            value: true,
          },
          {
            label: t("settings.match_preferences.match_duties.disabled"),
            value: false,
          },
        ]}
        value={form.matchDutyEnabled}
        onChange={(value) => onChange("matchDutyEnabled", value)}
      />
    </>
  );
}

function SettingsSegmentedField({
  helperText,
  label,
  onChange,
  options,
  value,
}: {
  helperText?: string;
  label: string;
  onChange: (value: boolean) => void;
  options: { label: string; value: boolean }[];
  value: boolean;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.settingsFieldGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {helperText ? (
        <ThemedText type="small" themeColor="textSecondary">
          {helperText}
        </ThemedText>
      ) : null}
      <ThemedView style={styles.settingsSegmentedRow}>
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.settingsSegmentedOption,
                {
                  borderColor: isSelected
                    ? "#1C7C54"
                    : theme.backgroundSelected,
                },
                isSelected && styles.settingsSegmentedOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={isSelected && styles.settingsSegmentedOptionTextSelected}
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

function KitDesignPreview({ form }: { form: SaveTeamSettingsInput }) {
  const kitOutlineColor = "#111827";

  return (
    <ThemedView style={styles.kitPreviewFrame}>
      <ThemedView style={styles.kitPreviewShirt}>
        <Svg viewBox="0 0 100 90" style={styles.kitPreviewSvg}>
          <Defs>
            <ClipPath id="settingsKitPreviewClip">
              <Path d={kitShirtPath} />
            </ClipPath>
          </Defs>
          <Path d={kitShirtPath} fill={form.outfieldKitColor} />
          <G clipPath="url(#settingsKitPreviewClip)">
            {form.kitDesign === "stripes" ? (
              <>
                <Rect
                  x="18"
                  y="0"
                  width="11"
                  height="90"
                  fill={form.secondaryKitColor}
                />
                <Rect
                  x="45"
                  y="0"
                  width="11"
                  height="90"
                  fill={form.secondaryKitColor}
                />
                <Rect
                  x="72"
                  y="0"
                  width="11"
                  height="90"
                  fill={form.secondaryKitColor}
                />
              </>
            ) : null}
            {form.kitDesign === "twoColorStripes" ? (
              <>
                <Rect
                  x="0"
                  y="0"
                  width="10"
                  height="90"
                  fill={form.secondaryKitColor}
                />
                <Rect
                  x="22.5"
                  y="0"
                  width="10"
                  height="90"
                  fill={form.thirdKitColor}
                />
                <Rect
                  x="45"
                  y="0"
                  width="10"
                  height="90"
                  fill={form.secondaryKitColor}
                />
                <Rect
                  x="67.5"
                  y="0"
                  width="10"
                  height="90"
                  fill={form.thirdKitColor}
                />
                <Rect
                  x="90"
                  y="0"
                  width="10"
                  height="90"
                  fill={form.secondaryKitColor}
                />
              </>
            ) : null}
            {form.kitDesign === "hoops" ? (
              <>
                <Rect
                  x="0"
                  y="21"
                  width="100"
                  height="10"
                  fill={form.secondaryKitColor}
                />
                <Rect
                  x="0"
                  y="44"
                  width="100"
                  height="10"
                  fill={form.secondaryKitColor}
                />
                <Rect
                  x="0"
                  y="67"
                  width="100"
                  height="10"
                  fill={form.secondaryKitColor}
                />
              </>
            ) : null}
            {form.kitDesign === "halves" ? (
              <Rect
                x="50"
                y="0"
                width="50"
                height="90"
                fill={form.secondaryKitColor}
              />
            ) : null}
            {form.kitDesign === "sides" ? (
              <>
                <Path
                  d="M18 0 L32 0 L32 90 L18 90 Z"
                  fill={form.secondaryKitColor}
                />
                <Path
                  d="M68 0 L82 0 L82 90 L68 90 Z"
                  fill={form.secondaryKitColor}
                />
              </>
            ) : null}
            {form.kitDesign === "sash" ? (
              <>
                <Path
                  d="M4 90 L86 -16 L96 -16 L14 90 Z"
                  fill={form.secondaryKitColor}
                />
                <Path
                  d="M14 90 L96 -16 L106 -16 L24 90 Z"
                  fill={form.thirdKitColor}
                />
              </>
            ) : null}
          </G>
          <Path
            d={kitShirtPath}
            fill="none"
            stroke={kitOutlineColor}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth={5}
          />
          <Path
            d="M37 7 Q50 15 63 7"
            fill="none"
            stroke={kitOutlineColor}
            strokeLinecap="round"
            strokeWidth={5}
          />
        </Svg>
        <OutlinedText
          color={form.kitNumberColor}
          outlineColor={getKitNumberOutlineColor(form.kitNumberColor)}
          outlineWidth={1}
          type="smallBold"
          style={styles.kitPreviewNumber}
        >
          10
        </OutlinedText>
      </ThemedView>
    </ThemedView>
  );
}

function SettingsColorField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <ThemedView style={styles.settingsFieldGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedView style={styles.settingsSwatchRow}>
        {colorOptions.map((color) => (
          <Pressable
            key={`${label}-${color}`}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${color}`}
            accessibilityState={{
              selected: value.toUpperCase() === color,
            }}
            onPress={() => onChange(color)}
            style={({ pressed }) => [
              styles.settingsSwatch,
              { backgroundColor: color },
              value.toUpperCase() === color && styles.settingsSwatchSelected,
              pressed && styles.pressed,
            ]}
          />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

function getKitNumberOutlineColor(color: string) {
  const normalizedColor = color.trim().toUpperCase();
  return normalizedColor === "#000000" || normalizedColor === "#111827"
    ? "#FFFFFF"
    : "#111827";
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    justifyContent: "center",
    flexDirection: "row",
  },
  container: {
    flexGrow: 1,
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    marginTop: CompactScreenTopMargin,
    paddingHorizontal: Spacing.four,
    paddingTop: AppHeaderHeight + PageTopPadding,
  },
  header: {
    gap: Spacing.two,
  },
  eyebrow: {
    textTransform: "uppercase",
  },
  title: {
    lineHeight: 38,
  },
  intro: {
    maxWidth: 560,
  },
  injurySummary: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: ActionColors.danger,
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.two,
    marginTop: Spacing.one,
    minHeight: 40,
    paddingHorizontal: Spacing.three,
  },
  nextMatchCard: {
    alignItems: "center",
    borderColor: ActionColors.primary,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: 80,
    padding: Spacing.three,
    marginTop: -Spacing.three,
    marginBottom: -Spacing.three,
  },
  nextMatchIcon: {
    alignItems: "center",
    borderRadius: Spacing.two,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  nextMatchText: {
    flex: 1,
  },
  recentWinCard: {
    alignItems: "center",
    borderColor: ActionColors.primary,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: 80,
    padding: Spacing.three,
  },
  recentWinContent: {
    flex: 1,
    gap: Spacing.one,
  },
  recentWinShareButton: {
    alignItems: "center",
    backgroundColor: ActionColors.warning,
    borderRadius: Spacing.two,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  recentWinShareText: {
    color: ActionColors.onAccent,
  },
  actionsGrid: {
    gap: Spacing.three,
  },
  actionsSection: {
    gap: Spacing.two,
    marginTop: -Spacing.three,
  },
  shortcutRow: {
    flexDirection: "row",
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  shortcutPressable: {
    borderRadius: Spacing.three,
    flex: 1,
  },
  shortcutCard: {
    alignItems: "center",
    borderRadius: Spacing.three,
    gap: Spacing.two,
    height: 112,
    justifyContent: "center",
    padding: Spacing.three,
  },
  shortcutIcon: {
    alignItems: "center",
    backgroundColor: ActionColors.primary,
    borderRadius: Spacing.three,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  shortcutLabel: {
    textAlign: "center",
  },
  wideShortcutPressable: {
    borderRadius: Spacing.three,
  },
  wideShortcutCard: {
    alignItems: "center",
    borderRadius: Spacing.three,
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: 64,
    paddingHorizontal: Spacing.three,
  },
  wideShortcutIcon: {
    alignItems: "center",
    backgroundColor: ActionColors.primary,
    borderRadius: Spacing.two,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  actionPressable: {
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  actionCard: {
    alignItems: "center",
    borderRadius: Spacing.three,
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: 104,
    padding: Spacing.three,
    position: "relative",
  },
  actionNotificationDot: {
    backgroundColor: "#FF7A1A",
    borderColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    position: "absolute",
    right: -5,
    top: -5,
    width: 20,
    zIndex: 2,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: ActionColors.primary,
    borderRadius: Spacing.three,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  actionContent: {
    flex: 1,
    gap: Spacing.one,
  },
  settingsModalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.three,
  },
  settingsModalCard: {
    borderRadius: Spacing.three,
    gap: Spacing.three,
    height: "92%",
    maxHeight: "92%",
    maxWidth: 520,
    padding: Spacing.three,
    width: "100%",
  },
  settingsModalHeader: {
    gap: Spacing.one,
  },
  settingsModalTitle: {
    lineHeight: 38,
  },
  settingsModalScroll: {
    flex: 1,
  },
  settingsModalForm: {
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
  settingsFieldGroup: {
    gap: Spacing.one,
  },
  kitDesignLayout: {
    alignItems: "center",
    gap: Spacing.two,
  },
  kitDesignOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    justifyContent: "center",
    width: "100%",
  },
  kitDesignOption: {
    alignItems: "center",
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 104,
    paddingHorizontal: Spacing.two,
  },
  kitDesignOptionSelected: {
    backgroundColor: "#1C7C54",
  },
  kitDesignOptionTextSelected: {
    color: "#ffffff",
  },
  kitPreviewFrame: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#D1D5DB",
    borderRadius: Spacing.three,
    borderWidth: 1,
    height: 116,
    justifyContent: "center",
    width: 104,
  },
  kitPreviewShirt: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 90,
    justifyContent: "center",
    position: "relative",
    width: 100,
  },
  kitPreviewSvg: {
    height: "100%",
    position: "absolute",
    width: "100%",
  },
  kitPreviewNumber: {
    fontSize: 28,
    lineHeight: 34,
    marginTop: 8,
    zIndex: 2,
  },
  settingsTextInput: {
    backgroundColor: "#ffffff",
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  settingsNumberRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  settingsNumberInput: {
    backgroundColor: "#ffffff",
    borderRadius: Spacing.two,
    borderWidth: 1,
    flex: 1,
    fontSize: 18,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    textAlign: "center",
  },
  settingsSegmentedRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  settingsSegmentedOption: {
    alignItems: "center",
    borderRadius: Spacing.two,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.two,
  },
  settingsSegmentedOptionSelected: {
    backgroundColor: "#1C7C54",
  },
  settingsSegmentedOptionTextSelected: {
    color: "#ffffff",
  },
  settingsSwatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  settingsSwatch: {
    borderColor: "#D1D5DB",
    borderRadius: Spacing.one,
    borderWidth: 1,
    height: 28,
    width: 28,
  },
  settingsSwatchSelected: {
    borderColor: "#111827",
    borderWidth: 3,
  },
  settingsError: {
    color: "#EF4444",
  },
  settingsSaveButton: {
    alignItems: "center",
    backgroundColor: ActionColors.primary,
    borderRadius: Spacing.two,
    justifyContent: "center",
    minHeight: 48,
  },
  settingsNextButton: {
    backgroundColor: ActionColors.primary,
  },
  settingsFooter: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  settingsFooterButton: {
    flex: 1,
  },
  settingsBackButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "#6B7280",
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  settingsBackButtonText: {
    color: "#6B7280",
  },
  settingsSaveButtonText: {
    color: "#ffffff",
    textAlign: "center",
    width: "100%",
  },
  disabledButton: {
    opacity: 0.55,
  },
});
