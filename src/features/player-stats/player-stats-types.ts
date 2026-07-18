import type { PlayerPosition } from '@/features/players/player-types';

export type RecentMatchRating = {
  eventId: number;
  eventDate: string;
  opponent: string | null;
  rating: number;
};

export type PlayerAttendanceStats = {
  playerId: number;
  firstName: string;
  lastName: string;
  nickName: string | null;
  position: PlayerPosition;
  totalEvents: number;
  attendedEvents: number;
  trainingEvents: number;
  trainingAttended: number;
  trainingAttendancePercentage: number | null;
  recentTrainingEvents: number;
  recentTrainingAttended: number;
  recentTrainingAttendancePercentage: number | null;
  matchEvents: number;
  matchAttended: number;
  matchAttendancePercentage: number | null;
  teamEvents: number;
  teamEventsAttended: number;
  teamEventAttendancePercentage: number | null;
  totalMatchMinutes: number;
  averageMatchMinutes: number | null;
  averageMatchRating: number | null;
  lateCount: number;
  latePercentage: number | null;
  availableButAbsentCount: number;
  signedOutButAttendedCount: number;
  recentMatchRatings: RecentMatchRating[];
};
