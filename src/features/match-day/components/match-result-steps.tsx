import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { SymbolView } from "expo-symbols";
import { type Dispatch, type SetStateAction, useState } from "react";
import { Pressable } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { LineupJersey, ReviewPitch } from "@/features/match-day/components/lineup-components";
import { matchDayStyles as styles } from "@/features/match-day/components/match-day-styles";
import {
  NumericStepperInput,
  ResultSegmentedField,
  ScoreStepper,
  StatStepper,
} from "@/features/match-day/components/match-result-controls";
import { MatchTextInput } from "@/features/match-day/components/match-setup-fields";
import {
  matchFormations,
  substituteSlots,
} from "@/features/match-day/match-day-config";
import { getMatchCategoryIcon, formatIsoDateForDisplay } from "@/features/match-day/match-day-utils";
import type {
  JerseyResultBadges,
  LineupKitSettings,
  MatchCategory,
  MatchFormation,
  MatchResultFormState,
  MatchResultSquadEntry,
  MatchSetupFormState,
} from "@/features/match-day/match-day-view-types";
import type {
  MatchDayMatch,
  MatchPlayerResultStat,
} from "@/features/match-day/match-day-types";
import {
  formatPlayerName,
  getAssignedPlayer,
} from "@/features/match-day/lineup-utils";
import {
  clearSubstitutionMinutes,
  createDefaultMatchPlayerResultStat,
  getAttendanceLabel,
  getCardLabel,
  getMaxAssistsForPlayer,
  getMaxGoalsForPlayer,
  getRestoredAttendanceMinutes,
  normalizeMatchPlayerResultStat,
} from "@/features/match-day/match-result-utils";
import type { Player } from "@/features/players/player-types";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";

export function MatchResultScoreStep({
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
  const { t } = useI18n();
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
            accessibilityLabel={t("matchday.result.score.opponent")}
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
          {t("matchday.result.steps.result")}
        </ThemedText>
        <ThemedText type="smallBold">{resultLabel}</ThemedText>
      </ThemedView>

      <MatchTextInput
        label={t("matchday.result.player_performance.notes")}
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

export function MatchResultPlayerStep({
  form,
  matchDurationMinutes,
  matchDutyPlayerIds,
  onChangeForm,
  preferNicknames,
  squadEntries,
  teamName,
}: {
  form: MatchResultFormState;
  matchDurationMinutes: number;
  matchDutyPlayerIds: number[];
  onChangeForm: Dispatch<SetStateAction<MatchResultFormState>>;
  preferNicknames: boolean;
  squadEntries: MatchResultSquadEntry[];
  teamName: string;
}) {
  const { t } = useI18n();
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

  function updateMatchDutyFulfilled(playerId: number, isFulfilled: boolean) {
    onChangeForm((currentForm) => ({
      ...currentForm,
      fulfilledMatchDutyPlayerIds: isFulfilled
        ? [...new Set([...currentForm.fulfilledMatchDutyPlayerIds, playerId])]
        : currentForm.fulfilledMatchDutyPlayerIds.filter(
            (currentPlayerId) => currentPlayerId !== playerId,
          ),
    }));
  }

  return (
    <ThemedView style={styles.playerPerformanceStep}>
      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">
          {t("matchday.result.steps.performance")}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("matchday.result.player_performance.description", {
            minutes: matchDurationMinutes,
            score: teamName,
          })}
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
                isMatchDuty={matchDutyPlayerIds.includes(entry.player.id)}
                isMatchDutyFulfilled={form.fulfilledMatchDutyPlayerIds.includes(
                  entry.player.id,
                )}
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
                onMatchDutyFulfilledChange={(isFulfilled) =>
                  updateMatchDutyFulfilled(entry.player.id, isFulfilled)
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
            {t("matchday.result.player_performance.empty")}
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

export function MatchResultReviewStep({
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
  const { t } = useI18n();
  if (!match) {
    return (
      <ThemedView type="backgroundElement" style={styles.resultSummary}>
        <ThemedText type="small" themeColor="textSecondary">
          {t("matchday.result.review.no_match")}
        </ThemedText>
      </ThemedView>
    );
  }

  const matchForm = createMatchSetupFormStateFromMatch(match);
  const squadPlayers = squadEntries.map((entry) => entry.player);
  const substitutes = getAssignedSubstitutes(matchForm, squadPlayers);
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
        players={squadPlayers}
        preferNicknames={preferNicknames}
      />

      {substitutes.length > 0 ? (
        <ThemedView style={styles.reviewListSection}>
          <ThemedText type="default">
            {t("matchday.add_match.lineup.substitutes")}
          </ThemedText>
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
            {t("matchday.result.player_performance.notes")}
          </ThemedText>
          <ThemedText type="small">{form.resultNotes.trim()}</ThemedText>
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

export function PlayerPerformanceCard({
  isExpanded,
  isMatchDuty,
  isMatchDutyFulfilled,
  matchDurationMinutes,
  maxAssists,
  maxGoals,
  onChange,
  onMatchDutyFulfilledChange,
  onToggle,
  player,
  preferNicknames,
  role,
  stat,
  teamScore,
}: {
  isExpanded: boolean;
  isMatchDuty: boolean;
  isMatchDutyFulfilled: boolean;
  matchDurationMinutes: number;
  maxAssists: number;
  maxGoals: number;
  onChange: (
    update: (currentStat: MatchPlayerResultStat) => MatchPlayerResultStat,
  ) => void;
  onMatchDutyFulfilledChange: (isFulfilled: boolean) => void;
  onToggle: () => void;
  player: Player;
  preferNicknames: boolean;
  role: MatchResultSquadEntry["role"];
  stat: MatchPlayerResultStat;
  teamScore: number;
}) {
  const { t } = useI18n();
  const isStarter = role === "starter";
  const theme = useTheme();

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
              label={t("matchday.result.player_performance.goals")}
              max={maxGoals}
              maxWarning={`You've already added ${teamScore} goals scored!`}
              value={stat.goals}
              onChange={(goals) =>
                onChange((currentStat) => ({ ...currentStat, goals }))
              }
            />
            <StatStepper
              label={t("matchday.result.player_performance.assists")}
              max={maxAssists}
              maxWarning={`You've already added ${teamScore} goals scored!`}
              value={stat.assists}
              onChange={(assists) =>
                onChange((currentStat) => ({ ...currentStat, assists }))
              }
            />
            <StatStepper
              label={t("matchday.result.player_performance.rating")}
              max={10}
              min={1}
              value={stat.rating}
              onChange={(rating) =>
                onChange((currentStat) => ({ ...currentStat, rating }))
              }
            />
          </ThemedView>

          <NumericStepperInput
            label={t("matchday.result.player_performance.minutes_played")}
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
            label={t("matchday.result.player_performance.attendance.label")}
            options={[
              { label: t("matchday.result.player_performance.attendance.present"), value: "present" },
              { label: t("matchday.result.player_performance.attendance.late"), value: "late" },
              { label: t("matchday.result.player_performance.attendance.no_show"), value: "no-show" },
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
            label={t("matchday.result.player_performance.card.label")}
            options={[
              { label: t("matchday.result.player_performance.card.none"), value: "none" },
              { label: t("matchday.result.player_performance.yellow"), value: "yellow" },
              { label: t("matchday.result.player_performance.red"), value: "red" },
            ]}
            value={stat.card}
            onChange={(card) =>
              onChange((currentStat) => ({ ...currentStat, card }))
            }
          />

          {isMatchDuty ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isMatchDutyFulfilled }}
              onPress={() => onMatchDutyFulfilledChange(!isMatchDutyFulfilled)}
              style={({ pressed }) => [
                styles.matchDutyResultRow,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{
                  ios: isMatchDutyFulfilled
                    ? "checkmark.square.fill"
                    : "square",
                  android: isMatchDutyFulfilled
                    ? "check_box"
                    : "check_box_outline_blank",
                  web: isMatchDutyFulfilled
                    ? "check_box"
                    : "check_box_outline_blank",
                }}
                tintColor={theme.text}
                size={22}
              />
              <ThemedView style={styles.playerPerformanceTitleGroup}>
                <ThemedText type="smallBold">
                  {t("matchday.result.player_performance.match_duty_fulfilled")}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t("matchday.result.player_performance.match_duty_help")}
                </ThemedText>
              </ThemedView>
            </Pressable>
          ) : null}
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}


function createMatchSetupFormStateFromMatch(match: MatchDayMatch): MatchSetupFormState {
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

function normalizeMatchFormation(value: unknown): MatchFormation {
  return matchFormations.includes(value as MatchFormation)
    ? (value as MatchFormation)
    : "4-3-3";
}

function getAssignedSubstitutes(form: MatchSetupFormState, players: Player[]) {
  return substituteSlots.flatMap((slot) => {
    const player = getAssignedPlayer(form.lineupAssignments[slot.id], players);
    return player ? [{ player, slot }] : [];
  });
}

function getJerseyResultBadges(
  stat: MatchPlayerResultStat | undefined,
  role: MatchResultSquadEntry["role"],
  matchDurationMinutes: number,
): JerseyResultBadges | null {
  if (!stat) return null;
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
  if (stat.attendance === "no-show") return null;
  if (role === "starter" && stat.minutesPlayed < matchDurationMinutes) return "off";
  if (role === "substitute" && stat.minutesPlayed > 0) return "on";
  return null;
}

function MatchCategoryIcon({ category, size }: { category: MatchCategory; size: number }) {
  const theme = useTheme();
  if (category === "friendly") {
    return <FontAwesome6 name="handshake" solid color={theme.text} size={size} />;
  }
  return <SymbolView name={getMatchCategoryIcon(category)} tintColor={theme.text} size={size} />;
}
