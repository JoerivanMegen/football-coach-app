import { getDatabaseAsync } from '@/db/database';
import {
  PLAYER_POSITIONS,
  type CreatePlayerInput,
  type Player,
  type PlayerInjury,
  type PlayerPosition,
  type UpdatePlayerInput,
} from '@/features/players/player-types';

type PlayerRow = {
  id: number;
  first_name: string;
  last_name: string;
  nick_name: string | null;
  birth_date: string | null;
  kit_number: number | null;
  position: string;
  notes: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  active_injury_start_date: string | null;
};

export async function listPlayersAsync() {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync<PlayerRow>(
    `
      SELECT players.*,
        (
          SELECT player_injuries.start_date
          FROM player_injuries
          WHERE player_injuries.player_id = players.id
            AND player_injuries.end_date IS NULL
          LIMIT 1
        ) AS active_injury_start_date
      FROM players
      WHERE is_active = 1
      ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE
    `
  );

  return rows.map(mapPlayerRow);
}

export async function getPlayerByIdAsync(id: number) {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<PlayerRow>(`
    SELECT players.*,
      (
        SELECT player_injuries.start_date
        FROM player_injuries
        WHERE player_injuries.player_id = players.id
          AND player_injuries.end_date IS NULL
        LIMIT 1
      ) AS active_injury_start_date
    FROM players
    WHERE players.id = ?
  `, [id]);

  return row ? mapPlayerRow(row) : null;
}

export async function createPlayerAsync(input: CreatePlayerInput) {
  const db = await getDatabaseAsync();
  const result = await db.runAsync(
    `
      INSERT INTO players (
        first_name,
        last_name,
        nick_name,
        birth_date,
        position,
        kit_number,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      normalizeRequiredText(input.firstName, 'firstName'),
      normalizeRequiredText(input.lastName, 'lastName'),
      normalizeOptionalText(input.nickName),
      normalizeOptionalDate(input.birthDate),
      normalizePlayerPosition(input.position),
      input.kitNumber ?? null,
      input.notes?.trim() ?? '',
    ]
  );

  return getPlayerByIdAsync(result.lastInsertRowId);
}

export async function updatePlayerAsync(id: number, input: UpdatePlayerInput) {
  const current = await getPlayerByIdAsync(id);

  if (!current) {
    return null;
  }

  const db = await getDatabaseAsync();
  await db.runAsync(
    `
      UPDATE players
      SET first_name = ?,
          last_name = ?,
          nick_name = ?,
          birth_date = ?,
          kit_number = ?,
          position = ?,
          notes = ?,
          is_active = ?
      WHERE id = ?
    `,
    [
      input.firstName === undefined
        ? current.firstName
        : normalizeRequiredText(input.firstName, 'firstName'),
      input.lastName === undefined
        ? current.lastName
        : normalizeRequiredText(input.lastName, 'lastName'),
      input.nickName === undefined ? current.nickName : normalizeOptionalText(input.nickName),
      input.birthDate === undefined ? current.birthDate : normalizeOptionalDate(input.birthDate),
      input.kitNumber === undefined ? current.kitNumber : input.kitNumber,
      input.position === undefined ? current.position : normalizePlayerPosition(input.position),
      input.notes?.trim() ?? current.notes,
      input.isActive === undefined ? Number(current.isActive) : Number(input.isActive),
      id,
    ]
  );

  return getPlayerByIdAsync(id);
}

export async function savePlayerWithKitReassignmentAsync(
  playerId: number | null,
  input: CreatePlayerInput,
  reassignedPlayerId: number,
  reassignedKitNumber: number,
) {
  const db = await getDatabaseAsync();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE players SET kit_number = ? WHERE id = ? AND is_active = 1',
      [reassignedKitNumber, reassignedPlayerId],
    );

    if (playerId === null) {
      await createPlayerAsync(input);
    } else {
      await updatePlayerAsync(playerId, input);
    }
  });
}

export async function archivePlayerAsync(id: number) {
  const db = await getDatabaseAsync();
  await db.runAsync('UPDATE players SET is_active = 0 WHERE id = ?', [id]);
}

export async function savePlayerInjuryStatusAsync(
  playerId: number,
  isInjured: boolean,
  statusDate: string,
  note = "",
) {
  const normalizedDate = normalizeIsoDate(statusDate);
  const db = await getDatabaseAsync();
  const activeInjury = await db.getFirstAsync<{ id: number; start_date: string }>(
    `SELECT id, start_date
     FROM player_injuries
     WHERE player_id = ? AND end_date IS NULL
     LIMIT 1`,
    [playerId],
  );

  if (isInjured) {
    await assertNoOverlappingInjuryAsync(
      playerId,
      normalizedDate,
      null,
      activeInjury?.id,
    );
    if (activeInjury) {
      await db.runAsync(
        "UPDATE player_injuries SET start_date = ?, note = ? WHERE id = ?",
        [normalizedDate, note.trim(), activeInjury.id],
      );
    } else {
      await db.runAsync(
        "INSERT INTO player_injuries (player_id, start_date, note) VALUES (?, ?, ?)",
        [playerId, normalizedDate, note.trim()],
      );
    }
    return;
  }

  if (activeInjury) {
    if (normalizedDate < activeInjury.start_date) {
      throw new Error("Recovery date cannot be before the injury start date.");
    }
    await db.runAsync(
      "UPDATE player_injuries SET end_date = ? WHERE id = ?",
      [normalizedDate, activeInjury.id],
    );
  }
}

export async function listPlayerInjuriesAsync(playerId: number) {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync<{
    id: number;
    player_id: number;
    start_date: string;
    end_date: string | null;
    note: string;
  }>(
    `SELECT id, player_id, start_date, end_date, note
     FROM player_injuries
     WHERE player_id = ?
     ORDER BY start_date DESC, id DESC`,
    [playerId],
  );
  return rows.map((row): PlayerInjury => ({
    id: row.id,
    playerId: row.player_id,
    startDate: row.start_date,
    endDate: row.end_date,
    note: row.note,
  }));
}

export async function listAllPlayerInjuriesAsync() {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync<{
    id: number;
    player_id: number;
    start_date: string;
    end_date: string | null;
    note: string;
  }>(
    `SELECT id, player_id, start_date, end_date, note
     FROM player_injuries
     ORDER BY player_id, start_date DESC, id DESC`,
  );
  return rows.map((row): PlayerInjury => ({
    id: row.id,
    playerId: row.player_id,
    startDate: row.start_date,
    endDate: row.end_date,
    note: row.note,
  }));
}

export async function updatePlayerInjuryAsync(
  injuryId: number,
  input: { startDate: string; endDate: string | null; note: string },
) {
  const db = await getDatabaseAsync();
  const injury = await db.getFirstAsync<{ player_id: number }>(
    "SELECT player_id FROM player_injuries WHERE id = ?",
    [injuryId],
  );
  if (!injury) return false;
  const startDate = normalizeIsoDate(input.startDate);
  const endDate = input.endDate ? normalizeIsoDate(input.endDate) : null;
  if (endDate && endDate < startDate) {
    throw new Error("Recovery date cannot be before the injury start date.");
  }
  await assertNoOverlappingInjuryAsync(
    injury.player_id,
    startDate,
    endDate,
    injuryId,
  );
  await db.runAsync(
    "UPDATE player_injuries SET start_date = ?, end_date = ?, note = ? WHERE id = ?",
    [startDate, endDate, input.note.trim(), injuryId],
  );
  return true;
}

export async function deletePlayerInjuryAsync(injuryId: number) {
  const db = await getDatabaseAsync();
  await db.runAsync("DELETE FROM player_injuries WHERE id = ?", [injuryId]);
}

async function assertNoOverlappingInjuryAsync(
  playerId: number,
  startDate: string,
  endDate: string | null,
  ignoredInjuryId?: number,
) {
  const db = await getDatabaseAsync();
  const overlap = await db.getFirstAsync<{ id: number }>(
    `SELECT id
     FROM player_injuries
     WHERE player_id = ?
       AND id <> ?
       AND (? IS NULL OR start_date < ?)
       AND (end_date IS NULL OR end_date > ?)
     LIMIT 1`,
    [playerId, ignoredInjuryId ?? -1, endDate, endDate, startDate],
  );
  if (overlap) throw new Error("Injury periods cannot overlap.");
}

function mapPlayerRow(row: PlayerRow): Player {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    nickName: row.nick_name,
    birthDate: row.birth_date,
    kitNumber: row.kit_number,
    position: normalizePlayerPosition(row.position),
    notes: row.notes,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    activeInjuryStartDate: row.active_injury_start_date,
  };
}

function normalizeIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid injury date.");
  }
  return value;
}

function normalizeRequiredText(value: string, fieldName: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function normalizeOptionalDate(value: string | null | undefined) {
  const normalizedValue = normalizeOptionalText(value);
  return normalizedValue;
}

function normalizePlayerPosition(value: string): PlayerPosition {
  if (PLAYER_POSITIONS.includes(value as PlayerPosition)) {
    return value as PlayerPosition;
  }

  throw new Error(`Unsupported player position: ${value}`);
}
