export type SeasonStatus = "active" | "ended";

export type Season = {
  id: number;
  name: string;
  startDate: string;
  endDate: string | null;
  status: SeasonStatus;
  createdAt: string;
  updatedAt: string;
};

export type SeasonCompletionStatus = {
  matchesWithoutResults: number;
  trainingsWithoutAttendance: number;
  unpaidFineCount: number;
  unpaidFineAmountCents: number;
};

export type UnpaidFineResolution = "carry" | "write_off";
