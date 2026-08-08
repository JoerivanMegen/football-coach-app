import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppHeaderHeight, BottomTabInset, MaxContentWidth, PageTopPadding, Spacing } from "@/constants/theme";
import { listPlayerAttendanceStatsAsync } from "@/features/player-stats/player-stats-repository";
import type { PlayerAttendanceStats } from "@/features/player-stats/player-stats-types";
import { getSeasonByIdAsync } from "@/features/seasons/season-repository";
import { getSeasonTeamStatsAsync, type SeasonTeamStats } from "@/features/seasons/season-stats-repository";
import type { Season } from "@/features/seasons/season-types";
import { getTeamSettingsAsync } from "@/features/settings/team-settings-repository";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";

type LeaderboardEntry = { id: number; name: string; value: number; display: string };

export default function SeasonSummaryScreen() {
  const { seasonId } = useLocalSearchParams<{ seasonId: string }>();
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useI18n();
  const numericSeasonId = Number(seasonId);
  const [season, setSeason] = useState<Season | null>(null);
  const [teamStats, setTeamStats] = useState<SeasonTeamStats | null>(null);
  const [players, setPlayers] = useState<PlayerAttendanceStats[]>([]);
  const [preferNicknames, setPreferNicknames] = useState(true);
  const [loading, setLoading] = useState(Number.isInteger(numericSeasonId));
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
      setPreferNicknames(settings?.preferNicknames ?? true);
    }).catch((error: unknown) => {
      console.warn("Failed to load season summary", error);
    }).finally(() => setLoading(false));
  }, [numericSeasonId]);

  const leaderboards = useMemo(() => {
    const named = players.map((player) => ({ player, name: playerName(player, preferNicknames) }));
    return [
      { title: t("seasons.summary.highlights.most_goals"), entries: topThree(named, (item) => item.player.matchGoals, String) },
      { title: t("seasons.summary.highlights.most_assists"), entries: topThree(named, (item) => item.player.matchAssists, String) },
      { title: t("seasons.summary.highlights.most_card_points"), subtitle: "Yellow = 1, red = 3", entries: topThree(named, (item) => item.player.matchYellowCards + item.player.matchRedCards * 3, String) },
      { title: t("seasons.summary.highlights.highest_average_minutes"), subtitle: "Minimum 3 appearances", entries: topThree(named.filter((item) => item.player.matchAppearances >= 3), (item) => item.player.averageMatchMinutes ?? -1, (value) => `${Math.round(value)} min`) },
      { title: t("seasons.summary.highlights.best_training_attendance"), entries: topThree(named.filter((item) => item.player.trainingAttendancePercentage !== null), (item) => item.player.trainingAttendancePercentage ?? -1, percent) },
      { title: t("seasons.summary.highlights.highest_lateness_percentage"), entries: topThree(named.filter((item) => item.player.latePercentage !== null), (item) => item.player.latePercentage ?? -1, percent) },
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
              <ThemedText type="subtitle">Season {season.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {season.status === "active" ? "Current season" : `${season.startDate} – ${season.endDate ?? ""}`}
              </ThemedText>
            </View>

            <ThemedView type="backgroundElement" style={styles.panel}>
              <ThemedText type="default">{t("seasons.summary.team_overview")}</ThemedText>
              <View style={styles.statGrid}>
                <Stat label="Matches" value={teamStats.matches} />
                <Stat label="Wins" value={teamStats.wins} />
                <Stat label="Draws" value={teamStats.draws} />
                <Stat label="Losses" value={teamStats.losses} />
                <Stat label="Goals for" value={teamStats.goalsFor} />
                <Stat label="Goals against" value={teamStats.goalsAgainst} />
                <Stat label="Trainings" value={teamStats.trainings} />
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
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View style={styles.playerTable}>
                  <PlayerTableRow values={["Player", "Training", "Match", "Late", "Starts", "Avg min", "Goals", "Assists", "YC", "RC", "CS", "Rating", "Duties"]} header />
                  {players.map((player) => (
                    <PlayerTableRow key={player.playerId} values={[
                      playerName(player, preferNicknames),
                      nullablePercent(player.trainingAttendancePercentage),
                      nullablePercent(player.matchAttendancePercentage),
                      nullablePercent(player.latePercentage),
                      String(player.matchStarts),
                      player.averageMatchMinutes === null ? "–" : String(Math.round(player.averageMatchMinutes)),
                      String(player.matchGoals), String(player.matchAssists),
                      String(player.matchYellowCards), String(player.matchRedCards),
                      String(player.matchCleanSheets),
                      player.averageMatchRating === null ? "–" : player.averageMatchRating.toFixed(1),
                      `${player.matchDutiesFulfilled}/${player.matchDutiesAssigned}`,
                    ]} />
                  ))}
                </View>
              </ScrollView>
            </ThemedView>
          </>
        )}
      </ThemedView>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <View style={styles.stat}><ThemedText type="subtitle" style={styles.statValue}>{value}</ThemedText><ThemedText type="small" themeColor="textSecondary">{label}</ThemedText></View>;
}

function Highlight({ title, match }: { title: string; match: SeasonTeamStats["highestWin"] }) {
  return <ThemedView type="backgroundElement" style={[styles.panel, styles.highlight]}><ThemedText type="smallBold">{title}</ThemedText>{match ? <><ThemedText type="subtitle" style={styles.statValue}>{match.ownScore}–{match.opponentScore}</ThemedText><ThemedText type="small" themeColor="textSecondary">{match.location === "home" ? "vs" : "at"} {match.opponent} · {match.matchDate}</ThemedText></> : <ThemedText type="small" themeColor="textSecondary">No match</ThemedText>}</ThemedView>;
}

function Leaderboard({ title, subtitle, entries }: { title: string; subtitle?: string; entries: LeaderboardEntry[] }) {
  return <ThemedView type="backgroundElement" style={[styles.panel, styles.leaderboard]}><ThemedText type="smallBold">{title}</ThemedText>{subtitle ? <ThemedText type="small" themeColor="textSecondary">{subtitle}</ThemedText> : null}{entries.length ? entries.map((entry, index) => <View key={entry.id} style={styles.rankRow}><ThemedText type="small">{index + 1}. {entry.name}</ThemedText><ThemedText type="smallBold" style={styles.greenText}>{entry.display}</ThemedText></View>) : <ThemedText type="small" themeColor="textSecondary">No data yet</ThemedText>}</ThemedView>;
}

function PlayerTableRow({ values, header = false }: { values: string[]; header?: boolean }) {
  return <ThemedView type={header ? "backgroundSelected" : "backgroundElement"} style={styles.tableRow}>{values.map((value, index) => <View key={`${index}-${value}`} style={[styles.tableCell, index === 0 && styles.tableNameCell]}><ThemedText type={header || index === 0 ? "smallBold" : "small"} themeColor={header ? "textSecondary" : undefined}>{value}</ThemedText></View>)}</ThemedView>;
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
  playerTable: { minWidth: 1080 },
  tableRow: { flexDirection: "row" },
  tableCell: { justifyContent: "center", minHeight: 42, paddingHorizontal: Spacing.two, width: 74 },
  tableNameCell: { width: 150 },
});
