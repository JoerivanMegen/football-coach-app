import { getDatabaseAsync } from "@/db/database";
import type {
  PlayerAttendanceStats,
  RecentMatchRating,
} from "@/features/player-stats/player-stats-types";
import {
  PLAYER_POSITIONS,
  type PlayerPosition,
} from "@/features/players/player-types";
import { getTeamSettingsAsync } from "@/features/settings/team-settings-repository";
import { getActiveSeasonIdAsync } from "@/features/seasons/season-repository";

type PlayerAttendanceStatsRow = {
  player_id: number;
  first_name: string;
  last_name: string;
  nick_name: string | null;
  position: string;
  total_events: number;
  attended_events: number;
  training_events: number;
  training_attended: number;
  recent_training_events: number;
  recent_training_attended: number;
  match_events: number;
  match_attended: number;
  team_events: number;
  team_events_attended: number;
  total_match_minutes: number | null;
  average_match_minutes: number | null;
  average_match_rating: number | null;
  late_count: number;
  available_but_absent_count: number;
  signed_out_but_attended_count: number;
  fine_count: number;
  fine_amount_cents: number;
};

type RecentMatchRatingRow = {
  player_id: number;
  event_id: number;
  event_date: string;
  opponent: string | null;
  match_rating: number;
};

type MatchDayStatsRow = {
  id: number;
  opponent: string;
  match_date: string;
  start_time: string;
  opponent_score: number;
  lineup_assignments_json: string;
  player_result_stats_json: string | null;
  match_duty_player_ids_json: string | null;
  fulfilled_match_duty_player_ids_json: string | null;
};

type MatchDayPlayerStat = {
  goals: number;
  assists: number;
  attendance: string;
  card: string;
  rating: number;
  minutesPlayed: number;
};

type MatchDayPlayerAggregate = {
  squadMatches: number;
  appearances: number;
  starts: number;
  lateCount: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
  totalMinutes: number;
  ratingTotal: number;
  ratedMatches: number;
  recentRatings: RecentMatchRating[];
  dutiesAssigned: number;
  dutiesFulfilled: number;
};

type PlayerInjuryRow = {
  player_id: number;
  start_date: string;
  end_date: string | null;
};

export async function listPlayerAttendanceStatsAsync(seasonId?: number) {
  const db = await getDatabaseAsync();
  const resolvedSeasonId = seasonId ?? (await getActiveSeasonIdAsync(db));
  const settings = await getTeamSettingsAsync();
  const includeFriendlyMatches =
    settings?.includeFriendlyMatchesInStats ?? true;
  const [rows, recentRatingRows, matchDayRows, injuryRows] = await Promise.all([
    db.getAllAsync<PlayerAttendanceStatsRow>(`
    SELECT
      players.id AS player_id,
      players.first_name,
      players.last_name,
      players.nick_name,
      players.position,
      COALESCE(SUM(CASE WHEN events.type IN ('training', 'match') THEN 1 ELSE 0 END), 0)
        AS total_events,
      COALESCE(
        SUM(
          CASE
            WHEN events.type IN ('training', 'match') AND event_attendance.is_present = 1
            THEN 1
            ELSE 0
          END
        ),
        0
      )
        AS attended_events,
      COALESCE(SUM(CASE WHEN events.type = 'training' THEN 1 ELSE 0 END), 0)
        AS training_events,
      COALESCE(SUM(CASE WHEN events.type = 'training' AND event_attendance.is_present = 1 THEN 1 ELSE 0 END), 0)
        AS training_attended,
      COALESCE(
        SUM(
          CASE
            WHEN events.type = 'training'
             AND date(substr(events.event_date, 7, 4) || '-' || substr(events.event_date, 4, 2) || '-' || substr(events.event_date, 1, 2)) >= date('now', '-35 days')
            THEN 1
            ELSE 0
          END
        ),
        0
      ) AS recent_training_events,
      COALESCE(
        SUM(
          CASE
            WHEN events.type = 'training'
             AND event_attendance.is_present = 1
             AND date(substr(events.event_date, 7, 4) || '-' || substr(events.event_date, 4, 2) || '-' || substr(events.event_date, 1, 2)) >= date('now', '-35 days')
            THEN 1
            ELSE 0
          END
        ),
        0
      ) AS recent_training_attended,
      COALESCE(SUM(CASE WHEN events.type = 'match' THEN 1 ELSE 0 END), 0)
        AS match_events,
      COALESCE(SUM(CASE WHEN events.type = 'match' AND event_attendance.is_present = 1 THEN 1 ELSE 0 END), 0)
        AS match_attended,
      COALESCE(SUM(CASE WHEN events.type = 'other' THEN 1 ELSE 0 END), 0)
        AS team_events,
      COALESCE(SUM(CASE WHEN events.type = 'other' AND event_attendance.is_present = 1 THEN 1 ELSE 0 END), 0)
        AS team_events_attended,
      COALESCE(
        SUM(
          CASE
            WHEN events.type = 'match' AND event_attendance.is_present = 1
            THEN COALESCE(event_attendance.minutes_played, 0)
            ELSE 0
          END
        ),
        0
      ) AS total_match_minutes,
      AVG(
        CASE
          WHEN events.type = 'match'
           AND event_attendance.is_present = 1
           AND event_attendance.minutes_played IS NOT NULL
          THEN event_attendance.minutes_played
          ELSE NULL
        END
      ) AS average_match_minutes,
      AVG(
        CASE
          WHEN events.type = 'match'
           AND event_attendance.is_present = 1
           AND event_attendance.match_rating IS NOT NULL
          THEN event_attendance.match_rating
          ELSE NULL
        END
      ) AS average_match_rating,
      COALESCE(
        SUM(
          CASE
            WHEN events.type IN ('training', 'match') AND event_attendance.is_late = 1
            THEN 1
            ELSE 0
          END
        ),
        0
      )
        AS late_count,
      COALESCE(
        SUM(
          CASE
            WHEN events.type IN ('training', 'match')
             AND event_player_signups.signup_status = 'available'
             AND event_attendance.is_present = 0
            THEN 1
            ELSE 0
          END
        ),
        0
      ) AS available_but_absent_count
      ,
      COALESCE(
        SUM(
          CASE
            WHEN events.type IN ('training', 'match')
             AND event_player_signups.signup_status = 'unavailable'
             AND event_attendance.is_present = 1
            THEN 1
            ELSE 0
          END
        ),
        0
      ) AS signed_out_but_attended_count
      ,
      (SELECT COUNT(*) FROM player_fines
       WHERE player_fines.player_id = players.id
         AND player_fines.season_id = ?
         AND player_fines.is_carried_over = 0)
        AS fine_count,
      COALESCE(
        (SELECT SUM(player_fines.amount_cents) FROM player_fines
         WHERE player_fines.player_id = players.id
           AND player_fines.season_id = ?
           AND player_fines.is_carried_over = 0),
        0
      ) AS fine_amount_cents
    FROM players
    LEFT JOIN event_attendance
      ON event_attendance.player_id = players.id
    LEFT JOIN events
      ON events.id = event_attendance.event_id
     AND events.attendance_status = 'marked'
     AND events.season_id = ?
     AND NOT EXISTS (
       SELECT 1
       FROM player_injuries
       WHERE player_injuries.player_id = players.id
         AND date(substr(events.event_date, 7, 4) || '-' || substr(events.event_date, 4, 2) || '-' || substr(events.event_date, 1, 2)) >= date(player_injuries.start_date)
         AND (player_injuries.end_date IS NULL OR date(substr(events.event_date, 7, 4) || '-' || substr(events.event_date, 4, 2) || '-' || substr(events.event_date, 1, 2)) < date(player_injuries.end_date))
     )
    LEFT JOIN event_player_signups
      ON event_player_signups.event_id = events.id
     AND event_player_signups.player_id = players.id
    WHERE players.is_active = 1
       OR EXISTS (
         SELECT 1
         FROM event_attendance season_attendance
         INNER JOIN events season_event ON season_event.id = season_attendance.event_id
         WHERE season_attendance.player_id = players.id
           AND season_event.season_id = ?
       )
       OR EXISTS (
         SELECT 1
         FROM match_day_matches season_match
         WHERE season_match.season_id = ?
           AND json_extract(
             COALESCE(season_match.player_result_stats_json, '{}'),
             '$."' || players.id || '"'
           ) IS NOT NULL
       )
    GROUP BY players.id
    ORDER BY players.last_name COLLATE NOCASE, players.first_name COLLATE NOCASE
  `, [
    resolvedSeasonId,
    resolvedSeasonId,
    resolvedSeasonId,
    resolvedSeasonId,
    resolvedSeasonId,
  ]),
    db.getAllAsync<RecentMatchRatingRow>(`
      SELECT
        event_attendance.player_id,
        events.id AS event_id,
        events.event_date,
        events.opponent,
        event_attendance.match_rating
      FROM event_attendance
      INNER JOIN events
        ON events.id = event_attendance.event_id
       AND events.type = 'match'
       AND events.attendance_status = 'marked'
       AND events.season_id = ?
      WHERE event_attendance.is_present = 1
        AND event_attendance.match_rating IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM player_injuries
          WHERE player_injuries.player_id = event_attendance.player_id
            AND date(substr(events.event_date, 7, 4) || '-' || substr(events.event_date, 4, 2) || '-' || substr(events.event_date, 1, 2)) >= date(player_injuries.start_date)
            AND (player_injuries.end_date IS NULL OR date(substr(events.event_date, 7, 4) || '-' || substr(events.event_date, 4, 2) || '-' || substr(events.event_date, 1, 2)) < date(player_injuries.end_date))
        )
      ORDER BY
        event_attendance.player_id,
        events.event_date DESC,
        events.start_time DESC,
        events.created_at DESC
    `, [resolvedSeasonId]),
    db.getAllAsync<MatchDayStatsRow>(
      `
      SELECT
        id,
        opponent,
        match_date,
        start_time,
        opponent_score,
        lineup_assignments_json,
        player_result_stats_json,
        match_duty_player_ids_json,
        fulfilled_match_duty_player_ids_json
      FROM match_day_matches
      WHERE own_score IS NOT NULL
        AND opponent_score IS NOT NULL
        AND season_id = ?
        AND (? = 1 OR category <> 'friendly')
      ORDER BY match_date DESC, start_time DESC, created_at DESC
    `,
      [resolvedSeasonId, includeFriendlyMatches ? 1 : 0],
    ),
    db.getAllAsync<PlayerInjuryRow>(`
      SELECT player_id, start_date, end_date
      FROM player_injuries
      ORDER BY player_id, start_date
    `),
  ]);
  const injuriesByPlayerId = groupInjuriesByPlayerId(injuryRows);
  const matchDayStatsByPlayerId =
    aggregateMatchDayStatsByPlayerId(matchDayRows, injuriesByPlayerId);
  const recentRatingsByPlayerId = mergeRecentMatchRatingsByPlayerId(
    recentRatingRows,
    matchDayStatsByPlayerId,
  );

  return rows.map((row) =>
    mapPlayerAttendanceStatsRow(
      row,
      recentRatingsByPlayerId.get(row.player_id) ?? [],
      matchDayStatsByPlayerId.get(row.player_id),
    ),
  );
}

function mapPlayerAttendanceStatsRow(
  row: PlayerAttendanceStatsRow,
  recentMatchRatings: RecentMatchRating[],
  matchDayStats: MatchDayPlayerAggregate | undefined,
): PlayerAttendanceStats {
  const totalEvents = Number(row.total_events);
  const attendedEvents = Number(row.attended_events);
  const trainingEvents = Number(row.training_events);
  const trainingAttended = Number(row.training_attended);
  const recentTrainingEvents = Number(row.recent_training_events);
  const recentTrainingAttended = Number(row.recent_training_attended);
  const matchEvents = matchDayStats?.squadMatches ?? Number(row.match_events);
  const matchAttended = Number(row.match_attended);
  const matchAppearances = matchDayStats?.appearances ?? matchAttended;
  const matchStarts = matchDayStats?.starts ?? 0;
  const teamEvents = Number(row.team_events);
  const teamEventsAttended = Number(row.team_events_attended);
  const totalMatchMinutes =
    matchDayStats?.totalMinutes ?? Number(row.total_match_minutes ?? 0);
  const lateCount = Number(row.late_count) + (matchDayStats?.lateCount ?? 0);
  const resolvedTotalEvents = matchDayStats
    ? trainingEvents + matchEvents
    : totalEvents;
  const resolvedAttendedEvents = matchDayStats
    ? trainingAttended + matchAppearances
    : attendedEvents;
  const averageMatchMinutes =
    matchDayStats && matchDayStats.appearances > 0
      ? roundNullableNumber(
          matchDayStats.totalMinutes / matchDayStats.appearances,
        )
      : roundNullableNumber(row.average_match_minutes);
  const averageMatchRating =
    matchDayStats && matchDayStats.ratedMatches > 0
      ? roundNullableNumber(
          matchDayStats.ratingTotal / matchDayStats.ratedMatches,
          1,
        )
      : roundNullableNumber(row.average_match_rating, 1);

  return {
    playerId: row.player_id,
    firstName: row.first_name,
    lastName: row.last_name,
    nickName: row.nick_name,
    position: normalizePlayerPosition(row.position),
    totalEvents: resolvedTotalEvents,
    attendedEvents: resolvedAttendedEvents,
    trainingEvents,
    trainingAttended,
    trainingAttendancePercentage: calculatePercentage(
      trainingAttended,
      trainingEvents,
    ),
    recentTrainingEvents,
    recentTrainingAttended,
    recentTrainingAttendancePercentage: calculatePercentage(
      recentTrainingAttended,
      recentTrainingEvents,
    ),
    matchEvents,
    matchAttended: matchAppearances,
    matchAttendancePercentage: calculatePercentage(
      matchAppearances,
      matchEvents,
    ),
    matchAppearances,
    matchStarts,
    matchStarterPercentage: calculatePercentage(matchStarts, matchAppearances),
    matchGoals: matchDayStats?.goals ?? 0,
    matchAssists: matchDayStats?.assists ?? 0,
    matchYellowCards: matchDayStats?.yellowCards ?? 0,
    matchRedCards: matchDayStats?.redCards ?? 0,
    matchCleanSheets:
      row.position === "goalkeeper" || row.position === "defender"
        ? (matchDayStats?.cleanSheets ?? 0)
        : 0,
    matchGoalsPer90: calculatePer90(
      matchDayStats?.goals ?? 0,
      totalMatchMinutes,
    ),
    matchAssistsPer90: calculatePer90(
      matchDayStats?.assists ?? 0,
      totalMatchMinutes,
    ),
    matchDutiesAssigned: matchDayStats?.dutiesAssigned ?? 0,
    matchDutiesFulfilled: matchDayStats?.dutiesFulfilled ?? 0,
    matchDutyFulfillmentPercentage: calculatePercentage(
      matchDayStats?.dutiesFulfilled ?? 0,
      matchDayStats?.dutiesAssigned ?? 0,
    ),
    fineCount: Number(row.fine_count),
    fineAmountCents: Number(row.fine_amount_cents),
    teamEvents,
    teamEventsAttended,
    teamEventAttendancePercentage: calculatePercentage(
      teamEventsAttended,
      teamEvents,
    ),
    totalMatchMinutes,
    averageMatchMinutes,
    averageMatchRating,
    lateCount,
    latePercentage: calculatePercentage(lateCount, resolvedAttendedEvents),
    availableButAbsentCount: Number(row.available_but_absent_count),
    signedOutButAttendedCount: Number(row.signed_out_but_attended_count),
    recentMatchRatings,
  };
}

function aggregateMatchDayStatsByPlayerId(
  rows: MatchDayStatsRow[],
  injuriesByPlayerId: Map<number, PlayerInjuryRow[]>,
) {
  const statsByPlayerId = new Map<number, MatchDayPlayerAggregate>();

  for (const row of rows) {
    const starterPlayerIds = new Set(
      Object.values(parseJsonNumberRecord(row.lineup_assignments_json)),
    );
    const playerStats = parseMatchDayPlayerStats(
      row.player_result_stats_json ?? "{}",
    );
    const matchDutyPlayerIds = parseJsonNumberArray(
      row.match_duty_player_ids_json ?? "[]",
    );
    const fulfilledMatchDutyPlayerIds = new Set(
      parseJsonNumberArray(row.fulfilled_match_duty_player_ids_json ?? "[]"),
    );

    for (const playerId of matchDutyPlayerIds) {
      if (isPlayerInjuredOnDate(playerId, row.match_date, injuriesByPlayerId)) {
        continue;
      }
      const currentStats = getOrCreateMatchDayPlayerAggregate(
        statsByPlayerId,
        playerId,
      );
      currentStats.dutiesAssigned += 1;
      currentStats.dutiesFulfilled += fulfilledMatchDutyPlayerIds.has(playerId)
        ? 1
        : 0;
    }

    for (const [playerId, stat] of Object.entries(playerStats)) {
      const numericPlayerId = Number(playerId);

      if (!Number.isInteger(numericPlayerId)) {
        continue;
      }

      if (
        isPlayerInjuredOnDate(
          numericPlayerId,
          row.match_date,
          injuriesByPlayerId,
        )
      ) {
        continue;
      }

      const currentStats = getOrCreateMatchDayPlayerAggregate(
        statsByPlayerId,
        numericPlayerId,
      );
      currentStats.squadMatches += 1;

      if (stat.minutesPlayed <= 0) {
        continue;
      }

      const isStarter = starterPlayerIds.has(numericPlayerId);

      currentStats.appearances += 1;
      currentStats.starts += isStarter ? 1 : 0;
      currentStats.lateCount += stat.attendance === "late" ? 1 : 0;
      currentStats.goals += stat.goals;
      currentStats.assists += stat.assists;
      currentStats.yellowCards += stat.card === "yellow" ? 1 : 0;
      currentStats.redCards += stat.card === "red" ? 1 : 0;
      currentStats.cleanSheets +=
        row.opponent_score === 0 && stat.minutesPlayed >= 60
          ? 1
          : 0;
      currentStats.totalMinutes += stat.minutesPlayed;
      currentStats.ratingTotal += stat.rating;
      currentStats.ratedMatches += 1;

      if (currentStats.recentRatings.length < 5) {
        currentStats.recentRatings.push({
          eventId: row.id,
          eventDate: row.match_date,
          opponent: row.opponent,
          rating: stat.rating,
        });
      }
    }
  }

  return statsByPlayerId;
}

function groupInjuriesByPlayerId(rows: PlayerInjuryRow[]) {
  const grouped = new Map<number, PlayerInjuryRow[]>();
  for (const row of rows) {
    const injuries = grouped.get(row.player_id) ?? [];
    injuries.push(row);
    grouped.set(row.player_id, injuries);
  }
  return grouped;
}

function isPlayerInjuredOnDate(
  playerId: number,
  eventDate: string,
  injuriesByPlayerId: Map<number, PlayerInjuryRow[]>,
) {
  return (injuriesByPlayerId.get(playerId) ?? []).some(
    (injury) =>
      eventDate >= injury.start_date &&
      (injury.end_date === null || eventDate < injury.end_date),
  );
}

function getOrCreateMatchDayPlayerAggregate(
  statsByPlayerId: Map<number, MatchDayPlayerAggregate>,
  playerId: number,
) {
  const currentStats = statsByPlayerId.get(playerId);

  if (currentStats) {
    return currentStats;
  }

  const nextStats: MatchDayPlayerAggregate = {
    squadMatches: 0,
    appearances: 0,
    starts: 0,
    lateCount: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    cleanSheets: 0,
    totalMinutes: 0,
    ratingTotal: 0,
    ratedMatches: 0,
    recentRatings: [],
    dutiesAssigned: 0,
    dutiesFulfilled: 0,
  };

  statsByPlayerId.set(playerId, nextStats);

  return nextStats;
}

function mergeRecentMatchRatingsByPlayerId(
  rows: RecentMatchRatingRow[],
  matchDayStatsByPlayerId: Map<number, MatchDayPlayerAggregate>,
) {
  const ratingsByPlayerId = groupRecentMatchRatingsByPlayerId(rows);

  for (const [playerId, matchDayStats] of matchDayStatsByPlayerId) {
    ratingsByPlayerId.set(playerId, matchDayStats.recentRatings);
  }

  return ratingsByPlayerId;
}

function parseJsonNumberRecord(value: string) {
  try {
    const parsedValue = JSON.parse(value) as unknown;

    if (
      !parsedValue ||
      typeof parsedValue !== "object" ||
      Array.isArray(parsedValue)
    ) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).flatMap(([key, item]) => {
        if (typeof item !== "number") {
          return [];
        }

        return [[key, item]];
      }),
    ) as Record<string, number>;
  } catch {
    return {};
  }
}

function parseJsonNumberArray(value: string) {
  try {
    const parsedValue = JSON.parse(value) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (item): item is number =>
        typeof item === "number" && Number.isInteger(item),
    );
  } catch {
    return [];
  }
}

function parseMatchDayPlayerStats(value: string) {
  try {
    const parsedValue = JSON.parse(value) as unknown;

    if (
      !parsedValue ||
      typeof parsedValue !== "object" ||
      Array.isArray(parsedValue)
    ) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).flatMap(([playerId, stat]) => {
        if (!stat || typeof stat !== "object") {
          return [];
        }

        const rawStat = stat as Partial<
          Record<keyof MatchDayPlayerStat, unknown>
        >;

        return [
          [
            playerId,
            {
              goals: normalizeStatCount(rawStat.goals),
              assists: normalizeStatCount(rawStat.assists),
              attendance:
                typeof rawStat.attendance === "string"
                  ? rawStat.attendance
                  : "present",
              card: typeof rawStat.card === "string" ? rawStat.card : "none",
              rating: normalizeRating(rawStat.rating),
              minutesPlayed: normalizeStatCount(rawStat.minutesPlayed),
            },
          ] satisfies [string, MatchDayPlayerStat],
        ];
      }),
    ) as Record<string, MatchDayPlayerStat>;
  } catch {
    return {};
  }
}

function groupRecentMatchRatingsByPlayerId(rows: RecentMatchRatingRow[]) {
  const ratingsByPlayerId = new Map<number, RecentMatchRating[]>();

  for (const row of rows) {
    const ratings = ratingsByPlayerId.get(row.player_id) ?? [];

    if (ratings.length >= 5) {
      ratingsByPlayerId.set(row.player_id, ratings);
      continue;
    }

    ratings.push({
      eventId: row.event_id,
      eventDate: row.event_date,
      opponent: row.opponent,
      rating: row.match_rating,
    });
    ratingsByPlayerId.set(row.player_id, ratings);
  }

  return ratingsByPlayerId;
}

function calculatePercentage(value: number, total: number) {
  if (total === 0) {
    return null;
  }

  return Math.round((value / total) * 100);
}

function calculatePer90(value: number, totalMinutes: number) {
  if (totalMinutes === 0) {
    return null;
  }

  return roundNullableNumber((value / totalMinutes) * 90, 2);
}

function roundNullableNumber(value: number | null, fractionDigits = 0) {
  if (value === null) {
    return null;
  }

  const multiplier = 10 ** fractionDigits;
  return Math.round(value * multiplier) / multiplier;
}

function normalizeStatCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

function normalizeRating(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 6;
  }

  return Math.min(10, Math.max(1, Math.trunc(value)));
}

function normalizePlayerPosition(value: string): PlayerPosition {
  if (PLAYER_POSITIONS.includes(value as PlayerPosition)) {
    return value as PlayerPosition;
  }

  return "midfielder";
}
