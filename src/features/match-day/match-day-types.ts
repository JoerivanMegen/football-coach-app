import type { SignupStatus } from '@/features/events/components/event-wizard/event-wizard-types';

export type MatchDayLocation = 'home' | 'away';

export type MatchDayCategory = 'league' | 'cup' | 'friendly';

export type MatchDayMatch = {
  id: number;
  opponent: string;
  matchDate: string;
  startTime: string;
  location: MatchDayLocation;
  category: MatchDayCategory;
  formation: string;
  notes: string;
  playerStatuses: Record<number, SignupStatus>;
  lineupAssignments: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};

export type CreateMatchDayMatchInput = Omit<MatchDayMatch, 'id' | 'createdAt' | 'updatedAt'>;
