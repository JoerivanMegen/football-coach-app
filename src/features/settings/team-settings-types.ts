export const KIT_DESIGNS = [
  "solid",
  "stripes",
  "twoColorStripes",
  "hoops",
  "sash",
  "halves",
  "sides",
] as const;

export type KitDesign = (typeof KIT_DESIGNS)[number];

export const TRAINING_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type TrainingDay = (typeof TRAINING_DAYS)[number];

export const FINE_JAR_CURRENCIES = ["EUR", "GBP", "USD"] as const;
export type FineJarCurrency = (typeof FINE_JAR_CURRENCIES)[number];

export type TeamSettings = {
  id: 1;
  teamName: string;
  clubLocation: string;
  kitDesign: KitDesign;
  outfieldKitColor: string;
  secondaryKitColor: string;
  thirdKitColor: string;
  kitNumberColor: string;
  goalkeeperKitColor: string;
  matchDurationMinutes: number;
  trainingDays: TrainingDay[];
  trainingStartTime: string;
  preferNicknames: boolean;
  fineJarEnabled: boolean;
  fineJarCurrency: FineJarCurrency;
  matchDutyEnabled: boolean;
  includeFriendlyMatchesInStats: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SaveTeamSettingsInput = {
  teamName: string;
  clubLocation: string;
  kitDesign: KitDesign;
  outfieldKitColor: string;
  secondaryKitColor: string;
  thirdKitColor: string;
  kitNumberColor: string;
  goalkeeperKitColor: string;
  matchDurationMinutes: number;
  trainingDays: TrainingDay[];
  trainingStartTime: string;
  preferNicknames: boolean;
  fineJarEnabled: boolean;
  fineJarCurrency: FineJarCurrency;
  matchDutyEnabled: boolean;
  includeFriendlyMatchesInStats: boolean;
};
