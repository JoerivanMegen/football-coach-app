import { defaultMatchDurationMinutes } from "@/features/match-day/match-day-config";
import type { MatchPlayerResultAttendance, MatchPlayerResultCard, MatchPlayerResultStat, MatchPlayerResultStats } from "@/features/match-day/match-day-types";
import type { MatchResultSquadEntry } from "@/features/match-day/match-day-view-types";

export function initializeMatchResultPlayerStats(
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

export function createDefaultMatchPlayerResultStat(
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

export function deriveMatchPlayerMinutes(
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

export function capPlayerScoringToTeamScore(
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

export function getMaxGoalsForPlayer(
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

export function getMaxAssistsForPlayer(
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

export function normalizeMatchPlayerResultStat(
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

export function getRestoredAttendanceMinutes(
  role: MatchResultSquadEntry["role"],
  matchDurationMinutes: number,
) {
  return role === "starter" ? matchDurationMinutes : 0;
}

export function parseNumericInputValue(value: string, min: number, max: number) {
  const numericValue = Number(value.replace(/\D/g, ""));

  if (!Number.isFinite(numericValue)) {
    return min;
  }

  return clampNumber(numericValue, min, max);
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function clearSubstitutionMinutes(stat: MatchPlayerResultStat) {
  return {
    ...stat,
    subbedOffMinute: null,
    subbedOnMinute: null,
  };
}

export function getAttendanceLabel(attendance: MatchPlayerResultAttendance) {
  switch (attendance) {
    case "late":
      return "Late";
    case "no-show":
      return "No-show";
    default:
      return "Present";
  }
}

export function getCardLabel(card: MatchPlayerResultCard) {
  switch (card) {
    case "yellow":
      return "Yellow";
    case "red":
      return "Red";
    default:
      return "None";
  }
}

