import { getDatabaseAsync } from "@/db/database";
import { getActiveSeasonIdAsync } from "@/features/seasons/season-repository";
import type {
  CreateFineTypeInput,
  CreatePlayerFineInput,
  FineType,
  PlayerFine,
} from "@/features/fine-jar/fine-jar-types";

type FineTypeRow = {
  id: number;
  name: string;
  amount_cents: number;
  created_at: string;
  updated_at: string;
};

type PlayerFineRow = {
  id: number;
  player_id: number;
  player_first_name: string;
  player_last_name: string;
  fine_type_id: number | null;
  fine_name: string;
  amount_cents: number;
  is_paid: number;
  is_carried_over: number;
  carried_from_fine_id: number | null;
  created_at: string;
  updated_at: string;
};

export async function listFineTypesAsync() {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync<FineTypeRow>(
    "SELECT * FROM fine_types ORDER BY name COLLATE NOCASE",
  );
  return rows.map(mapFineTypeRow);
}

export async function createFineTypeAsync(input: CreateFineTypeInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Fine name is required.");
  if (!Number.isInteger(input.amountCents) || input.amountCents < 0) {
    throw new Error("Fine amount is invalid.");
  }

  const db = await getDatabaseAsync();
  await db.runAsync(
    "INSERT INTO fine_types (name, amount_cents) VALUES (?, ?)",
    [name, input.amountCents],
  );
}

export async function listPlayerFinesAsync() {
  const db = await getDatabaseAsync();
  const seasonId = await getActiveSeasonIdAsync(db);
  const rows = await db.getAllAsync<PlayerFineRow>(`
    SELECT
      player_fines.*,
      players.first_name AS player_first_name,
      players.last_name AS player_last_name
    FROM player_fines
    INNER JOIN players ON players.id = player_fines.player_id
    WHERE player_fines.season_id = ? AND player_fines.is_written_off = 0
    ORDER BY player_fines.is_paid ASC, player_fines.created_at DESC, player_fines.id DESC
  `, [seasonId]);
  return rows.map(mapPlayerFineRow);
}

export async function createPlayerFineAsync(input: CreatePlayerFineInput) {
  const db = await getDatabaseAsync();
  const seasonId = await getActiveSeasonIdAsync(db);
  const fineType = await db.getFirstAsync<FineTypeRow>(
    "SELECT * FROM fine_types WHERE id = ?",
    [input.fineTypeId],
  );
  if (!fineType) throw new Error("Fine type not found.");

  await db.runAsync(
    `INSERT INTO player_fines
      (player_id, fine_type_id, fine_name, amount_cents, is_paid, season_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.playerId,
      fineType.id,
      fineType.name,
      fineType.amount_cents,
      input.isPaid ? 1 : 0,
      seasonId,
    ],
  );
}

export async function setPlayerFinePaidAsync(id: number, isPaid: boolean) {
  const db = await getDatabaseAsync();
  await db.runAsync("UPDATE player_fines SET is_paid = ? WHERE id = ?", [
    isPaid ? 1 : 0,
    id,
  ]);
}

function mapFineTypeRow(row: FineTypeRow): FineType {
  return {
    id: row.id,
    name: row.name,
    amountCents: row.amount_cents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlayerFineRow(row: PlayerFineRow): PlayerFine {
  return {
    id: row.id,
    playerId: row.player_id,
    playerFirstName: row.player_first_name,
    playerLastName: row.player_last_name,
    fineTypeId: row.fine_type_id,
    fineName: row.fine_name,
    amountCents: row.amount_cents,
    isPaid: row.is_paid === 1,
    isCarriedOver: row.is_carried_over === 1,
    carriedFromFineId: row.carried_from_fine_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
