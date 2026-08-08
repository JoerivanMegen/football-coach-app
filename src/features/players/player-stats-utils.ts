import type { PlayerAttendanceStats } from "@/features/player-stats/player-stats-types";
import type { Player } from "@/features/players/player-types";

export type TeamStatsSortKey =
  | "player" | "trainingAttendancePercentage" | "matchAttendancePercentage"
  | "latePercentage" | "matchStarts" | "matchStarterPercentage"
  | "averageMatchMinutes" | "matchGoals" | "matchAssists"
  | "matchYellowCards" | "matchRedCards" | "matchCleanSheets"
  | "averageMatchRating" | "matchGoalsPer90" | "matchAssistsPer90"
  | "matchDutiesAssigned" | "matchDutiesFulfilled"
  | "matchDutyFulfillmentPercentage" | "recentForm";

export function compareTeamStats(left: PlayerAttendanceStats, right: PlayerAttendanceStats, key: TeamStatsSortKey, direction: "asc" | "desc") {
  const leftValue = getTeamStatsSortValue(left, key);
  const rightValue = getTeamStatsSortValue(right, key);
  if (leftValue === null && rightValue === null) return 0;
  if (leftValue === null) return 1;
  if (rightValue === null) return -1;
  const comparison = typeof leftValue === "string" ? leftValue.localeCompare(String(rightValue)) : leftValue - Number(rightValue);
  return direction === "asc" ? comparison : -comparison;
}

export function createEmptyPlayerStats(player: Player): PlayerAttendanceStats {
  return {
    playerId: player.id, firstName: player.firstName, lastName: player.lastName,
    nickName: player.nickName, position: player.position, totalEvents: 0,
    attendedEvents: 0, trainingEvents: 0, trainingAttended: 0,
    trainingAttendancePercentage: null, recentTrainingEvents: 0,
    recentTrainingAttended: 0, recentTrainingAttendancePercentage: null,
    matchEvents: 0, matchAttended: 0, matchAttendancePercentage: null,
    matchAppearances: 0, matchStarts: 0, matchStarterPercentage: null,
    matchGoals: 0, matchAssists: 0, matchYellowCards: 0, matchRedCards: 0,
    matchCleanSheets: 0, matchGoalsPer90: null, matchAssistsPer90: null,
    matchDutiesAssigned: 0, matchDutiesFulfilled: 0,
    matchDutyFulfillmentPercentage: null, teamEvents: 0, teamEventsAttended: 0,
    teamEventAttendancePercentage: null, totalMatchMinutes: 0,
    averageMatchMinutes: null, averageMatchRating: null, lateCount: 0,
    latePercentage: null, availableButAbsentCount: 0,
    signedOutButAttendedCount: 0, recentMatchRatings: [],
  };
}

export function isCleanSheetPosition(position: Player["position"]) {
  return position === "goalkeeper" || position === "defender";
}

export function formatPercentage(value: number | null) {
  return value === null ? "-" : `${value}%`;
}

export function formatNullableNumber(value: number | null) {
  return value === null ? "-" : String(value);
}

function getTeamStatsSortValue(stats: PlayerAttendanceStats, key: TeamStatsSortKey) {
  switch (key) {
    case "player": return `${stats.firstName} ${stats.lastName}`.toLocaleLowerCase();
    case "trainingAttendancePercentage": return stats.trainingAttendancePercentage;
    case "matchAttendancePercentage": return stats.matchAttendancePercentage;
    case "latePercentage": return stats.latePercentage;
    case "matchStarts": return stats.matchStarts;
    case "matchStarterPercentage": return stats.matchStarterPercentage;
    case "averageMatchMinutes": return stats.averageMatchMinutes;
    case "matchGoals": return stats.matchGoals;
    case "matchAssists": return stats.matchAssists;
    case "matchYellowCards": return stats.matchYellowCards;
    case "matchRedCards": return stats.matchRedCards;
    case "matchCleanSheets": return isCleanSheetPosition(stats.position) ? stats.matchCleanSheets : null;
    case "averageMatchRating": return stats.averageMatchRating;
    case "matchGoalsPer90": return stats.matchGoalsPer90;
    case "matchAssistsPer90": return stats.matchAssistsPer90;
    case "matchDutiesAssigned": return stats.matchDutiesAssigned;
    case "matchDutiesFulfilled": return stats.matchDutiesFulfilled;
    case "matchDutyFulfillmentPercentage": return stats.matchDutyFulfillmentPercentage;
    case "recentForm": {
      const ratings = stats.recentMatchRatings.slice(0, 5);
      return ratings.length ? ratings.reduce((total, rating) => total + rating.rating, 0) / ratings.length : null;
    }
  }
}
