import { getDatabaseAsync } from "@/db/database";
import {
  PLAYER_POSITIONS,
  type Player,
  type PlayerPosition,
} from "@/features/players/player-types";

type GuestPlayerRow = {
  id: number;
  name: string;
  position: string;
  created_at: string;
  updated_at: string;
};

export async function listGuestPlayersAsync(): Promise<Player[]> {
  const db = await getDatabaseAsync();
  await ensureGuestPlayerStorageAsync();
  const rows = await db.getAllAsync<GuestPlayerRow>(`
    SELECT * FROM guest_players
    ORDER BY updated_at DESC, name COLLATE NOCASE
  `);

  return rows.map(mapGuestPlayerRow);
}

export async function addGuestPlayerAsync(
  name: string,
  position: PlayerPosition,
): Promise<Player> {
  const normalizedName = name.trim().replace(/\s+/g, " ");

  if (!normalizedName) {
    throw new Error("Guest player name is required");
  }

  const db = await getDatabaseAsync();
  await ensureGuestPlayerStorageAsync();
  const existing = await db.getFirstAsync<GuestPlayerRow>(
    "SELECT * FROM guest_players WHERE name = ? COLLATE NOCASE",
    [normalizedName],
  );

  if (existing) {
    await db.runAsync(
      "UPDATE guest_players SET position = ?, updated_at = datetime('now') WHERE id = ?",
      [position, existing.id],
    );
    return mapGuestPlayerRow({
      ...existing,
      position,
      updated_at: new Date().toISOString(),
    });
  }

  const result = await db.runAsync(
    "INSERT INTO guest_players (name, position) VALUES (?, ?)",
    [normalizedName, position],
  );
  const row = await db.getFirstAsync<GuestPlayerRow>(
    "SELECT * FROM guest_players WHERE id = ?",
    [result.lastInsertRowId],
  );

  if (!row) {
    throw new Error("Could not load the added guest player");
  }

  return mapGuestPlayerRow(row);
}

async function ensureGuestPlayerStorageAsync() {
  const db = await getDatabaseAsync();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS guest_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      position TEXT NOT NULL DEFAULT 'midfielder',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(guest_players)",
  );
  if (!columns.some((column) => column.name === "position")) {
    await db.execAsync(
      "ALTER TABLE guest_players ADD COLUMN position TEXT NOT NULL DEFAULT 'midfielder'",
    );
  }
}

function mapGuestPlayerRow(row: GuestPlayerRow): Player {
  return {
    id: -row.id,
    firstName: row.name,
    lastName: "",
    nickName: null,
    birthDate: null,
    kitNumber: null,
    position: PLAYER_POSITIONS.includes(row.position as PlayerPosition)
      ? (row.position as PlayerPosition)
      : "midfielder",
    notes: "",
    isActive: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    activeInjuryStartDate: null,
    isGuest: true,
  };
}
