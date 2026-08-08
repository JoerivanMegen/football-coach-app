import type { AssignmentSlot, FormationOption, LineupKitSettings, MatchFormation, PitchSlot } from "@/features/match-day/match-day-view-types";

export const matchFormationOptions = [
  { label: "4-3-3", value: "4-3-3" },
  { label: "4-3-3 attacking", value: "4-3-3 attacking" },
  { label: "4-3-3 defensive", value: "4-3-3 defensive" },
  { label: "4-4-2", value: "4-4-2" },
  { label: "3-5-2", value: "3-5-2" },
  { label: "5-3-2", value: "5-3-2" },
  { label: "4-2-3-1", value: "4-2-3-1" },
  { label: "4-1-2-1-2", value: "4-1-2-1-2" },
  { label: "4-3-1-2", value: "4-3-1-2" },
  { label: "4-1-3-2", value: "4-1-3-2" },
] satisfies FormationOption[];
export const matchFormations: MatchFormation[] = matchFormationOptions.map(
  (option) => option.value,
);
export const substituteSlots = Array.from({ length: 7 }, (_, index) => ({
  id: `sub-${index + 1}`,
  label: `SUB ${index + 1}`,
})) satisfies AssignmentSlot[];
export const defaultLineupKitSettings: LineupKitSettings = {
  kitDesign: "solid",
  outfieldKitColor: "#FFFFFF",
  secondaryKitColor: "#536DFE",
  thirdKitColor: "#EF4444",
  kitNumberColor: "#111827",
  goalkeeperKitColor: "#111827",
};
export const defaultTeamName = "Your team";
export const defaultMatchDurationMinutes = 90;
export const assistantCoachLogo = require("@/assets/images/match-day/assistant-coach-logo.png");
export const sharePosterColorOptions = [
  "#FFFFFF",
  "#111827",
  "#1C7C54",
  "#536DFE",
  "#9333EA",
  "#38BDF8",
  "#FF7A1A",
  "#EF4444",
  "#7F1D1D",
  "#FACC15",
] as const;
export const kitShirtPath =
  "M34 7 C38 11 62 11 66 7 L76 7 L95 25 Q98 27 96 31 L87 47 Q85 51 81 49 L73 44 L73 83 Q73 87 69 87 L31 87 Q27 87 27 83 L27 44 L19 49 Q15 51 13 47 L4 31 Q2 27 5 25 L24 7 Z";

export function createPitchSlot(
  positionNumber: number,
  top: `${number}%`,
  left: `${number}%`,
): PitchSlot {
  return {
    id: String(positionNumber),
    top,
    left,
    isGoalkeeper: positionNumber === 11,
  };
}

export const formationSlots = {
  "4-3-3": [
    createPitchSlot(1, "18%", "24%"),
    createPitchSlot(2, "16%", "50%"),
    createPitchSlot(3, "18%", "76%"),
    createPitchSlot(4, "44%", "30%"),
    createPitchSlot(5, "42%", "50%"),
    createPitchSlot(6, "44%", "70%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "4-3-3 attacking": [
    createPitchSlot(1, "18%", "24%"),
    createPitchSlot(2, "14%", "50%"),
    createPitchSlot(3, "18%", "76%"),
    createPitchSlot(4, "46%", "32%"),
    createPitchSlot(5, "34%", "50%"),
    createPitchSlot(6, "46%", "68%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "4-3-3 defensive": [
    createPitchSlot(1, "18%", "24%"),
    createPitchSlot(2, "16%", "50%"),
    createPitchSlot(3, "18%", "76%"),
    createPitchSlot(4, "42%", "30%"),
    createPitchSlot(5, "56%", "50%"),
    createPitchSlot(6, "42%", "70%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "4-4-2": [
    createPitchSlot(1, "18%", "38%"),
    createPitchSlot(2, "18%", "62%"),
    createPitchSlot(3, "46%", "18%"),
    createPitchSlot(4, "46%", "38%"),
    createPitchSlot(5, "46%", "62%"),
    createPitchSlot(6, "46%", "82%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "3-5-2": [
    createPitchSlot(1, "18%", "38%"),
    createPitchSlot(2, "18%", "62%"),
    createPitchSlot(3, "45%", "14%"),
    createPitchSlot(4, "45%", "32%"),
    createPitchSlot(5, "43%", "50%"),
    createPitchSlot(6, "45%", "68%"),
    createPitchSlot(7, "45%", "86%"),
    createPitchSlot(8, "71%", "28%"),
    createPitchSlot(9, "72%", "50%"),
    createPitchSlot(10, "71%", "72%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "5-3-2": [
    createPitchSlot(1, "18%", "38%"),
    createPitchSlot(2, "18%", "62%"),
    createPitchSlot(3, "44%", "30%"),
    createPitchSlot(4, "42%", "50%"),
    createPitchSlot(5, "44%", "70%"),
    createPitchSlot(6, "69%", "10%"),
    createPitchSlot(7, "71%", "30%"),
    createPitchSlot(8, "72%", "50%"),
    createPitchSlot(9, "71%", "70%"),
    createPitchSlot(10, "69%", "90%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "4-2-3-1": [
    createPitchSlot(1, "14%", "50%"),
    createPitchSlot(2, "35%", "24%"),
    createPitchSlot(3, "33%", "50%"),
    createPitchSlot(4, "35%", "76%"),
    createPitchSlot(5, "54%", "38%"),
    createPitchSlot(6, "54%", "62%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "4-1-2-1-2": [
    createPitchSlot(1, "15%", "38%"),
    createPitchSlot(2, "15%", "62%"),
    createPitchSlot(3, "33%", "50%"),
    createPitchSlot(4, "48%", "34%"),
    createPitchSlot(5, "48%", "66%"),
    createPitchSlot(6, "60%", "50%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "4-3-1-2": [
    createPitchSlot(1, "15%", "38%"),
    createPitchSlot(2, "15%", "62%"),
    createPitchSlot(3, "35%", "50%"),
    createPitchSlot(4, "50%", "28%"),
    createPitchSlot(5, "52%", "50%"),
    createPitchSlot(6, "50%", "72%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
  "4-1-3-2": [
    createPitchSlot(1, "18%", "38%"),
    createPitchSlot(2, "18%", "62%"),
    createPitchSlot(3, "44%", "24%"),
    createPitchSlot(4, "43%", "50%"),
    createPitchSlot(5, "44%", "76%"),
    createPitchSlot(6, "60%", "50%"),
    createPitchSlot(7, "69%", "18%"),
    createPitchSlot(8, "71%", "38%"),
    createPitchSlot(9, "71%", "62%"),
    createPitchSlot(10, "69%", "82%"),
    createPitchSlot(11, "88%", "50%"),
  ],
} satisfies Record<MatchFormation, PitchSlot[]>;


