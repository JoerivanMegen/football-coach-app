import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PageTopPadding, Spacing } from "@/constants/theme";
import type { PlayerAttendanceStats } from "@/features/player-stats/player-stats-types";
import { getPlayerPositionLabel } from "@/features/players/player-position-labels";
import { playerStyles as styles } from "@/features/players/components/player-styles";
import { compareTeamStats, formatNullableNumber, formatPercentage, isCleanSheetPosition, type TeamStatsSortKey } from "@/features/players/player-stats-utils";
import { useTheme } from "@/hooks/use-theme";
import { DEFAULT_LOCALE } from "@/i18n/locales";

export function TeamStatsModal({
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

export function PlayerStatsPanel({ stats }: { stats: PlayerAttendanceStats }) {
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

function getRecentRatingStyle(rating: number) {
  if (rating >= 8) return styles.recentRatingGood;
  if (rating >= 5) return styles.recentRatingOk;
  return styles.recentRatingPoor;
}

function getRecentRatingTextStyle(rating: number) {
  return rating >= 5 && rating < 8 ? styles.recentRatingTextDark : styles.recentRatingTextLight;
}
