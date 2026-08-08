import type { SignupStatus } from "@/features/events/components/event-wizard/event-wizard-types";
import type { MatchDayCategory, MatchDayLocation, MatchPlayerResultCard, MatchPlayerResultStats, UpdateMatchDayMatchResultInput } from "@/features/match-day/match-day-types";
import type { Player } from "@/features/players/player-types";
import type { TeamSettings } from "@/features/settings/team-settings-types";

export type MatchLocation = MatchDayLocation;
export type MatchCategory = MatchDayCategory;
export type MatchFormation =
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
export type FormationOption = {
  label: string;
  value: MatchFormation;
};
export type PitchSlot = {
  id: string;
  left: `${number}%`;
  top: `${number}%`;
  label?: string;
  isGoalkeeper?: boolean;
};
export type AssignmentSlot = {
  id: string;
  label?: string;
};
export type PitchLayout = {
  height: number;
  width: number;
  x: number;
  y: number;
};
export type PitchPoint = {
  x: number;
  y: number;
};
export type DropTarget = PitchPoint & {
  id: string;
};
export type LineupAssignments = Record<string, number>;
export type LayoutBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type MatchSetupFormState = {
  opponent: string;
  date: string;
  startTime: string;
  location: MatchLocation;
  venue: string;
  category: MatchCategory;
  formation: MatchFormation;
  notes: string;
  captainPlayerId: number | null;
  matchDutyPlayerIds: number[];
  guestPlayerIds: number[];
  playerStatuses: Record<number, SignupStatus>;
  lineupAssignments: LineupAssignments;
};
export type MatchResultFormState = Omit<
  UpdateMatchDayMatchResultInput,
  "id" | "matchDurationMinutes"
>;
export type MatchResultSquadEntry = {
  player: Player;
  role: "starter" | "substitute";
};
export type JerseyResultBadges = {
  assists: number;
  card: MatchPlayerResultCard;
  goals: number;
  subDirection: "on" | "off" | null;
};
export type SharePreviewState = {
  form: MatchSetupFormState;
  opponentScore?: number;
  ownScore?: number;
  playerResultStats?: MatchPlayerResultStats;
  playerRoleById?: Map<number, MatchResultSquadEntry["role"]>;
  players: Player[];
};
export type LineupKitSettings = Pick<
  TeamSettings,
  | "kitDesign"
  | "outfieldKitColor"
  | "secondaryKitColor"
  | "thirdKitColor"
  | "kitNumberColor"
  | "goalkeeperKitColor"
>;
export type PosterColorSettings = {
  titlePanelColor: string;
  valuePanelColor: string;
  infoPanelColor: string;
  titleTextColor: string;
  valueTextColor: string;
  infoTextColor: string;
};


