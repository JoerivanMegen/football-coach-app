import type {
  EventType,
  SignupStatus,
} from '@/features/events/components/event-wizard/event-wizard-types';

export const EventAttendanceStatuses = ['not_marked', 'marked'] as const;

export type EventAttendanceStatus = (typeof EventAttendanceStatuses)[number];

export type CoachEvent = {
  id: number;
  type: EventType;
  title: string;
  eventDate: string;
  startTime: string | null;
  location: string | null;
  opponent: string | null;
  notes: string;
  attendanceStatus: EventAttendanceStatus;
  availableCount: number;
  unavailableCount: number;
  unknownCount: number;
  createdAt: string;
  updatedAt: string;
};

export type EventPlayerSignupInput = {
  playerId: number;
  signupStatus: SignupStatus;
};

export type EventAttendancePlayer = {
  playerId: number;
  firstName: string;
  lastName: string;
  signupStatus: SignupStatus;
  isPresent: boolean;
  isLate: boolean;
  minutesPlayed: number | null;
  matchRating: number | null;
};

export type EventAttendanceInput = {
  playerId: number;
  isPresent: boolean;
  isLate: boolean;
  minutesPlayed?: number | null;
  matchRating?: number | null;
};

export type CreateEventInput = {
  type: EventType;
  title: string;
  eventDate: string;
  startTime?: string | null;
  location?: string | null;
  opponent?: string | null;
  notes?: string;
  playerSignups?: EventPlayerSignupInput[];
};

export type UpdateEventInput = CreateEventInput & {
  id: number;
};
