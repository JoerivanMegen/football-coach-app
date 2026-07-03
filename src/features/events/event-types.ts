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
