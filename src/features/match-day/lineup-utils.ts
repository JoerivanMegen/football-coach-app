import { Animated } from "react-native";

import { formationSlots, substituteSlots } from "@/features/match-day/match-day-config";
import type { AssignmentSlot, DropTarget, LineupAssignments, MatchFormation, PitchLayout, PitchPoint, PitchSlot } from "@/features/match-day/match-day-view-types";
import type { Player } from "@/features/players/player-types";

export function getAssignedPlayer(playerId: number | undefined, players: Player[]) {
  return playerId
    ? (players.find((player) => player.id === playerId) ?? null)
    : null;
}

export function moveAssignment(
  assignments: LineupAssignments,
  fromSlotId: string,
  toSlotId: string,
) {
  const movedPlayerId = assignments[fromSlotId];

  if (!movedPlayerId || fromSlotId === toSlotId) {
    return assignments;
  }

  const replacedPlayerId = assignments[toSlotId];
  const nextAssignments = {
    ...assignments,
    [toSlotId]: movedPlayerId,
  };

  if (replacedPlayerId) {
    nextAssignments[fromSlotId] = replacedPlayerId;
  } else {
    delete nextAssignments[fromSlotId];
  }

  return nextAssignments;
}

export function resetDragPosition(drag: Animated.ValueXY) {
  drag.flattenOffset();
  Animated.spring(drag, {
    toValue: { x: 0, y: 0 },
    useNativeDriver: true,
  }).start();
}

export function findNearestDropTarget(
  targets: DropTarget[],
  point: PitchPoint,
  sourceSlotId: string,
) {
  const dropRadius = 72;
  let nearestTargetId: string | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const target of targets) {
    if (target.id === sourceSlotId) {
      continue;
    }

    const distance = Math.hypot(point.x - target.x, point.y - target.y);

    if (distance < nearestDistance && distance <= dropRadius) {
      nearestTargetId = target.id;
      nearestDistance = distance;
    }
  }

  return nearestTargetId;
}

export function getPitchSlotCenter(slot: PitchSlot, layout: PitchLayout): PitchPoint {
  return {
    x: layout.x + getPercentageValue(slot.left) * layout.width,
    y: layout.y + getPercentageValue(slot.top) * layout.height,
  };
}

export function getPercentageValue(value: `${number}%`) {
  return Number(value.replace("%", "")) / 100;
}

export function getAssignmentSlot(
  formation: MatchFormation,
  slotId: string,
): AssignmentSlot | null {
  const formationSlot = formationSlots[formation].find(
    (slot) => slot.id === slotId,
  );

  if (formationSlot) {
    return formationSlot;
  }

  return substituteSlots.find((slot) => slot.id === slotId) ?? null;
}

export function formatAssignmentSlotLabel(slot: AssignmentSlot) {
  return slot.label ?? slot.id.toUpperCase();
}

export function sortPlayersForAssignmentSlot(
  players: Player[],
  selectedSlot: AssignmentSlot | null,
) {
  const preferredPosition = getPreferredPositionForAssignmentSlot(selectedSlot);

  return [...players].sort((firstPlayer, secondPlayer) => {
    const firstRank = getPlayerPositionSortRank(
      firstPlayer.position,
      preferredPosition,
    );
    const secondRank = getPlayerPositionSortRank(
      secondPlayer.position,
      preferredPosition,
    );

    if (firstRank !== secondRank) {
      return firstRank - secondRank;
    }

    return formatPlayerDisplayName(firstPlayer).localeCompare(
      formatPlayerDisplayName(secondPlayer),
    );
  });
}

export function getPreferredPositionForAssignmentSlot(
  selectedSlot: AssignmentSlot | null,
): Player["position"] | null {
  if (!isPitchSlot(selectedSlot)) {
    return null;
  }

  if (selectedSlot.isGoalkeeper) {
    return "goalkeeper";
  }

  const topPercentage = Number(selectedSlot.top.replace("%", ""));

  if (topPercentage <= 25) {
    return "forward";
  }

  if (topPercentage <= 62) {
    return "midfielder";
  }

  return "defender";
}

export function isPitchSlot(slot: AssignmentSlot | null): slot is PitchSlot {
  return Boolean(slot && "top" in slot && "left" in slot);
}

export function getPlayerPositionSortRank(
  position: Player["position"],
  preferredPosition: Player["position"] | null,
) {
  if (preferredPosition && position === preferredPosition) {
    return 0;
  }

  const defaultPositionOrder: Player["position"][] = [
    "goalkeeper",
    "defender",
    "midfielder",
    "forward",
  ];

  return defaultPositionOrder.indexOf(position) + 1;
}

export function removePlayerFromAssignments(
  assignments: LineupAssignments,
  playerId: number,
) {
  return Object.fromEntries(
    Object.entries(assignments).filter(
      ([, assignedPlayerId]) => assignedPlayerId !== playerId,
    ),
  );
}

export function formatPlayerMeta(player: Player) {
  const kitNumber = player.kitNumber ? `#${player.kitNumber}` : "No kit number";
  return `${kitNumber} · ${player.position}`;
}

export function formatPlayerName(player: Player, preferNicknames = true) {
  return preferNicknames && player.nickName
    ? player.nickName
    : player.firstName;
}

export function formatPlayerDisplayName(player: Player) {
  return [player.firstName, player.lastName].filter(Boolean).join(" ");
}

