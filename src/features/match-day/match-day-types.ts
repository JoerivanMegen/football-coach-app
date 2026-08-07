import type { SignupStatus } from '@/features/events/components/event-wizard/event-wizard-types';

export type MatchDayLocation = 'home' | 'away';

export type MatchDayCategory = 'league' | 'cup' | 'friendly';

export type MatchPlayerResultAttendance = 'present' | 'late' | 'no-show';

export type MatchPlayerResultCard = 'none' | 'yellow' | 'red';

export type MatchPlayerResultStat = {
  goals: number;
  assists: number;
  attendance: MatchPlayerResultAttendance;
  card: MatchPlayerResultCard;
  rating: number;
  subbedOnMinute: number | null;
  subbedOffMinute: number | null;
  minutesPlayed: number;
};

export type MatchPlayerResultStats = Record<number, MatchPlayerResultStat>;

export type MatchDayMatch = {
  id: number;
  opponent: string;
  matchDate: string;
  startTime: string;
  location: MatchDayLocation;
  venue: string;
  category: MatchDayCategory;
  formation: string;
  notes: string;
  ownScore: number | null;
  opponentScore: number | null;
  resultNotes: string;
  playerResultStats: MatchPlayerResultStats;
  captainPlayerId: number | null;
  matchDutyPlayerIds: number[];
  fulfilledMatchDutyPlayerIds: number[];
  guestPlayerIds: number[];
  playerStatuses: Record<number, SignupStatus>;
  lineupAssignments: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};

export type CreateMatchDayMatchInput = Omit<
  MatchDayMatch,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'ownScore'
  | 'opponentScore'
  | 'resultNotes'
  | 'playerResultStats'
  | 'fulfilledMatchDutyPlayerIds'
>;

export type UpdateMatchDayMatchInput = CreateMatchDayMatchInput & {
  id: number;
};

export type UpdateMatchDayMatchResultInput = {
  id: number;
  matchDurationMinutes?: number;
  ownScore: number;
  opponentScore: number;
  resultNotes: string;
  playerResultStats: MatchPlayerResultStats;
  fulfilledMatchDutyPlayerIds: number[];
};
