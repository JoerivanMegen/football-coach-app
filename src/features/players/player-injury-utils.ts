import { parseDisplayDateToIsoDate } from "@/features/match-day/match-day-utils";
import type { Player, PlayerInjury } from "@/features/players/player-types";

export function isPlayerInjuredOnDate(
  player: Player,
  displayDate: string,
  injuriesByPlayerId?: Map<number, PlayerInjury[]>,
) {
  const eventDate = parseDisplayDateToIsoDate(displayDate);
  if (!eventDate) return false;

  const injuries = injuriesByPlayerId?.get(player.id);
  if (injuries) {
    return injuries.some(
      (injury) =>
        eventDate >= injury.startDate &&
        (injury.endDate === null || eventDate < injury.endDate),
    );
  }

  return Boolean(
    player.activeInjuryStartDate && eventDate >= player.activeInjuryStartDate,
  );
}
