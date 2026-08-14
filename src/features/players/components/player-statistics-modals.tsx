import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import type { PlayerAttendanceStats } from "@/features/player-stats/player-stats-types";
import { getPlayerPositionLabel } from "@/features/players/player-position-labels";
import { playerStyles as styles } from "@/features/players/components/player-styles";
import { compareTeamStats, formatNullableNumber, formatPercentage, isCleanSheetPosition, type TeamStatsSortKey } from "@/features/players/player-stats-utils";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";
import { getTeamSettingsAsync } from "@/features/settings/team-settings-repository";
import type { FineJarCurrency } from "@/features/settings/team-settings-types";

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
  const { locale, t } = useI18n();
  const [fineJarCurrency, setFineJarCurrency] = useState<FineJarCurrency>(
    locale === "nl" ? "EUR" : "GBP",
  );
  const [showFineJarStats, setShowFineJarStats] = useState(false);
  const [showMatchDutyStats, setShowMatchDutyStats] = useState(false);
  const [sortKey, setSortKey] = useState<TeamStatsSortKey>("player");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const statsHeaderScrollRef = useRef<ScrollView>(null);
  const sortedStats = useMemo(
    () => [...stats].sort((left, right) => compareTeamStats(left, right, sortKey, sortDirection)),
    [sortDirection, sortKey, stats],
  );

  useEffect(() => {
    if (!visible) return;
    void getTeamSettingsAsync()
      .then((settings) => {
        const fineJarEnabled = settings?.fineJarEnabled ?? false;
        const matchDutyEnabled = settings?.matchDutyEnabled ?? false;
        setFineJarCurrency(
          settings?.fineJarCurrency ?? (locale === "nl" ? "EUR" : "GBP"),
        );
        setShowFineJarStats(fineJarEnabled);
        setShowMatchDutyStats(matchDutyEnabled);
        setSortKey((currentSortKey) => {
          if (!fineJarEnabled && isFineJarSortKey(currentSortKey)) {
            return "player";
          }
          if (!matchDutyEnabled && isMatchDutySortKey(currentSortKey)) {
            return "player";
          }
          return currentSortKey;
        });
      })
      .catch((error: unknown) => {
        console.warn("Failed to load Fine Jar currency for team stats", error);
      });
  }, [locale, visible]);

  const formatCurrency = (amountCents: number) =>
    new Intl.NumberFormat(locale === "nl" ? "nl-NL" : "en-GB", {
      style: "currency",
      currency: fineJarCurrency,
      currencyDisplay: "narrowSymbol",
    }).format(amountCents / 100);

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
            paddingTop: safeAreaInsets.top + Spacing.two,
            paddingBottom: safeAreaInsets.bottom + Spacing.three,
          },
        ]}
      >
        <ThemedView style={styles.teamStatsModalHeader}>
          <ThemedView style={styles.teamStatsModalTitleGroup}>
            <ThemedText type="subtitle" style={styles.teamStatsModalTitle}>
              {t("players.stats.team_title")}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t("players.stats.player_subtitle")}
            </ThemedText>
          </ThemedView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("players.stats.close_team_statistics")}
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
            <ThemedText type="smallBold">{t("players.stats.empty.title")}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              {t("players.stats.empty.description")}
            </ThemedText>
          </ThemedView>
        ) : (
          <>
            <ThemedView style={styles.teamStatsFrozenHeaderLayout}>
              <ThemedView
                type="backgroundSelected"
                style={styles.teamStatsFrozenHeaderCell}
              >
                <TeamStatsHeaderCell
                  activeSortKey={sortKey}
                  direction={sortDirection}
                  label={t("players.stats.columns.player")}
                  onSort={changeSort}
                  sortKey="player"
                  style={styles.teamStatsPlayerCell}
                />
              </ThemedView>
              <ScrollView
                ref={statsHeaderScrollRef}
                horizontal
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                style={styles.teamStatsHeaderScrollableColumns}
              >
                <ThemedView
                  type="backgroundSelected"
                  style={styles.teamStatsTableHeaderRow}
                >
                  {renderTeamStatsHeaderCells(
                    t,
                    sortKey,
                    sortDirection,
                    changeSort,
                    showMatchDutyStats,
                    showFineJarStats,
                  )}
                </ThemedView>
              </ScrollView>
            </ThemedView>

            <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedView style={styles.teamStatsFrozenLayout}>
              <ThemedView
                type="backgroundElement"
                style={styles.teamStatsFrozenColumn}
              >
                {sortedStats.map((playerStats) => (
                  <ThemedView
                    key={playerStats.playerId}
                    type="backgroundElement"
                    style={styles.teamStatsTableRow}
                  >
                    <ThemedView
                      type="backgroundElement"
                      style={[
                        styles.teamStatsPlayerCell,
                        styles.teamStatsPlayerDataCell,
                      ]}
                    >
                      <ThemedText type="smallBold" numberOfLines={2}>
                        {playerStats.firstName} {playerStats.lastName}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {getPlayerPositionLabel(playerStats.position, locale)}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                ))}
              </ThemedView>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                style={styles.teamStatsScrollableColumns}
                contentContainerStyle={styles.teamStatsTableScrollContent}
                onScroll={(event) =>
                  statsHeaderScrollRef.current?.scrollTo({
                    x: event.nativeEvent.contentOffset.x,
                    animated: false,
                  })
                }
                scrollEventThrottle={16}
              >
                <ThemedView type="backgroundElement" style={styles.teamStatsTable}>
                {sortedStats.map((playerStats) => (
                  <ThemedView
                    key={playerStats.playerId}
                    type="backgroundElement"
                    style={styles.teamStatsTableRow}
                  >
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
                    {showMatchDutyStats ? (
                      <>
                        <TeamStatsValueCell value={String(playerStats.matchDutiesAssigned)} />
                        <TeamStatsValueCell value={String(playerStats.matchDutiesFulfilled)} />
                        <TeamStatsValueCell
                          value={formatPercentage(playerStats.matchDutyFulfillmentPercentage)}
                        />
                      </>
                    ) : null}
                    {showFineJarStats ? (
                      <>
                        <TeamStatsValueCell value={String(playerStats.fineCount)} />
                        <TeamStatsValueCell
                          value={formatCurrency(playerStats.fineAmountCents)}
                        />
                      </>
                    ) : null}
                    <ThemedView type="backgroundElement" style={styles.teamStatsRecentCell}>
                      <TeamStatsRecentRatings
                        ratings={playerStats.recentMatchRatings.map((rating) => rating.rating)}
                      />
                    </ThemedView>
                  </ThemedView>
                ))}
                </ThemedView>
              </ScrollView>
            </ThemedView>
          </ScrollView>
          </>
        )}
      </ThemedView>
    </Modal>
  );
}

function renderTeamStatsHeaderCells(
  t: ReturnType<typeof useI18n>["t"],
  sortKey: TeamStatsSortKey,
  sortDirection: "asc" | "desc",
  onSort: (key: TeamStatsSortKey) => void,
  showMatchDutyStats: boolean,
  showFineJarStats: boolean,
) {
  return ([
    [t("players.stats.columns.training_percentage"), "trainingAttendancePercentage"],
    [t("players.stats.columns.match_percentage"), "matchAttendancePercentage"],
    [t("players.stats.columns.late_percentage"), "latePercentage"],
    [t("players.stats.columns.starts"), "matchStarts"],
    [t("players.stats.columns.starter_percentage"), "matchStarterPercentage"],
    [t("players.stats.columns.average_minutes"), "averageMatchMinutes"],
    [t("players.stats.columns.goals"), "matchGoals"],
    [t("players.stats.columns.assists"), "matchAssists"],
    [t("players.stats.columns.yellow_cards"), "matchYellowCards"],
    [t("players.stats.columns.red_cards"), "matchRedCards"],
    [t("players.stats.columns.clean_sheets"), "matchCleanSheets"],
    [t("players.stats.columns.average_rating"), "averageMatchRating"],
    [t("players.stats.columns.goals_per_90"), "matchGoalsPer90"],
    [t("players.stats.columns.assists_per_90"), "matchAssistsPer90"],
    ...(showMatchDutyStats
      ? [
          [t("players.stats.columns.duties"), "matchDutiesAssigned"],
          [t("players.stats.columns.fulfilled"), "matchDutiesFulfilled"],
          [t("players.stats.columns.duty_percentage"), "matchDutyFulfillmentPercentage"],
        ]
      : []),
    ...(showFineJarStats
      ? [
          [t("players.stats.columns.fines"), "fineCount"],
          [t("players.stats.columns.fine_amount"), "fineAmountCents"],
        ]
      : []),
    [t("players.stats.columns.last_five"), "recentForm", styles.teamStatsRecentCell],
  ] as [string, TeamStatsSortKey, object?][]).map(([label, key, style]) => (
    <TeamStatsHeaderCell
      key={key}
      activeSortKey={sortKey}
      direction={sortDirection}
      label={label}
      onSort={onSort}
      sortKey={key}
      style={style}
    />
  ));
}

function isMatchDutySortKey(sortKey: TeamStatsSortKey) {
  return (
    sortKey === "matchDutiesAssigned" ||
    sortKey === "matchDutiesFulfilled" ||
    sortKey === "matchDutyFulfillmentPercentage"
  );
}

function isFineJarSortKey(sortKey: TeamStatsSortKey) {
  return sortKey === "fineCount" || sortKey === "fineAmountCents";
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
  const { t } = useI18n();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("players.stats.sort_by", { column: label })}
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
  const { t } = useI18n();
  const hasMarkedEvents = stats.totalEvents > 0 || stats.matchAppearances > 0;

  if (!hasMarkedEvents) {
    return (
      <ThemedView type="backgroundElement" style={styles.playerStatsPanel}>
        <ThemedText type="smallBold">{t("players.stats.no_attendance")}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("players.stats.no_attendance_help")}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.statsSections}>
      <ThemedView type="backgroundElement" style={styles.playerStatsPanel}>
        <ThemedText type="smallBold">{t("players.stats.attendance")}</ThemedText>
        <ThemedView type="backgroundElement" style={styles.statList}>
          <PlayerStatRow
            label={t("players.stats.detail.training")}
            value={formatPercentage(stats.trainingAttendancePercentage)}
            detail={t("players.stats.detail.attended", { attended: stats.trainingAttended, total: stats.trainingEvents })}
          />
          <PlayerStatRow
            label={t("players.stats.detail.matches")}
            value={formatPercentage(stats.matchAttendancePercentage)}
            detail={t("players.stats.detail.attended", { attended: stats.matchAttended, total: stats.matchEvents })}
          />
          <PlayerStatRow
            label={t("players.stats.detail.late")}
            value={formatPercentage(stats.latePercentage)}
            detail={t(stats.lateCount === 1 ? "players.stats.detail.late_count" : "players.stats.detail.late_count_plural", { count: stats.lateCount })}
          />
          <PlayerStatRow
            label={t("players.stats.detail.available_but_absent")}
            value={String(stats.availableButAbsentCount)}
            detail={t("players.stats.detail.available_but_absent_help")}
          />
          <PlayerStatRow
            label={t("players.stats.detail.out_but_attended")}
            value={String(stats.signedOutButAttendedCount)}
            detail={t("players.stats.detail.out_but_attended_help")}
          />
        </ThemedView>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.playerStatsPanel}>
        <ThemedText type="smallBold">{t("players.stats.match_data")}</ThemedText>
        <ThemedView type="backgroundElement" style={styles.statList}>
          <PlayerStatRow
            label={t("players.stats.detail.appearances")}
            value={String(stats.matchAppearances)}
            detail={t("players.stats.detail.completed_matches", { count: stats.matchEvents })}
          />
          <PlayerStatRow
            label={t("players.stats.detail.starts")}
            value={String(stats.matchStarts)}
            detail={t("players.stats.detail.starts_help")}
          />
          <PlayerStatRow
            label={t("players.stats.detail.starter")}
            value={formatPercentage(stats.matchStarterPercentage)}
            detail={t("players.stats.detail.starter_help")}
          />
          <PlayerStatRow
            label={t("players.stats.detail.average_minutes")}
            value={formatNullableNumber(stats.averageMatchMinutes)}
            detail={t("players.stats.detail.total_minutes", { count: stats.totalMatchMinutes })}
          />
          <PlayerStatRow
            label={t("players.stats.detail.goals")}
            value={String(stats.matchGoals)}
            detail={t("players.stats.detail.goals_help")}
          />
          <PlayerStatRow
            label={t("players.stats.detail.assists")}
            value={String(stats.matchAssists)}
            detail={t("players.stats.detail.assists_help")}
          />
          <PlayerStatRow
            label={t("players.stats.detail.yellow_cards")}
            value={String(stats.matchYellowCards)}
            detail={t("players.stats.detail.yellow_cards_help")}
          />
          <PlayerStatRow
            label={t("players.stats.detail.red_cards")}
            value={String(stats.matchRedCards)}
            detail={t("players.stats.detail.red_cards_help")}
          />
          {isCleanSheetPosition(stats.position) ? (
            <PlayerStatRow
              label={t("players.stats.detail.clean_sheets")}
              value={String(stats.matchCleanSheets)}
              detail={t("players.stats.detail.clean_sheets_help")}
            />
          ) : null}
          <PlayerStatRow
            label={t("players.stats.detail.average_rating")}
            value={formatNullableNumber(stats.averageMatchRating)}
            detail={t("players.stats.detail.average_rating_help")}
          />
          <PlayerStatRow
            label={t("players.stats.detail.goals_per_90")}
            value={formatNullableNumber(stats.matchGoalsPer90)}
            detail={t("players.stats.detail.goals_per_90_help")}
          />
          <PlayerStatRow
            label={t("players.stats.detail.assists_per_90")}
            value={formatNullableNumber(stats.matchAssistsPer90)}
            detail={t("players.stats.detail.assists_per_90_help")}
          />
          <PlayerStatRow
            label={t("players.stats.detail.match_duties")}
            value={String(stats.matchDutiesAssigned)}
            detail={t("players.stats.detail.duties_fulfilled", { count: stats.matchDutiesFulfilled })}
          />
          <PlayerStatRow
            label={t("players.stats.detail.duty_fulfillment")}
            value={formatPercentage(stats.matchDutyFulfillmentPercentage)}
            detail={t("players.stats.detail.duty_fulfillment_help")}
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
  const { t } = useI18n();
  return (
    <ThemedView type="backgroundElement" style={styles.recentRatingsGroup}>
      <ThemedText type="smallBold">{t("players.stats.recent_form")}</ThemedText>
      {ratings.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t("players.stats.no_ratings")}
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
