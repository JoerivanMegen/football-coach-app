export type ShareLineupFormation =
  | "4-3-3"
  | "4-3-3 attacking"
  | "4-3-3 defensive"
  | "4-4-2"
  | "3-5-2"
  | "5-3-2"
  | "4-2-3-1"
  | "4-1-2-1-2"
  | "4-3-1-2"
  | "4-1-3-2";

export type ShareLineupSlot = {
  id: string;
  label: string;
  left: number;
  top: number;
  isGoalkeeper?: boolean;
};

export const shareLineupFormationOptions: ShareLineupFormation[] = [
  "4-3-3",
  "4-3-3 attacking",
  "4-3-3 defensive",
  "4-4-2",
  "3-5-2",
  "5-3-2",
  "4-2-3-1",
  "4-1-2-1-2",
  "4-3-1-2",
  "4-1-3-2",
];

export const shareLineupFormationSlots = {
  "4-3-3": [
    createShareLineupSlot(1, "LW", 23, 24),
    createShareLineupSlot(2, "ST", 50, 19),
    createShareLineupSlot(3, "RW", 77, 24),
    createShareLineupSlot(4, "CM", 31, 42),
    createShareLineupSlot(5, "CM", 50, 44),
    createShareLineupSlot(6, "CM", 69, 42),
    createShareLineupSlot(7, "LB", 17, 64),
    createShareLineupSlot(8, "CB", 38, 69),
    createShareLineupSlot(9, "CB", 62, 69),
    createShareLineupSlot(10, "RB", 83, 64),
    createShareLineupSlot(11, "GK", 50, 85, true),
  ],
  "4-3-3 attacking": [
    createShareLineupSlot(1, "LW", 23, 24),
    createShareLineupSlot(2, "ST", 50, 19),
    createShareLineupSlot(3, "RW", 77, 24),
    createShareLineupSlot(4, "CM", 32, 46),
    createShareLineupSlot(5, "CAM", 50, 38),
    createShareLineupSlot(6, "CM", 68, 46),
    createShareLineupSlot(7, "LB", 17, 64),
    createShareLineupSlot(8, "CB", 38, 69),
    createShareLineupSlot(9, "CB", 62, 69),
    createShareLineupSlot(10, "RB", 83, 64),
    createShareLineupSlot(11, "GK", 50, 85, true),
  ],
  "4-3-3 defensive": [
    createShareLineupSlot(1, "LW", 23, 24),
    createShareLineupSlot(2, "ST", 50, 19),
    createShareLineupSlot(3, "RW", 77, 24),
    createShareLineupSlot(4, "CM", 30, 42),
    createShareLineupSlot(5, "CDM", 50, 51),
    createShareLineupSlot(6, "CM", 70, 42),
    createShareLineupSlot(7, "LB", 17, 64),
    createShareLineupSlot(8, "CB", 38, 69),
    createShareLineupSlot(9, "CB", 62, 69),
    createShareLineupSlot(10, "RB", 83, 64),
    createShareLineupSlot(11, "GK", 50, 85, true),
  ],
  "4-4-2": [
    createShareLineupSlot(1, "ST", 38, 19),
    createShareLineupSlot(2, "ST", 62, 19),
    createShareLineupSlot(3, "LM", 18, 40),
    createShareLineupSlot(4, "CM", 38, 44),
    createShareLineupSlot(5, "CM", 62, 44),
    createShareLineupSlot(6, "RM", 82, 40),
    createShareLineupSlot(7, "LB", 17, 64),
    createShareLineupSlot(8, "CB", 38, 69),
    createShareLineupSlot(9, "CB", 62, 69),
    createShareLineupSlot(10, "RB", 83, 64),
    createShareLineupSlot(11, "GK", 50, 85, true),
  ],
  "3-5-2": [
    createShareLineupSlot(1, "ST", 38, 19),
    createShareLineupSlot(2, "ST", 62, 19),
    createShareLineupSlot(3, "LM", 14, 45),
    createShareLineupSlot(4, "CM", 32, 45),
    createShareLineupSlot(5, "CM", 50, 43),
    createShareLineupSlot(6, "CM", 68, 45),
    createShareLineupSlot(7, "RM", 86, 45),
    createShareLineupSlot(8, "CB", 30, 67),
    createShareLineupSlot(9, "CB", 50, 66),
    createShareLineupSlot(10, "CB", 70, 67),
    createShareLineupSlot(11, "GK", 50, 85, true),
  ],
  "5-3-2": [
    createShareLineupSlot(1, "ST", 38, 19),
    createShareLineupSlot(2, "ST", 62, 19),
    createShareLineupSlot(3, "CM", 30, 42),
    createShareLineupSlot(4, "CM", 50, 44),
    createShareLineupSlot(5, "CM", 70, 42),
    createShareLineupSlot(6, "LWB", 10, 60),
    createShareLineupSlot(7, "CB", 30, 67),
    createShareLineupSlot(8, "CB", 50, 66),
    createShareLineupSlot(9, "CB", 70, 67),
    createShareLineupSlot(10, "RWB", 90, 60),
    createShareLineupSlot(11, "GK", 50, 85, true),
  ],
  "4-2-3-1": [
    createShareLineupSlot(1, "ST", 50, 19),
    createShareLineupSlot(2, "LW", 22, 33),
    createShareLineupSlot(3, "CAM", 50, 38),
    createShareLineupSlot(4, "RW", 78, 33),
    createShareLineupSlot(5, "CDM", 38, 51),
    createShareLineupSlot(6, "CDM", 62, 51),
    createShareLineupSlot(7, "LB", 17, 64),
    createShareLineupSlot(8, "CB", 38, 69),
    createShareLineupSlot(9, "CB", 62, 69),
    createShareLineupSlot(10, "RB", 83, 64),
    createShareLineupSlot(11, "GK", 50, 85, true),
  ],
  "4-1-2-1-2": [
    createShareLineupSlot(1, "ST", 38, 19),
    createShareLineupSlot(2, "ST", 62, 19),
    createShareLineupSlot(3, "CAM", 50, 36),
    createShareLineupSlot(4, "CM", 32, 48),
    createShareLineupSlot(5, "CM", 68, 48),
    createShareLineupSlot(6, "CDM", 50, 58),
    createShareLineupSlot(7, "LB", 17, 64),
    createShareLineupSlot(8, "CB", 38, 69),
    createShareLineupSlot(9, "CB", 62, 69),
    createShareLineupSlot(10, "RB", 83, 64),
    createShareLineupSlot(11, "GK", 50, 85, true),
  ],
  "4-3-1-2": [
    createShareLineupSlot(1, "ST", 38, 19),
    createShareLineupSlot(2, "ST", 62, 19),
    createShareLineupSlot(3, "CAM", 50, 34),
    createShareLineupSlot(4, "CM", 28, 48),
    createShareLineupSlot(5, "CM", 50, 52),
    createShareLineupSlot(6, "CM", 72, 48),
    createShareLineupSlot(7, "LB", 17, 64),
    createShareLineupSlot(8, "CB", 38, 69),
    createShareLineupSlot(9, "CB", 62, 69),
    createShareLineupSlot(10, "RB", 83, 64),
    createShareLineupSlot(11, "GK", 50, 85, true),
  ],
  "4-1-3-2": [
    createShareLineupSlot(1, "ST", 38, 19),
    createShareLineupSlot(2, "ST", 62, 19),
    createShareLineupSlot(3, "LM", 24, 42),
    createShareLineupSlot(4, "CM", 50, 40),
    createShareLineupSlot(5, "RM", 76, 42),
    createShareLineupSlot(6, "CDM", 50, 57),
    createShareLineupSlot(7, "LB", 17, 64),
    createShareLineupSlot(8, "CB", 38, 69),
    createShareLineupSlot(9, "CB", 62, 69),
    createShareLineupSlot(10, "RB", 83, 64),
    createShareLineupSlot(11, "GK", 50, 85, true),
  ],
} satisfies Record<ShareLineupFormation, ShareLineupSlot[]>;

function createShareLineupSlot(
  positionNumber: number,
  label: string,
  left: number,
  top: number,
  isGoalkeeper = false,
): ShareLineupSlot {
  return {
    id: String(positionNumber),
    label,
    left,
    top,
    isGoalkeeper,
  };
}
