import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppHeaderHeight, BottomTabInset, CompactScreenTopMargin, MaxContentWidth, PageTopPadding, Spacing } from "@/constants/theme";
import { listPlayerAttendanceStatsAsync } from "@/features/player-stats/player-stats-repository";
import type { PlayerAttendanceStats } from "@/features/player-stats/player-stats-types";
import { getSeasonByIdAsync } from "@/features/seasons/season-repository";
import { getSeasonTeamStatsAsync, type SeasonTeamStats } from "@/features/seasons/season-stats-repository";
import type { Season } from "@/features/seasons/season-types";
import { getTeamSettingsAsync } from "@/features/settings/team-settings-repository";
import type { FineJarCurrency } from "@/features/settings/team-settings-types";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";

type LeaderboardEntry = { id: number; name: string; value: number; display: string };

export default function SeasonSummaryScreen() {
  const { seasonId } = useLocalSearchParams<{ seasonId: string }>();
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { locale, t } = useI18n();
  const numericSeasonId = Number(seasonId);
  const [season, setSeason] = useState<Season | null>(null);
  const [teamStats, setTeamStats] = useState<SeasonTeamStats | null>(null);
  const [players, setPlayers] = useState<PlayerAttendanceStats[]>([]);
  const [preferNicknames, setPreferNicknames] = useState(false);
  const [fineJarCurrency, setFineJarCurrency] = useState<FineJarCurrency>(
    locale === "nl" ? "EUR" : "GBP",
  );
  const [loading, setLoading] = useState(Number.isInteger(numericSeasonId));
  const playerTableHeaderScrollRef = useRef<ScrollView>(null);
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
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

  useEffect(() => {
    if (!Number.isInteger(numericSeasonId)) {
      return;
    }
    Promise.all([
      getSeasonByIdAsync(numericSeasonId),
      getSeasonTeamStatsAsync(numericSeasonId),
      listPlayerAttendanceStatsAsync(numericSeasonId),
      getTeamSettingsAsync(),
    ]).then(([loadedSeason, loadedTeamStats, loadedPlayers, settings]) => {
      setSeason(loadedSeason);
      setTeamStats(loadedTeamStats);
      setPlayers(loadedPlayers);
      setPreferNicknames(settings?.preferNicknames ?? false);
      setFineJarCurrency(
        settings?.fineJarCurrency ?? (locale === "nl" ? "EUR" : "GBP"),
      );
    }).catch((error: unknown) => {
      console.warn("Failed to load season summary", error);
    }).finally(() => setLoading(false));
  }, [locale, numericSeasonId]);

  const formatCurrency = (amountCents: number) =>
    new Intl.NumberFormat(locale === "nl" ? "nl-NL" : "en-GB", {
      style: "currency",
      currency: fineJarCurrency,
      currencyDisplay: "narrowSymbol",
    }).format(amountCents / 100);

  const leaderboards = useMemo(() => {
    const named = players.map((player) => ({ player, name: playerName(player, preferNicknames) }));
    return [
      { title: t("seasons.summary.highlights.most_goals"), entries: topThree(named, (item) => item.player.matchGoals, String) },
      { title: t("seasons.summary.highlights.most_assists"), entries: topThree(named, (item) => item.player.matchAssists, String) },
      { title: t("seasons.summary.highlights.most_card_points"), subtitle: t("seasons.summary.card_points_help"), entries: topThree(named, (item) => item.player.matchYellowCards + item.player.matchRedCards * 3, String) },
      { title: t("seasons.summary.highlights.highest_average_minutes"), subtitle: t("seasons.summary.minimum_appearances"), entries: topThree(named.filter((item) => item.player.matchAppearances >= 3), (item) => item.player.averageMatchMinutes ?? -1, (value) => t("seasons.summary.minutes_short", { count: Math.round(value) })) },
      { title: t("seasons.summary.highlights.best_training_attendance"), entries: topThree(named.filter((item) => item.player.trainingAttendancePercentage !== null), (item) => item.player.trainingAttendancePercentage ?? -1, percent) },
      { title: t("seasons.summary.highlights.highest_lateness_percentage"), entries: topThree(named.filter((item) => item.player.latePercentage !== null), (item) => item.player.latePercentage ?? -1, percent) },
      {
        title: t("seasons.summary.highlights.minutes_per_training"),
        entries: topThree(
          named.filter((item) => item.player.trainingAttended > 0),
          (item) => item.player.totalMatchMinutes / item.player.trainingAttended,
          (value) => t("seasons.summary.minutes_short", { count: Math.round(value) }),
        ),
      },
      {
        title: t("seasons.summary.highlights.most_fines"),
        entries: topThree(
          named.filter((item) => item.player.fineCount > 0),
          (item) => item.player.fineCount,
          (value) => t(
            value === 1
              ? "seasons.summary.fine_count"
              : "seasons.summary.fine_count_plural",
            { count: value },
          ),
        ),
      },
    ];
  }, [players, preferNicknames, t]);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInset={insets}
      contentContainerStyle={[styles.screen, contentPlatformStyle]}
    >
      <ThemedView style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText type="smallBold" style={styles.greenText}>‹ {t("common.back")}</ThemedText>
        </Pressable>
        {loading ? <ActivityIndicator color="#1C7C54" /> : !season || !teamStats ? (
          <ThemedText>{t("seasons.errors.summary_not_found")}</ThemedText>
        ) : (
          <>
            <View>
              <ThemedText type="subtitle">{t("seasons.summary.season_title", { season: season.name })}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {season.status === "active" ? t("seasons.summary.current_season") : `${season.startDate} – ${season.endDate ?? ""}`}
              </ThemedText>
            </View>

            <ThemedView type="backgroundElement" style={styles.panel}>
              <ThemedText type="default">{t("seasons.summary.team_overview")}</ThemedText>
              <View style={styles.statGrid}>
                <Stat label={t("seasons.summary.team_stats.matches")} value={teamStats.matches} />
                <Stat label={t("seasons.summary.team_stats.wins")} value={teamStats.wins} />
                <Stat label={t("seasons.summary.team_stats.draws")} value={teamStats.draws} />
                <Stat label={t("seasons.summary.team_stats.losses")} value={teamStats.losses} />
                <Stat label={t("seasons.summary.team_stats.goals_for")} value={teamStats.goalsFor} />
                <Stat label={t("seasons.summary.team_stats.goals_against")} value={teamStats.goalsAgainst} />
                <Stat label={t("seasons.summary.team_stats.trainings")} value={teamStats.trainings} />
                <Stat
                  label={t("seasons.summary.team_stats.fine_amount")}
                  value={formatCurrency(teamStats.fineAmountCents)}
                />
              </View>
            </ThemedView>

            <View style={styles.twoColumn}>
              <Highlight title={t("seasons.summary.highlights.biggest_win")} match={teamStats.highestWin} />
              <Highlight title={t("seasons.summary.highlights.biggest_loss")} match={teamStats.biggestLoss} />
            </View>

            <ThemedText type="default">{t("seasons.summary.player_highlights")}</ThemedText>
            <View style={styles.leaderboardGrid}>
              {leaderboards.map((board) => <Leaderboard key={board.title} {...board} />)}
            </View>

            <ThemedView type="backgroundElement" style={styles.panel}>
              <ThemedText type="default">{t("seasons.summary.player_overview")}</ThemedText>
              <View style={styles.playerTableHeaderLayout}>
                <ThemedView
                  type="backgroundSelected"
                  style={[styles.tableCell, styles.tableNameCell, styles.playerTableCornerCell]}
                >
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {t("seasons.summary.player_columns.player")}
                  </ThemedText>
                </ThemedView>
                <ScrollView
                  ref={playerTableHeaderScrollRef}
                  horizontal
                  scrollEnabled={false}
                  showsHorizontalScrollIndicator={false}
                  style={styles.playerTableHeaderScroll}
                >
                  <PlayerTableRow header values={[
                    t("seasons.summary.player_columns.training"),
                    t("seasons.summary.player_columns.match"),
                    t("seasons.summary.player_columns.late"),
                    t("seasons.summary.player_columns.starts"),
                    t("seasons.summary.player_columns.average_minutes"),
                    t("seasons.summary.player_columns.goals"),
                    t("seasons.summary.player_columns.assists"),
                    t("seasons.summary.player_columns.yellow_cards"),
                    t("seasons.summary.player_columns.red_cards"),
                    t("seasons.summary.player_columns.clean_sheets"),
                    t("seasons.summary.player_columns.rating"),
                    t("seasons.summary.player_columns.duties"),
                  ]} />
                </ScrollView>
              </View>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={players.length > 8}
                style={styles.playerTableBody}
              >
                <View style={styles.playerTableBodyLayout}>
                  <ThemedView type="backgroundElement" style={styles.playerTableFrozenColumn}>
                    {players.map((player) => (
                      <View
                        key={player.playerId}
                        style={[styles.tableCell, styles.tableNameCell, styles.playerTableDataCell]}
                      >
                        <ThemedText type="smallBold" numberOfLines={2}>
                          {playerName(player, preferNicknames)}
                        </ThemedText>
                      </View>
                    ))}
                  </ThemedView>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator
                    style={styles.playerTableDataScroll}
                    onScroll={(event) =>
                      playerTableHeaderScrollRef.current?.scrollTo({
                        x: event.nativeEvent.contentOffset.x,
                        animated: false,
                      })
                    }
                    scrollEventThrottle={16}
                  >
                    <View style={styles.playerTableData}>
                      {players.map((player) => (
                        <PlayerTableRow
                          key={player.playerId}
                          values={getPlayerTableValues(player)}
                        />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </ScrollView>
            </ThemedView>
          </>
        )}
      </ThemedView>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <View style={styles.stat}><ThemedText type="subtitle" style={styles.statValue}>{value}</ThemedText><ThemedText type="small" themeColor="textSecondary">{label}</ThemedText></View>;
}

function Highlight({ title, match }: { title: string; match: SeasonTeamStats["highestWin"] }) {
  const { t } = useI18n();
  return <ThemedView type="backgroundElement" style={[styles.panel, styles.highlight]}><ThemedText type="smallBold">{title}</ThemedText>{match ? <><ThemedText type="subtitle" style={styles.statValue}>{match.ownScore}–{match.opponentScore}</ThemedText><ThemedText type="small" themeColor="textSecondary">{t(match.location === "home" ? "seasons.summary.match_location.home" : "seasons.summary.match_location.away")} {match.opponent} · {match.matchDate}</ThemedText></> : <ThemedText type="small" themeColor="textSecondary">{t("seasons.summary.no_match")}</ThemedText>}</ThemedView>;
}

function Leaderboard({ title, subtitle, entries }: { title: string; subtitle?: string; entries: LeaderboardEntry[] }) {
  const { t } = useI18n();
  return <ThemedView type="backgroundElement" style={[styles.panel, styles.leaderboard]}><ThemedText type="smallBold">{title}</ThemedText>{subtitle ? <ThemedText type="small" themeColor="textSecondary">{subtitle}</ThemedText> : null}{entries.length ? entries.map((entry, index) => <View key={entry.id} style={styles.rankRow}><ThemedText type="small">{index + 1}. {entry.name}</ThemedText><ThemedText type="smallBold" style={styles.greenText}>{entry.display}</ThemedText></View>) : <ThemedText type="small" themeColor="textSecondary">{t("seasons.summary.no_data")}</ThemedText>}</ThemedView>;
}

function PlayerTableRow({ values, header = false }: { values: string[]; header?: boolean }) {
  return <ThemedView type={header ? "backgroundSelected" : "backgroundElement"} style={styles.tableRow}>{values.map((value, index) => <View key={`${index}-${value}`} style={styles.tableCell}><ThemedText type={header ? "smallBold" : "small"} themeColor={header ? "textSecondary" : undefined}>{value}</ThemedText></View>)}</ThemedView>;
}

function getPlayerTableValues(player: PlayerAttendanceStats) {
  return [
    nullablePercent(player.trainingAttendancePercentage),
    nullablePercent(player.matchAttendancePercentage),
    nullablePercent(player.latePercentage),
    String(player.matchStarts),
    player.averageMatchMinutes === null
      ? "–"
      : String(Math.round(player.averageMatchMinutes)),
    String(player.matchGoals),
    String(player.matchAssists),
    String(player.matchYellowCards),
    String(player.matchRedCards),
    String(player.matchCleanSheets),
    player.averageMatchRating === null
      ? "–"
      : player.averageMatchRating.toFixed(1),
    `${player.matchDutiesFulfilled}/${player.matchDutiesAssigned}`,
  ];
}

function topThree<T extends { player: PlayerAttendanceStats; name: string }>(items: T[], value: (item: T) => number, display: (value: number) => string): LeaderboardEntry[] {
  return [...items].sort((a, b) => value(b) - value(a) || a.name.localeCompare(b.name)).slice(0, 3).map((item) => ({ id: item.player.playerId, name: item.name, value: value(item), display: display(value(item)) }));
}

function playerName(player: PlayerAttendanceStats, preferNicknames: boolean) {
  return preferNicknames && player.nickName?.trim() ? player.nickName.trim() : `${player.firstName} ${player.lastName}`.trim();
}

function percent(value: number) { return `${Math.round(value)}%`; }
function nullablePercent(value: number | null) { return value === null ? "–" : percent(value); }

const styles = StyleSheet.create({
  screen: { alignItems: "center", paddingHorizontal: Spacing.four },
  container: {
    marginTop: CompactScreenTopMargin,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    paddingTop:
      Platform.select({
        web: AppHeaderHeight + PageTopPadding,
        default: AppHeaderHeight + Spacing.two,
      }) ?? AppHeaderHeight + Spacing.two,
    width: "100%",
  },
  backButton: { alignSelf: "flex-start", paddingVertical: Spacing.one },
  greenText: { color: "#1C7C54" },
  panel: { borderRadius: Spacing.three, gap: Spacing.two, padding: Spacing.three },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  stat: { minWidth: 88 },
  statValue: { fontSize: 28, lineHeight: 34 },
  twoColumn: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  highlight: { flex: 1, minWidth: 220 },
  leaderboardGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  leaderboard: { flexGrow: 1, minWidth: 230 },
  rankRow: { flexDirection: "row", gap: Spacing.three, justifyContent: "space-between" },
  playerTableHeaderLayout: { flexDirection: "row", height: 48, zIndex: 3 },
  playerTableCornerCell: {
    borderRightColor: "#1C7C54",
    borderRightWidth: 1,
    borderTopLeftRadius: Spacing.two,
    zIndex: 4,
  },
  playerTableHeaderScroll: {
    borderTopRightRadius: Spacing.two,
    flex: 1,
    overflow: "hidden",
  },
  playerTableBody: { maxHeight: 420 },
  playerTableBodyLayout: { position: "relative" },
  playerTableFrozenColumn: {
    borderBottomLeftRadius: Spacing.two,
    borderRightColor: "#1C7C54",
    borderRightWidth: 1,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    top: 0,
    width: 150,
    zIndex: 2,
  },
  playerTableDataScroll: { marginLeft: 150 },
  playerTableData: { minWidth: 888 },
  playerTableDataCell: {
    borderTopColor: "rgba(128, 128, 128, 0.18)",
    borderTopWidth: 1,
  },
  tableRow: {
    borderTopColor: "rgba(128, 128, 128, 0.18)",
    borderTopWidth: 1,
    flexDirection: "row",
  },
  tableCell: { justifyContent: "center", minHeight: 42, paddingHorizontal: Spacing.two, width: 74 },
  tableNameCell: { width: 150 },
});
