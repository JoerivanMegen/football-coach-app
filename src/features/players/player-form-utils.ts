import type { Player } from "@/features/players/player-types";

export function parseDisplayDateToIsoDate(value: string) {
  const date = parseDisplayDateToDate(value);
  if (!date) return null;

  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function parseDisplayDateToDate(value: string) {
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;

  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(normalizedValue);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date > new Date()
  ) return null;

  return date;
}

export function formatDateForDisplay(date: Date) {
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getFullYear()).padStart(4, "0"),
  ].join("-");
}

export function formatIsoDateForDisplay(value: string | null) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? [match[3], match[2], match[1]].join("-") : "";
}

export function normalizeNameInput(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidNameInput(value: string) {
  return /^\p{L}+(?: \p{L}+)*$/u.test(value);
}

export function findDuplicatePlayer(
  firstName: string,
  lastName: string,
  players: Player[],
  ignoredPlayerId: number | null,
) {
  const normalizedFirstName = normalizePlayerNameForDuplicateCheck(firstName);
  const normalizedLastName = normalizePlayerNameForDuplicateCheck(lastName);
  return players.find(
    (player) =>
      player.id !== ignoredPlayerId &&
      normalizePlayerNameForDuplicateCheck(player.firstName) === normalizedFirstName &&
      normalizePlayerNameForDuplicateCheck(player.lastName) === normalizedLastName,
  );
}

export function findNextAvailableKitNumber(
  requestedNumber: number,
  players: Player[],
  ignoredPlayerId: number | null,
) {
  const occupiedNumbers = new Set(
    players
      .filter((player) => player.id !== ignoredPlayerId)
      .map((player) => player.kitNumber)
      .filter((kitNumber): kitNumber is number => kitNumber !== null),
  );
  let candidate = requestedNumber + 1;
  while (occupiedNumbers.has(candidate)) candidate += 1;
  return candidate;
}

function normalizePlayerNameForDuplicateCheck(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
