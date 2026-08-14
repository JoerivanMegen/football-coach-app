export const PLAYER_POSITIONS = ['goalkeeper', 'defender', 'midfielder', 'forward'] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export type Player = {
  id: number;
  firstName: string;
  lastName: string;
  nickName: string | null;
  birthDate: string | null;
  kitNumber: number | null;
  position: PlayerPosition;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activeInjuryStartDate: string | null;
  isGuest?: boolean;
};

export type CreatePlayerInput = {
  firstName: string;
  lastName: string;
  nickName?: string | null;
  birthDate?: string | null;
  position: PlayerPosition;
  kitNumber?: number | null;
  notes?: string;
};

export type UpdatePlayerInput = Partial<CreatePlayerInput> & {
  isActive?: boolean;
};

export type PlayerInjury = {
  id: number;
  playerId: number;
  startDate: string;
  endDate: string | null;
  note: string;
};
