import type { SQLiteDatabase } from "expo-sqlite";

import { getDatabaseAsync } from "@/db/database";
import type {
  Season,
  SeasonCompletionStatus,
  SeasonStatus,
} from "@/features/seasons/season-types";

type SeasonRow = {
  id: number;
  name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function getActiveSeasonAsync() {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<SeasonRow>(
    "SELECT * FROM seasons WHERE status = 'active' LIMIT 1",
  );
  return row ? mapSeasonRow(row) : null;
}

export async function listEndedSeasonsAsync() {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync<SeasonRow>(`
    SELECT *
    FROM seasons
    WHERE status = 'ended'
    ORDER BY end_date DESC, id DESC
  `);
  return rows.map(mapSeasonRow);
}

export async function getSeasonByIdAsync(seasonId: number) {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<SeasonRow>(
    "SELECT * FROM seasons WHERE id = ?",
    [seasonId],
  );
  return row ? mapSeasonRow(row) : null;
}

export async function updateSeasonNameAsync(seasonId: number, name: string) {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Season name is required.");
  const db = await getDatabaseAsync();
  await db.runAsync(
    "UPDATE seasons SET name = ?, updated_at = datetime('now') WHERE id = ?",
    [normalizedName, seasonId],
  );
}

export async function getSeasonCompletionStatusAsync(
  seasonId: number,
): Promise<SeasonCompletionStatus> {
  const db = await getDatabaseAsync();
  const [matchRow, trainingRow] = await Promise.all([
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM match_day_matches
       WHERE season_id = ? AND (own_score IS NULL OR opponent_score IS NULL)`,
      [seasonId],
    ),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM events
       WHERE season_id = ? AND type = 'training' AND attendance_status <> 'marked'`,
      [seasonId],
    ),
  ]);

  return {
    matchesWithoutResults: Number(matchRow?.count ?? 0),
    trainingsWithoutAttendance: Number(trainingRow?.count ?? 0),
  };
}

export async function endActiveSeasonAsync(): Promise<Season> {
  const db = await getDatabaseAsync();
  let endedSeason: Season | undefined;

  await db.withTransactionAsync(async () => {
    const activeRow = await db.getFirstAsync<SeasonRow>(
      "SELECT * FROM seasons WHERE status = 'active' LIMIT 1",
    );

    if (!activeRow) {
      throw new Error("No active season was found.");
    }

    const today = formatIsoDate(new Date());
    await db.runAsync(
      `UPDATE seasons
       SET status = 'ended', end_date = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [today, activeRow.id],
    );

    await db.runAsync(
      "INSERT INTO seasons (name, start_date, status) VALUES (?, ?, 'active')",
      [createNextSeasonName(activeRow.name, new Date()), today],
    );

    endedSeason = mapSeasonRow({
      ...activeRow,
      end_date: today,
      status: "ended",
    });
  });

  return endedSeason ?? Promise.reject(new Error("The season could not be ended."));
}

export async function getActiveSeasonIdAsync(db?: SQLiteDatabase) {
  const database = db ?? (await getDatabaseAsync());
  const row = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM seasons WHERE status = 'active' LIMIT 1",
  );

  if (!row) {
    throw new Error("No active season was found.");
  }

  return row.id;
}

function mapSeasonRow(row: SeasonRow): Season {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: normalizeSeasonStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeSeasonStatus(value: string): SeasonStatus {
  return value === "ended" ? "ended" : "active";
}

function createNextSeasonName(currentName: string, now: Date) {
  const match = /^(\d{4})\/(\d{2}|\d{4})$/.exec(currentName.trim());

  if (match) {
    const nextStartYear = Number(match[1]) + 1;
    return `${nextStartYear}/${String((nextStartYear + 1) % 100).padStart(2, "0")}`;
  }

  return createSuggestedSeasonName(now);
}

function createSuggestedSeasonName(date: Date) {
  const startYear = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}

function formatIsoDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
