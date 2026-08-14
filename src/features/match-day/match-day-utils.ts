import type { SymbolViewProps } from "expo-symbols";

import type { MatchDayCategory, MatchDayLocation, MatchDayMatch } from "@/features/match-day/match-day-types";

export function parseDisplayDateToIsoDate(value: string) {
  const date = parseDisplayDateToDate(value);

  if (!date) {
    throw new Error(`Invalid match date: ${value}`);
  }

  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function formatIsoDateForDisplay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return value;
  }

  return [match[3], match[2], match[1]].join("-");
}

export function parseDisplayDateToDate(value: string) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function getMatchLocationLabel(location: MatchDayLocation) {
  return location === "home" ? "Home" : "Away";
}

export function getMatchCategoryLabel(category: MatchDayCategory) {
  switch (category) {
    case "league":
      return "League";
    case "cup":
      return "Cup";
    case "friendly":
      return "Friendly";
  }
}

export function getMatchCategoryIcon(
  category: MatchDayCategory,
): SymbolViewProps["name"] {
  switch (category) {
    case "league":
      return {
        ios: "medal.fill",
        android: "military_tech",
        web: "military_tech",
      };
    case "cup":
      return {
        ios: "trophy.fill",
        android: "emoji_events",
        web: "emoji_events",
      };
    case "friendly":
      return { ios: "person.2.fill", android: "groups", web: "groups" };
  }
}

export function hasMatchResult(match: MatchDayMatch) {
  return match.ownScore !== null && match.opponentScore !== null;
}

export function isMatchResultActionDue(match: MatchDayMatch) {
  if (hasMatchResult(match)) {
    return false;
  }

  const matchStartDate = parseIsoDateAndDisplayTimeToDate(
    match.matchDate,
    match.startTime,
  );

  if (!matchStartDate) {
    return false;
  }

  const resultDueDate = new Date(matchStartDate);
  resultDueDate.setHours(resultDueDate.getHours() + 3);

  return Date.now() >= resultDueDate.getTime();
}

export function hasMatchStarted(match: MatchDayMatch, now = new Date()) {
  const matchStartDate = parseIsoDateAndDisplayTimeToDate(
    match.matchDate,
    match.startTime,
  );

  return matchStartDate !== null && now.getTime() >= matchStartDate.getTime();
}

export function parseIsoDateAndDisplayTimeToDate(
  dateValue: string,
  timeValue: string,
) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeValue.trim());

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hours ||
    date.getMinutes() !== minutes
  ) {
    return null;
  }

  return date;
}

export function getResultLabel(ownScore: number, opponentScore: number) {
  if (ownScore > opponentScore) {
    return "Win";
  }

  if (ownScore < opponentScore) {
    return "Loss";
  }

  return "Draw";
}

export function parseDisplayTimeToDate(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);

  return date;
}
