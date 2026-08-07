import { getDatabaseAsync } from '@/db/database';
import {
  PLAYER_POSITIONS,
  type CreatePlayerInput,
  type Player,
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
};

export async function listPlayersAsync() {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync<PlayerRow>(
    `
      SELECT *
      FROM players
      WHERE is_active = 1
      ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE
    `
  );

  return rows.map(mapPlayerRow);
}

export async function getPlayerByIdAsync(id: number) {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<PlayerRow>('SELECT * FROM players WHERE id = ?', [id]);

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
  };
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
