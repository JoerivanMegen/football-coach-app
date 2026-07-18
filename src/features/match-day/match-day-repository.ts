import { getDatabaseAsync } from '@/db/database';
import type {
  CreateMatchDayMatchInput,
  MatchDayCategory,
  MatchDayLocation,
  MatchDayMatch,
} from '@/features/match-day/match-day-types';

type MatchDayMatchRow = {
  id: number;
  opponent: string;
  match_date: string;
  start_time: string;
  location: string;
  category: string;
  formation: string;
  notes: string;
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
  const rows = await db.getAllAsync<MatchDayMatchRow>(`
    SELECT *
    FROM match_day_matches
    ORDER BY match_date ASC, start_time ASC, created_at ASC
  `);

  return rows.map(mapMatchDayMatchRow);
}

export async function createMatchDayMatchAsync(input: CreateMatchDayMatchInput) {
  const db = await getDatabaseAsync();
  await ensureMatchDayStorageAsync();

  await db.runAsync(
    `
      INSERT INTO match_day_matches (
        opponent,
        match_date,
        start_time,
        location,
        category,
        formation,
        notes,
        player_statuses_json,
        lineup_assignments_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      normalizeRequiredText(input.opponent, 'opponent'),
      normalizeRequiredText(input.matchDate, 'matchDate'),
      normalizeRequiredText(input.startTime, 'startTime'),
      normalizeLocation(input.location),
      normalizeCategory(input.category),
      normalizeRequiredText(input.formation, 'formation'),
      input.notes.trim(),
      JSON.stringify(input.playerStatuses),
      JSON.stringify(input.lineupAssignments),
    ],
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
      category TEXT NOT NULL,
      formation TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
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
}

function mapMatchDayMatchRow(row: MatchDayMatchRow): MatchDayMatch {
  return {
    id: row.id,
    opponent: row.opponent,
    matchDate: row.match_date,
    startTime: row.start_time,
    location: normalizeLocation(row.location),
    category: normalizeCategory(row.category),
    formation: row.formation,
    notes: row.notes,
    playerStatuses: parseJsonRecord(row.player_statuses_json),
    lineupAssignments: parseJsonRecord(row.lineup_assignments_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

function normalizeRequiredText(value: string, fieldName: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Missing ${fieldName}`);
  }

  return normalizedValue;
}

function normalizeLocation(value: string): MatchDayLocation {
  return MatchDayLocations.includes(value as MatchDayLocation) ? (value as MatchDayLocation) : 'home';
}

function normalizeCategory(value: string): MatchDayCategory {
  return MatchDayCategories.includes(value as MatchDayCategory)
    ? (value as MatchDayCategory)
    : 'friendly';
}
