import { getDatabaseAsync } from '@/db/database';
import { getActiveSeasonIdAsync } from '@/features/seasons/season-repository';
import type {
  CreateMatchDayMatchInput,
  MatchDayCategory,
  MatchDayLocation,
  MatchDayMatch,
  MatchPlayerResultStats,
  UpdateMatchDayMatchResultInput,
  UpdateMatchDayMatchInput,
} from '@/features/match-day/match-day-types';

type MatchDayMatchRow = {
  id: number;
  opponent: string;
  match_date: string;
  start_time: string;
  location: string;
  venue: string | null;
  category: string;
  formation: string;
  notes: string;
  own_score: number | null;
  opponent_score: number | null;
  result_notes: string | null;
  player_result_stats_json: string | null;
  captain_player_id: number | null;
  match_duty_player_ids_json: string | null;
  fulfilled_match_duty_player_ids_json: string | null;
  guest_player_ids_json: string | null;
  player_statuses_json: string;
  lineup_assignments_json: string;
  created_at: string;
  updated_at: string;
};

const MatchDayLocations = ['home', 'away'] as const;
const MatchDayCategories = ['league', 'cup', 'friendly'] as const;

export async function listMatchDayMatchesAsync() {
  const db = await getDatabaseAsync();
  await ensureMatchDayStorageAsync();
  const seasonId = await getActiveSeasonIdAsync(db);
  const rows = await db.getAllAsync<MatchDayMatchRow>(`
    SELECT *
    FROM match_day_matches
    WHERE season_id = ?
    ORDER BY match_date DESC, start_time DESC, created_at DESC
  `, [seasonId]);

  return rows.map(mapMatchDayMatchRow);
}

export async function createMatchDayMatchAsync(input: CreateMatchDayMatchInput) {
  const db = await getDatabaseAsync();
  await ensureMatchDayStorageAsync();
  const seasonId = await getActiveSeasonIdAsync(db);

  const result = await db.runAsync(
    `
      INSERT INTO match_day_matches (
        opponent,
        match_date,
        start_time,
        location,
        venue,
        category,
        formation,
        notes,
        captain_player_id,
        match_duty_player_ids_json,
        guest_player_ids_json,
        player_statuses_json,
        lineup_assignments_json,
        season_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      normalizeRequiredText(input.opponent, 'opponent'),
      normalizeRequiredText(input.matchDate, 'matchDate'),
      normalizeRequiredText(input.startTime, 'startTime'),
      normalizeLocation(input.location),
      input.venue.trim(),
      normalizeCategory(input.category),
      normalizeRequiredText(input.formation, 'formation'),
      input.notes.trim(),
      input.captainPlayerId,
      JSON.stringify(input.matchDutyPlayerIds),
      JSON.stringify(normalizePlayerIds(input.guestPlayerIds)),
      JSON.stringify(input.playerStatuses),
      JSON.stringify(input.lineupAssignments),
      seasonId,
    ],
  );

  return result.lastInsertRowId;
}

export async function updateMatchDayMatchAsync(input: UpdateMatchDayMatchInput) {
  const db = await getDatabaseAsync();
  await ensureMatchDayStorageAsync();

  await db.runAsync(
    `
      UPDATE match_day_matches
      SET
        opponent = ?,
        match_date = ?,
        start_time = ?,
        location = ?,
        venue = ?,
        category = ?,
        formation = ?,
        notes = ?,
        captain_player_id = ?,
        match_duty_player_ids_json = ?,
        guest_player_ids_json = ?,
        player_statuses_json = ?,
        lineup_assignments_json = ?
      WHERE id = ?
    `,
    [
      normalizeRequiredText(input.opponent, 'opponent'),
      normalizeRequiredText(input.matchDate, 'matchDate'),
      normalizeRequiredText(input.startTime, 'startTime'),
      normalizeLocation(input.location),
      input.venue.trim(),
      normalizeCategory(input.category),
      normalizeRequiredText(input.formation, 'formation'),
      input.notes.trim(),
      input.captainPlayerId,
      JSON.stringify(input.matchDutyPlayerIds),
      JSON.stringify(normalizePlayerIds(input.guestPlayerIds)),
      JSON.stringify(input.playerStatuses),
      JSON.stringify(input.lineupAssignments),
      input.id,
    ],
  );
}

export async function deleteMatchDayMatchAsync(matchId: number) {
  const db = await getDatabaseAsync();
  await ensureMatchDayStorageAsync();

  await db.runAsync(
    `
      DELETE FROM match_day_matches
      WHERE id = ?
    `,
    [matchId],
  );
}

export async function updateMatchDayMatchResultAsync(input: UpdateMatchDayMatchResultInput) {
  const db = await getDatabaseAsync();
  await ensureMatchDayStorageAsync();
  const matchDurationMinutes = normalizeMatchDurationMinutes(input.matchDurationMinutes);

  await db.runAsync(
    `
      UPDATE match_day_matches
      SET
        own_score = ?,
        opponent_score = ?,
        result_notes = ?,
        player_result_stats_json = ?,
        fulfilled_match_duty_player_ids_json = ?
      WHERE id = ?
    `,
    [
      normalizeScore(input.ownScore),
      normalizeScore(input.opponentScore),
      input.resultNotes.trim(),
      JSON.stringify(normalizePlayerResultStats(input.playerResultStats, matchDurationMinutes)),
      JSON.stringify(normalizePlayerIds(input.fulfilledMatchDutyPlayerIds)),
      input.id,
    ],
  );
}

export async function deleteMatchDayMatchResultAsync(matchId: number) {
  const db = await getDatabaseAsync();
  await ensureMatchDayStorageAsync();

  await db.runAsync(
    `
      UPDATE match_day_matches
      SET
        own_score = NULL,
        opponent_score = NULL,
        result_notes = '',
        player_result_stats_json = '{}',
        fulfilled_match_duty_player_ids_json = '[]'
      WHERE id = ?
    `,
    [matchId],
  );
}

async function ensureMatchDayStorageAsync() {
  const db = await getDatabaseAsync();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS match_day_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opponent TEXT NOT NULL,
      match_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      location TEXT NOT NULL,
      venue TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      formation TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      own_score INTEGER,
      opponent_score INTEGER,
      result_notes TEXT NOT NULL DEFAULT '',
      player_result_stats_json TEXT NOT NULL DEFAULT '{}',
      captain_player_id INTEGER,
      match_duty_player_ids_json TEXT NOT NULL DEFAULT '[]',
      fulfilled_match_duty_player_ids_json TEXT NOT NULL DEFAULT '[]',
      guest_player_ids_json TEXT NOT NULL DEFAULT '[]',
      player_statuses_json TEXT NOT NULL,
      lineup_assignments_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_match_day_matches_date
      ON match_day_matches (match_date, start_time);

    CREATE TRIGGER IF NOT EXISTS trg_match_day_matches_updated_at
    AFTER UPDATE ON match_day_matches
    FOR EACH ROW
    BEGIN
      UPDATE match_day_matches
      SET updated_at = datetime('now')
      WHERE id = OLD.id;
    END;
  `);

  await addColumnIfMissingAsync('match_day_matches', 'captain_player_id', 'INTEGER');
  await addColumnIfMissingAsync(
    'match_day_matches',
    'guest_player_ids_json',
    "TEXT NOT NULL DEFAULT '[]'",
  );
  await addColumnIfMissingAsync(
    'match_day_matches',
    'match_duty_player_ids_json',
    "TEXT NOT NULL DEFAULT '[]'",
  );
  await addColumnIfMissingAsync(
    'match_day_matches',
    'fulfilled_match_duty_player_ids_json',
    "TEXT NOT NULL DEFAULT '[]'",
  );
  await addColumnIfMissingAsync('match_day_matches', 'own_score', 'INTEGER');
  await addColumnIfMissingAsync(
    'match_day_matches',
    'venue',
    "TEXT NOT NULL DEFAULT ''",
  );
  await addColumnIfMissingAsync('match_day_matches', 'opponent_score', 'INTEGER');
  await addColumnIfMissingAsync(
    'match_day_matches',
    'result_notes',
    "TEXT NOT NULL DEFAULT ''",
  );
  await addColumnIfMissingAsync(
    'match_day_matches',
    'player_result_stats_json',
    "TEXT NOT NULL DEFAULT '{}'",
  );
}

function mapMatchDayMatchRow(row: MatchDayMatchRow): MatchDayMatch {
  return {
    id: row.id,
    opponent: row.opponent,
    matchDate: row.match_date,
    startTime: row.start_time,
    location: normalizeLocation(row.location),
    venue: row.venue ?? '',
    category: normalizeCategory(row.category),
    formation: row.formation,
    notes: row.notes,
    ownScore: typeof row.own_score === 'number' ? row.own_score : null,
    opponentScore: typeof row.opponent_score === 'number' ? row.opponent_score : null,
    resultNotes: row.result_notes ?? '',
    playerResultStats: parsePlayerResultStats(row.player_result_stats_json ?? '{}'),
    captainPlayerId: row.captain_player_id,
    matchDutyPlayerIds: parseJsonNumberArray(row.match_duty_player_ids_json ?? '[]'),
    fulfilledMatchDutyPlayerIds: parseJsonNumberArray(
      row.fulfilled_match_duty_player_ids_json ?? '[]',
    ),
    guestPlayerIds: parseJsonNumberArray(row.guest_player_ids_json ?? '[]'),
    playerStatuses: parseJsonRecord(row.player_statuses_json),
    lineupAssignments: parseJsonRecord(row.lineup_assignments_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function addColumnIfMissingAsync(tableName: string, columnName: string, definition: string) {
  const db = await getDatabaseAsync();
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  const columnExists = columns.some((column) => column.name === columnName);

  if (!columnExists) {
    await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function parseJsonRecord(value: string) {
  try {
    const parsedValue = JSON.parse(value) as unknown;

    if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
      return parsedValue as Record<string, never>;
    }
  } catch {
    // Fall through to an empty object when old or corrupted local data is encountered.
  }

  return {};
}

function parseJsonNumberArray(value: string) {
  try {
    const parsedValue = JSON.parse(value) as unknown;

    if (Array.isArray(parsedValue)) {
      return parsedValue.filter((item): item is number => typeof item === 'number');
    }
  } catch {
    // Fall through to an empty array when old or corrupted local data is encountered.
  }

  return [];
}

function normalizePlayerIds(playerIds: number[]) {
  return [...new Set(playerIds)].filter((playerId) => Number.isInteger(playerId));
}

function parsePlayerResultStats(value: string): MatchPlayerResultStats {
  try {
    const parsedValue = JSON.parse(value) as unknown;

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return {};
    }

    const statsEntries = Object.entries(parsedValue).flatMap(([playerId, stat]) => {
      const numericPlayerId = Number(playerId);

      if (!Number.isInteger(numericPlayerId) || !stat || typeof stat !== 'object') {
        return [];
      }

      const rawStat = stat as Partial<Record<keyof MatchPlayerResultStats[number], unknown>>;

      return [
        [
          numericPlayerId,
          {
            goals: normalizeScore(Number(rawStat.goals ?? 0)),
            assists: normalizeScore(Number(rawStat.assists ?? 0)),
            attendance: normalizeResultAttendance(rawStat.attendance),
            card: normalizeResultCard(rawStat.card),
            rating: normalizeRating(Number(rawStat.rating ?? 6)),
            subbedOnMinute: normalizeOptionalMinute(rawStat.subbedOnMinute, 120),
            subbedOffMinute: normalizeOptionalMinute(rawStat.subbedOffMinute, 120),
            minutesPlayed: normalizeMinute(Number(rawStat.minutesPlayed ?? 0), 120),
          },
        ] satisfies [number, MatchPlayerResultStats[number]],
      ];
    });

    return Object.fromEntries(statsEntries);
  } catch {
    // Fall through to an empty object when old or corrupted local data is encountered.
  }

  return {};
}

function normalizePlayerResultStats(
  stats: MatchPlayerResultStats,
  matchDurationMinutes: number,
): MatchPlayerResultStats {
  return Object.fromEntries(
    Object.entries(stats).flatMap(([playerId, stat]) => {
      const numericPlayerId = Number(playerId);

      if (!Number.isInteger(numericPlayerId)) {
        return [];
      }

      return [
        [
          numericPlayerId,
          {
            goals: normalizeScore(stat.goals),
            assists: normalizeScore(stat.assists),
            attendance: normalizeResultAttendance(stat.attendance),
            card: normalizeResultCard(stat.card),
            rating: normalizeRating(stat.rating),
            subbedOnMinute: normalizeOptionalMinute(
              stat.subbedOnMinute,
              matchDurationMinutes,
            ),
            subbedOffMinute: normalizeOptionalMinute(
              stat.subbedOffMinute,
              matchDurationMinutes,
            ),
            minutesPlayed: normalizeMinute(stat.minutesPlayed, matchDurationMinutes),
          },
        ] satisfies [number, MatchPlayerResultStats[number]],
      ];
    }),
  );
}

function normalizeRequiredText(value: string, fieldName: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Missing ${fieldName}`);
  }

  return normalizedValue;
}

function normalizeScore(value: number) {
  return Math.max(0, Math.trunc(value));
}

function normalizeMinute(value: number, maxMinutes = 90) {
  return Math.min(maxMinutes, Math.max(0, Math.trunc(value)));
}

function normalizeOptionalMinute(value: unknown, maxMinutes = 90) {
  return typeof value === 'number' ? normalizeMinute(value, maxMinutes) : null;
}

function normalizeMatchDurationMinutes(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 90;
  }

  return Math.min(120, Math.max(1, Math.trunc(value)));
}

function normalizeRating(value: number) {
  return Math.min(10, Math.max(1, Math.trunc(value)));
}

function normalizeResultAttendance(value: unknown) {
  return value === 'late' || value === 'no-show' ? value : 'present';
}

function normalizeResultCard(value: unknown) {
  return value === 'yellow' || value === 'red' ? value : 'none';
}

function normalizeLocation(value: string): MatchDayLocation {
  return MatchDayLocations.includes(value as MatchDayLocation) ? (value as MatchDayLocation) : 'home';
}

function normalizeCategory(value: string): MatchDayCategory {
  return MatchDayCategories.includes(value as MatchDayCategory)
    ? (value as MatchDayCategory)
    : 'friendly';
}
