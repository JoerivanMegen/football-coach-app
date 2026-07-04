import { getDatabaseAsync } from '@/db/database';
import { PLAYER_POSITIONS, type PlayerPosition } from '@/features/players/player-types';
import type {
  PlayerAttendanceStats,
  RecentMatchRating,
} from '@/features/player-stats/player-stats-types';

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
};

type RecentMatchRatingRow = {
  player_id: number;
  event_id: number;
  event_date: string;
  opponent: string | null;
  match_rating: number;
};

export async function listPlayerAttendanceStatsAsync() {
  const db = await getDatabaseAsync();
  const [rows, recentRatingRows] = await Promise.all([
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
    FROM players
    LEFT JOIN event_attendance
      ON event_attendance.player_id = players.id
    LEFT JOIN events
      ON events.id = event_attendance.event_id
     AND events.attendance_status = 'marked'
    LEFT JOIN event_player_signups
      ON event_player_signups.event_id = events.id
     AND event_player_signups.player_id = players.id
    WHERE players.is_active = 1
    GROUP BY players.id
    ORDER BY players.last_name COLLATE NOCASE, players.first_name COLLATE NOCASE
  `),
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
      WHERE event_attendance.is_present = 1
        AND event_attendance.match_rating IS NOT NULL
      ORDER BY
        event_attendance.player_id,
        events.event_date DESC,
        events.start_time DESC,
        events.created_at DESC
    `),
  ]);
  const recentRatingsByPlayerId = groupRecentMatchRatingsByPlayerId(recentRatingRows);

  return rows.map((row) =>
    mapPlayerAttendanceStatsRow(row, recentRatingsByPlayerId.get(row.player_id) ?? [])
  );
}

function mapPlayerAttendanceStatsRow(
  row: PlayerAttendanceStatsRow,
  recentMatchRatings: RecentMatchRating[]
): PlayerAttendanceStats {
  const totalEvents = Number(row.total_events);
  const attendedEvents = Number(row.attended_events);
  const trainingEvents = Number(row.training_events);
  const trainingAttended = Number(row.training_attended);
  const matchEvents = Number(row.match_events);
  const matchAttended = Number(row.match_attended);
  const teamEvents = Number(row.team_events);
  const teamEventsAttended = Number(row.team_events_attended);
  const totalMatchMinutes = Number(row.total_match_minutes ?? 0);
  const lateCount = Number(row.late_count);

  return {
    playerId: row.player_id,
    firstName: row.first_name,
    lastName: row.last_name,
    nickName: row.nick_name,
    position: normalizePlayerPosition(row.position),
    totalEvents,
    attendedEvents,
    attendancePercentage: calculatePercentage(attendedEvents, totalEvents),
    trainingEvents,
    trainingAttended,
    trainingAttendancePercentage: calculatePercentage(trainingAttended, trainingEvents),
    matchEvents,
    matchAttended,
    matchAttendancePercentage: calculatePercentage(matchAttended, matchEvents),
    teamEvents,
    teamEventsAttended,
    teamEventAttendancePercentage: calculatePercentage(teamEventsAttended, teamEvents),
    totalMatchMinutes,
    averageMatchMinutes: roundNullableNumber(row.average_match_minutes),
    averageMatchRating: roundNullableNumber(row.average_match_rating, 1),
    lateCount,
    latePercentage: calculatePercentage(lateCount, attendedEvents),
    availableButAbsentCount: Number(row.available_but_absent_count),
    signedOutButAttendedCount: Number(row.signed_out_but_attended_count),
    recentMatchRatings,
  };
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

function roundNullableNumber(value: number | null, fractionDigits = 0) {
  if (value === null) {
    return null;
  }

  const multiplier = 10 ** fractionDigits;
  return Math.round(value * multiplier) / multiplier;
}

function normalizePlayerPosition(value: string): PlayerPosition {
  if (PLAYER_POSITIONS.includes(value as PlayerPosition)) {
    return value as PlayerPosition;
  }

  return 'midfielder';
}
