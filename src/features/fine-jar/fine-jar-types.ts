export type FineType = {
  id: number;
  name: string;
  amountCents: number;
  createdAt: string;
  updatedAt: string;
};

export type PlayerFine = {
  id: number;
  playerId: number;
  playerFirstName: string;
  playerLastName: string;
  fineTypeId: number | null;
  fineName: string;
  amountCents: number;
  isPaid: boolean;
  isCarriedOver: boolean;
  carriedFromFineId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateFineTypeInput = {
  name: string;
  amountCents: number;
};

export type CreatePlayerFineInput = {
  playerId: number;
  fineTypeId: number;
  isPaid: boolean;
};
